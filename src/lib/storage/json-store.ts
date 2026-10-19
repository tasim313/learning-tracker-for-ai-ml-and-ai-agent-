import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, readdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import {
  applicationDataSchema,
  type ApplicationData
} from "@/lib/model";
import { createSeedData } from "@/lib/seed";
import { migrateApplicationData } from "@/lib/storage/migrations";

const dataFileName = "learning-tracker.json";
let writeQueue: Promise<void> = Promise.resolve();

export class StorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "StorageError";
  }
}

function dataDirectory(): string {
  const configuredDirectory = process.env.DATA_DIR?.trim();
  return path.resolve(/*turbopackIgnore: true*/ configuredDirectory || path.join(process.cwd(), "data"));
}

async function ensureDirectory(directory: string): Promise<void> {
  try {
    await mkdir(directory, { recursive: true });
  } catch (error) {
    throw new StorageError("Unable to create the configured data directory.", { cause: error });
  }
}

async function readDataFile(filePath: string): Promise<ApplicationData> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    throw new StorageError("Unable to read application data.", { cause: error });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new StorageError("Application data contains invalid JSON; the original file was left untouched.", { cause: error });
  }

  try {
    return migrateApplicationData(parsed).data;
  } catch (error) {
    throw new StorageError(error instanceof Error ? error.message : "Application data failed schema validation.");
  }
}

async function writeDataFile(data: ApplicationData): Promise<void> {
  const parsed = applicationDataSchema.safeParse(data);
  if (!parsed.success) {
    throw new StorageError(`Refusing to save invalid application data: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
  }

  const directory = dataDirectory();
  await ensureDirectory(directory);

  const filePath = path.join(directory, dataFileName);
  const temporaryPath = path.join(directory, `.${dataFileName}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temporaryPath, "wx", 0o600);
    await handle.writeFile(`${JSON.stringify(parsed.data, null, 2)}\n`, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporaryPath, filePath);
    const directoryHandle = await open(/*turbopackIgnore: true*/ directory, "r");
    try {
      await directoryHandle.sync();
    } finally {
      await directoryHandle.close();
    }
  } catch (error) {
    if (handle) await handle.close().catch(() => undefined);
    await unlink(temporaryPath).catch(() => undefined);
    throw new StorageError("Unable to persist application data; the save did not complete.", { cause: error });
  }
}

function serializeWrite<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.then(() => undefined, () => undefined);
  return result;
}

export async function loadApplicationData(): Promise<ApplicationData> {
  const directory = dataDirectory();
  await ensureDirectory(directory);
  const filePath = path.join(directory, dataFileName);

  const data = await serializeWrite(async () => {
    return readOrInitializeUnsafe(filePath);
  });
  await ensureDailyBackup();
  return data;
}

async function readOrInitializeUnsafe(filePath: string): Promise<ApplicationData> {
  try {
    await stat(filePath);
    const raw = await readFile(filePath, "utf8");
    let current: unknown;
    try {
      current = JSON.parse(raw);
    } catch (error) {
      throw new StorageError("Application data contains invalid JSON; the original file was left untouched.", { cause: error });
    }
    const migrated = migrateApplicationData(current);
    if (migrated.migrated) await writeDataFile(migrated.data);
    return migrated.data;
  } catch (error) {
    if (error instanceof StorageError) throw error;
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw new StorageError("Unable to initialize application data.", { cause: error });
    }
  }
  const seed = createSeedData();
  await writeDataFile(seed);
  return seed;
}

export async function saveApplicationData(data: ApplicationData): Promise<void> {
  await serializeWrite(() => writeDataFile(data));
}

export async function updateApplicationData<T>(update: (data: ApplicationData) => { data: ApplicationData; result: T }): Promise<T> {
  return serializeWrite(async () => {
    const filePath = path.join(dataDirectory(), dataFileName);
    const current = await readOrInitializeUnsafe(filePath);
    const change = update(current);
    const validated = applicationDataSchema.safeParse(change.data);
    if (!validated.success) {
      throw new StorageError(`Refusing invalid data change: ${validated.error.issues.map((issue) => issue.message).join("; ")}`);
    }
    await writeDataFile(validated.data);
    return change.result;
  });
}

