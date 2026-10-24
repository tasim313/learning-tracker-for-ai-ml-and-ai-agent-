import { StorageError, readJsonFile, withFileLock, writeJsonAtomic } from "@/lib/storage/file-store";
import { isMongoConfigured, getMongoDb, type StoredMongoDoc } from "@/lib/storage/mongodb";

export type DocumentDefinition<T> = {
  /** Absolute path, already resolved through resolveDataPath. */
  filePath: string;
  /** Unique logical key for database storage (e.g. system:accounts). Derived from filePath if omitted. */
  key?: string;
  /** Validate (and migrate if needed) raw JSON. Throw on invalid input. */
  parse: (raw: unknown) => { data: T; migrated: boolean };
  /** Initial document when the file does not exist yet. Omit to treat absence as an error. */
  create?: () => T;
  /** Final validation applied before every write. */
  validate: (data: T) => T;
};

export function getDocumentKey(definition: { filePath: string; key?: string }): string {
  if (definition.key) return definition.key;
  const normalized = definition.filePath.replace(/\\/g, "/");
  const match = normalized.match(/(?:(?:data|\.next\/build-data)\/)?([^/]+(?:\/[^/]+)*)\.json$/);
  if (match) {
    return match[1].replace(/\//g, ":");
  }
  return normalized;
}

function parseOrThrow<T>(definition: DocumentDefinition<T>, raw: unknown): { data: T; migrated: boolean } {
  try {
    return definition.parse(raw);
  } catch (error) {
    if (error instanceof StorageError) throw error;
    throw new StorageError(error instanceof Error ? error.message : "Stored data failed schema validation.", { cause: error });
  }
}

function validateOrThrow<T>(definition: DocumentDefinition<T>, data: T): T {
  try {
    return definition.validate(data);
  } catch (error) {
    throw new StorageError(`Refusing to save invalid data: ${error instanceof Error ? error.message : "validation failed"}`, { cause: error });
  }
}

// ---------- File-Store Backend ----------

async function readOrInitializeLocked<T>(definition: DocumentDefinition<T>): Promise<T> {
  const raw = await readJsonFile(definition.filePath);
  if (raw === null) {
    if (!definition.create) throw new StorageError("Requested data does not exist.");
    const created = validateOrThrow(definition, definition.create());
    await writeJsonAtomic(definition.filePath, created);
    return created;
  }
  const parsed = parseOrThrow(definition, raw);
  if (parsed.migrated) await writeJsonAtomic(definition.filePath, validateOrThrow(definition, parsed.data));
  return parsed.data;
}

// ---------- MongoDB Backend ----------

const keyQueues = new Map<string, Promise<unknown>>();

function withKeyQueue<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = keyQueues.get(key) ?? Promise.resolve();
  const run = async () => operation();
  const result = previous.then(run, run);
  const settled = result.then(() => undefined, () => undefined);
  keyQueues.set(key, settled);
  void settled.then(() => {
    if (keyQueues.get(key) === settled) keyQueues.delete(key);
  });
  return result;
}

async function readMongoDocument<T>(definition: DocumentDefinition<T>, key: string): Promise<T> {
  const db = await getMongoDb();
  const collection = db.collection<StoredMongoDoc>("documents");
  const doc = await collection.findOne({ _id: key });
  if (!doc) {
    // If a local JSON file exists, import it seamlessly
    const localRaw = await readJsonFile(definition.filePath).catch(() => null);
    if (localRaw !== null) {
      try {
        const parsedLocal = parseOrThrow(definition, localRaw);
        const validatedLocal = validateOrThrow(definition, parsedLocal.data);
        await collection.updateOne(
          { _id: key },
          { $set: { data: validatedLocal, revision: 1, updatedAt: new Date() } },
          { upsert: true }
        );
        return validatedLocal;
      } catch {
        // Fallback to creation if local file failed validation
      }
    }

    if (!definition.create) throw new StorageError("Requested data does not exist.");
    const created = validateOrThrow(definition, definition.create());
    await collection.updateOne(
      { _id: key },
      { $set: { data: created, revision: 1, updatedAt: new Date() } },
      { upsert: true }
    );
    return created;
  }

  const parsed = parseOrThrow(definition, doc.data);
  if (parsed.migrated) {
    const validated = validateOrThrow(definition, parsed.data);
    await collection.updateOne(
      { _id: key },
      { $set: { data: validated, updatedAt: new Date() } }
    );
    return validated;
  }
  return parsed.data;
}

async function updateMongoDocument<T, R>(
  definition: DocumentDefinition<T>,
  key: string,
  change: (current: T) => { data: T; result: R } | Promise<{ data: T; result: R }>
): Promise<R> {
  return withKeyQueue(key, async () => {
    const db = await getMongoDb();
    const collection = db.collection<StoredMongoDoc>("documents");
    const current = await readMongoDocument(definition, key);
    const { data, result } = await change(current);
    const validated = validateOrThrow(definition, data);
    await collection.updateOne(
      { _id: key },
      {
        $set: { data: validated, updatedAt: new Date() },
        $inc: { revision: 1 }
      },
      { upsert: true }
    );
    return result;
  });
}

// ---------- Public Storage Primitives ----------

/** Read a document. Initialization and migrations happen under exclusive serialization. */
export async function readDocument<T>(definition: DocumentDefinition<T>): Promise<T> {
  if (isMongoConfigured()) {
    const key = getDocumentKey(definition);
    return readMongoDocument(definition, key);
  }
  const raw = await readJsonFile(definition.filePath);
  if (raw !== null) {
    const parsed = parseOrThrow(definition, raw);
    if (!parsed.migrated) return parsed.data;
  }
  return withFileLock(definition.filePath, () => readOrInitializeLocked(definition));
}

/**
 * Read-modify-write under an exclusive lock/queue, so concurrent updates are applied
 * one after another to the latest stored version and no update is lost.
 * The result is returned only after the new document is durably written.
 */
export async function updateDocument<T, R>(
  definition: DocumentDefinition<T>,
  change: (current: T) => { data: T; result: R } | Promise<{ data: T; result: R }>
): Promise<R> {
  if (isMongoConfigured()) {
    const key = getDocumentKey(definition);
    return updateMongoDocument(definition, key, change);
  }
  return withFileLock(definition.filePath, async () => {
    const current = await readOrInitializeLocked(definition);
    const { data, result } = await change(current);
    await writeJsonAtomic(definition.filePath, validateOrThrow(definition, data));
    return result;
  });
}
