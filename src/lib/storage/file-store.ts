import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, readdir, rename, rm, stat, unlink } from "node:fs/promises";
import path from "node:path";

/**
 * Low-level JSON persistence primitives shared by every store.
 *
 * Guarantees (single application instance, one persistent disk):
 * - Paths are built only from validated segments and must stay inside DATA_DIR.
 * - Writes go to a temporary file, are fsynced, then atomically renamed.
 * - Mutations of one file are serialized in-process (promise queue) and across
 *   processes on the same disk (exclusive lock file with stale-lock recovery).
 * - Invalid JSON is never overwritten; callers receive a StorageError.
 */

export class StorageError extends Error {
  /** HTTP status to report: 4xx when the input was rejected, 500 when storage itself failed. */
  status: number;
  constructor(message: string, options?: ErrorOptions & { status?: number }) {
    super(message, options);
    this.name = "StorageError";
    this.status = options?.status ?? 500;
  }
}

const safeSegment = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const lockStaleMs = 30_000;
const lockTimeoutMs = 10_000;
const queues = new Map<string, Promise<unknown>>();

export function dataDirectory(): string {
  const configured = process.env.DATA_DIR?.trim();
  return path.resolve(/*turbopackIgnore: true*/ configured || path.join(process.cwd(), "data"));
}

/** Resolve a path inside DATA_DIR from trusted, validated segments only. */
export function resolveDataPath(...segments: string[]): string {
  for (const segment of segments) {
    if (!safeSegment.test(segment) || segment.includes("..")) {
      throw new StorageError("Refusing to access an invalid storage path.");
    }
  }
  const root = dataDirectory();
  const resolved = path.resolve(/*turbopackIgnore: true*/ root, ...segments);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new StorageError("Refusing to access a path outside the data directory.");
  }
  return resolved;
}

export async function ensureDirectory(directory: string): Promise<void> {
  try {
    await mkdir(directory, { recursive: true, mode: 0o700 });
  } catch (error) {
    throw new StorageError("Unable to create the configured data directory.", { cause: error });
  }
}

/** Returns parsed JSON, or null when the file does not exist. */
export async function readJsonFile(filePath: string): Promise<unknown | null> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new StorageError("Unable to read stored data.", { cause: error });
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    throw new StorageError("Stored data contains invalid JSON; the original file was left untouched.", { cause: error });
  }
}

export async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  const directory = path.dirname(filePath);
  await ensureDirectory(directory);
  const temporaryPath = path.join(directory, `.${path.basename(filePath)}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temporaryPath, "wx", 0o600);
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporaryPath, filePath);
    const directoryHandle = await open(/*turbopackIgnore: true*/ directory, "r");
    try {
      await directoryHandle.sync();
    } catch {
      // Directory fsync is unsupported on some platforms; the rename is still atomic.
    } finally {
      await directoryHandle.close();
    }
  } catch (error) {
    if (handle) await handle.close().catch(() => undefined);
    await unlink(temporaryPath).catch(() => undefined);
    throw new StorageError("Unable to persist data; the save did not complete.", { cause: error });
  }
}

async function acquireLock(lockPath: string): Promise<() => Promise<void>> {
  const started = Date.now();
  const token = `${process.pid}:${randomUUID()}`;
  for (let attempt = 0; ; attempt += 1) {
    try {
      const handle = await open(lockPath, "wx", 0o600);
      await handle.writeFile(JSON.stringify({ token, createdAt: new Date().toISOString() }));
      await handle.close();
      return async () => {
        const current = await readFile(lockPath, "utf8").catch(() => "");
        if (current.includes(token)) await unlink(lockPath).catch(() => undefined);
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        await ensureDirectory(path.dirname(lockPath));
        continue;
      }
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw new StorageError("Unable to lock data for writing.", { cause: error });
      }
      const info = await stat(lockPath).catch(() => null);
      if (info && Date.now() - info.mtimeMs > lockStaleMs) {
        // A crashed writer left the lock behind; data files are replaced atomically, so it is safe to reclaim.
        await unlink(lockPath).catch(() => undefined);
        continue;
      }
      if (Date.now() - started > lockTimeoutMs) {
        throw new StorageError("Data is busy; the change was not saved. Please try again.");
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(200, 5 * 2 ** Math.min(attempt, 6))));
    }
  }
}

/** Serialize an operation on one file across concurrent requests and processes. */
export function withFileLock<T>(filePath: string, operation: () => Promise<T>): Promise<T> {
  const previous = queues.get(filePath) ?? Promise.resolve();
  const run = async () => {
    const release = await acquireLock(`${filePath}.lock`);
    try {
      return await operation();
    } finally {
      await release();
    }
  };
  const result = previous.then(run, run);
  const settled = result.then(() => undefined, () => undefined);
  queues.set(filePath, settled);
  void settled.then(() => {
    if (queues.get(filePath) === settled) queues.delete(filePath);
  });
  return result;
}

export function backupRetention(): number {
  const retention = Number.parseInt(process.env.BACKUP_RETENTION ?? "7", 10);
  if (!Number.isInteger(retention) || retention < 1 || retention > 100) {
    throw new StorageError("BACKUP_RETENTION must be an integer between 1 and 100.");
  }
  return retention;
}

const snapshotPattern = /^snapshot-\d{4}-\d{2}-\d{2}T[\dZ.-]+-[0-9a-f-]+\.json$/;

export async function listSnapshots(directory: string): Promise<string[]> {
  const names = await readdir(/*turbopackIgnore: true*/ directory).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [] as string[];
    throw new StorageError("Unable to list backups.", { cause: error });
  });
  return names.filter((name) => snapshotPattern.test(name)).sort().reverse();
}

/** Write a validated snapshot into `directory` and prune to the retention limit. */
export async function writeSnapshot(directory: string, value: unknown, retention = backupRetention()): Promise<string> {
  const name = `snapshot-${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}.json`;
  const filePath = path.join(directory, name);
  await writeJsonAtomic(filePath, value);
  const snapshots = await listSnapshots(directory);
  await Promise.all(snapshots.slice(retention).map((old) => unlink(path.join(directory, old)).catch(() => undefined)));
  return name;
}

export async function removeDirectory(directory: string): Promise<void> {
  try {
    await rm(directory, { recursive: true, force: true });
  } catch (error) {
    throw new StorageError("Unable to delete stored data.", { cause: error });
  }
}
