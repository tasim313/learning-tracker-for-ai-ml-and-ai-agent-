import { StorageError, readJsonFile, withFileLock, writeJsonAtomic } from "@/lib/storage/file-store";

export type DocumentDefinition<T> = {
  /** Absolute path, already resolved through resolveDataPath. */
  filePath: string;
  /** Validate (and migrate if needed) raw JSON. Throw on invalid input. */
  parse: (raw: unknown) => { data: T; migrated: boolean };
  /** Initial document when the file does not exist yet. Omit to treat absence as an error. */
  create?: () => T;
  /** Final validation applied before every write. */
  validate: (data: T) => T;
};

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

/** Read a document. Initialization and migrations happen under the file lock. */
export async function readDocument<T>(definition: DocumentDefinition<T>): Promise<T> {
  const raw = await readJsonFile(definition.filePath);
  if (raw !== null) {
    const parsed = parseOrThrow(definition, raw);
    if (!parsed.migrated) return parsed.data;
  }
  return withFileLock(definition.filePath, () => readOrInitializeLocked(definition));
}

/**
 * Read-modify-write under an exclusive lock, so concurrent updates are applied
 * one after another to the latest stored version and no update is lost.
 * The result is returned only after the new document is durably written.
 */
export async function updateDocument<T, R>(
  definition: DocumentDefinition<T>,
  change: (current: T) => { data: T; result: R } | Promise<{ data: T; result: R }>
): Promise<R> {
  return withFileLock(definition.filePath, async () => {
    const current = await readOrInitializeLocked(definition);
    const { data, result } = await change(current);
    await writeJsonAtomic(definition.filePath, validateOrThrow(definition, data));
    return result;
  });
}