export async function restoreApplicationData(input: unknown): Promise<ApplicationData> {
  let migrated: ReturnType<typeof migrateApplicationData>;
  try {
    migrated = migrateApplicationData(input);
  } catch (error) {
    throw new StorageError(error instanceof Error ? error.message : "Backup failed schema validation.");
  }
  const retention = backupRetention();
  return serializeWrite(async () => {
    const directory = dataDirectory();
    await ensureDirectory(directory);
    const current = await readOrInitializeUnsafe(path.join(directory, dataFileName));
    await createAutomaticBackupUnsafe(directory, current, retention);
    await writeDataFile(migrated.data);
    return migrated.data;
  });
}

export async function exportApplicationData(): Promise<ApplicationData> {
  return loadApplicationData();
}

export async function createAutomaticBackup(): Promise<string> {
  const retention = backupRetention();
  return serializeWrite(async () => {
    const directory = dataDirectory();
    await ensureDirectory(directory);
    const sourcePath = path.join(directory, dataFileName);
    const currentData = await readDataFile(sourcePath);
    return createAutomaticBackupUnsafe(directory, currentData, retention);
  });
}

function backupRetention(): number {
  const retention = Number.parseInt(process.env.BACKUP_RETENTION ?? "7", 10);
  if (!Number.isInteger(retention) || retention < 1 || retention > 100) {
    throw new StorageError("BACKUP_RETENTION must be an integer between 1 and 100.");
  }
  return retention;
}

async function createAutomaticBackupUnsafe(directory: string, data: ApplicationData, retention: number): Promise<string> {
  const backupName = `learning-tracker-${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}.json`;
  const backupPath = path.join(directory, backupName);
  await writeDataFileToPath(backupPath, data);
  const backupFiles = (await readdir(/*turbopackIgnore: true*/ directory))
    .filter((name) => /^learning-tracker-\d{4}-\d{2}-\d{2}T.*\.json$/.test(name))
    .sort()
    .reverse();
  await Promise.all(backupFiles.slice(retention).map((name) =>
    unlink(path.join(/*turbopackIgnore: true*/ directory, name))
  ));
  return backupPath;
}

async function ensureDailyBackup(): Promise<void> {
  await serializeWrite(async () => {
    const directory = dataDirectory();
    const retention = Number.parseInt(process.env.BACKUP_RETENTION ?? "7", 10);
    if (!Number.isInteger(retention) || retention < 1 || retention > 100) {
      throw new StorageError("BACKUP_RETENTION must be an integer between 1 and 100.");
    }
    const today = new Date().toISOString().slice(0, 10);
    const backupFiles = (await readdir(/*turbopackIgnore: true*/ directory))
      .filter((name) => /^learning-tracker-\d{4}-\d{2}-\d{2}T.*\.json$/.test(name))
      .sort()
      .reverse();
    if (!backupFiles.some((name) => name.startsWith(`learning-tracker-${today}T`))) {
      const data = await readDataFile(path.join(directory, dataFileName));
      const name = `learning-tracker-${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}.json`;
      await writeDataFileToPath(path.join(directory, name), data);
      backupFiles.unshift(name);
    }
    await Promise.all(backupFiles.slice(retention).map((name) =>
      unlink(path.join(/*turbopackIgnore: true*/ directory, name))
    ));
  });
}

async function writeDataFileToPath(filePath: string, data: ApplicationData): Promise<void> {
  const parsed = applicationDataSchema.safeParse(data);
  if (!parsed.success) {
    throw new StorageError("Refusing to back up invalid application data.");
  }
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  try {
    await open(temporaryPath, "wx", 0o600).then(async (handle) => {
      try {
        await handle.writeFile(`${JSON.stringify(parsed.data, null, 2)}\n`, "utf8");
        await handle.sync();
      } finally {
        await handle.close();
      }
    });
    await rename(temporaryPath, filePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw new StorageError("Unable to create automatic backup.", { cause: error });
  }
}
