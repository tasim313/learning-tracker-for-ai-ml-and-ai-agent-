import path from "node:path";
import { z } from "zod";
import { applicationDataSchema, type ApplicationData } from "@/lib/model";
import { createSeedData } from "@/lib/seed";
import { readDocument, updateDocument, type DocumentDefinition } from "@/lib/storage/document";
import {
  StorageError, backupRetention, ensureDirectory, listSnapshots, readJsonFile, removeDirectory,
  resolveDataPath, withFileLock, writeSnapshot
} from "@/lib/storage/file-store";
import { migrateApplicationData } from "@/lib/storage/migrations";

/**
 * Per-user learning data. Every learner's records live in their own file:
 *   DATA_DIR/users/<userId>/learning-data.json
 * The userId must come from the validated server-side session, never from the
 * request. Because the file is chosen by owner, a record id belonging to another
 * user cannot be resolved by changing ids, URLs, or request bodies.
 */

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const documentFormat = "learning-tracker/user-data";
const exportFormat = "learning-tracker/export";

const envelopeSchema = z.object({
  format: z.literal(documentFormat),
  formatVersion: z.literal(1),
  ownerUserId: z.string().regex(uuidPattern),
  revision: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
  data: z.unknown()
});

type UserDocument = {
  format: typeof documentFormat;
  formatVersion: 1;
  ownerUserId: string;
  revision: number;
  updatedAt: string;
  data: ApplicationData;
};

export type UserDataExport = {
  format: typeof exportFormat;
  formatVersion: 1;
  ownerUserId: string;
  exportedAt: string;
  data: ApplicationData;
};

export function assertUserId(userId: string): string {
  if (typeof userId !== "string" || !uuidPattern.test(userId)) throw new StorageError("Invalid account identifier.");
  return userId;
}

function userDirectory(userId: string) {
  return resolveDataPath("users", assertUserId(userId));
}

function backupDirectory(userId: string) {
  return path.join(userDirectory(userId), "backups");
}

function parseEnvelope(raw: unknown, userId: string): { data: UserDocument; migrated: boolean } {
  const envelope = envelopeSchema.safeParse(raw);
  if (!envelope.success) throw new StorageError("Stored learning data has an invalid format.");
  if (envelope.data.ownerUserId !== userId) {
    throw new StorageError("Stored learning data does not belong to this account.");
  }
  const migrated = migrateApplicationData(envelope.data.data);
  return { data: { ...envelope.data, data: migrated.data } as UserDocument, migrated: migrated.migrated };
}

function definition(userId: string): DocumentDefinition<UserDocument> {
  return {
    filePath: path.join(userDirectory(userId), "learning-data.json"),
    parse: (raw) => parseEnvelope(raw, userId),
    create: () => ({
      format: documentFormat,
      formatVersion: 1,
      ownerUserId: userId,
      revision: 0,
      updatedAt: new Date().toISOString(),
      data: createSeedData()
    }),
    validate: (document) => {
      if (document.ownerUserId !== userId) throw new Error("Owner mismatch.");
      const parsed = applicationDataSchema.safeParse(document.data);
      if (!parsed.success) {
        throw new Error(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
      }
      return { ...document, data: parsed.data };
    }
  };
}

export async function loadUserData(userId: string): Promise<ApplicationData> {
  const document = await readDocument(definition(userId));
  await ensureDailySnapshot(userId).catch((error) => console.error("Automatic daily backup failed.", error));
  return document.data;
}

export async function updateUserData<T>(
  userId: string,
  update: (data: ApplicationData) => { data: ApplicationData; result: T }
): Promise<T> {
  return updateDocument(definition(userId), (current) => {
    const change = update(current.data);
    return {
      data: { ...current, revision: current.revision + 1, updatedAt: new Date().toISOString(), data: change.data },
      result: change.result
    };
  });
}

export async function exportUserData(userId: string): Promise<UserDataExport> {
  const data = await loadUserData(userId);
  return { format: exportFormat, formatVersion: 1, ownerUserId: userId, exportedAt: new Date().toISOString(), data };
}

/** Validate a backup without writing anything. Throws StorageError when it cannot be restored for this user. */
export function validateUserBackup(userId: string, input: unknown): ApplicationData {
  const exportSchema = z.object({
    format: z.enum([exportFormat, documentFormat]),
    formatVersion: z.literal(1),
    ownerUserId: z.string(),
    data: z.unknown()
  });
  const parsed = exportSchema.safeParse(input);
  if (!parsed.success) throw new StorageError("This file is not a learning-tracker account backup.", { status: 400 });
  if (parsed.data.ownerUserId !== userId) {
    throw new StorageError("This backup belongs to a different account and cannot be restored here.", { status: 403 });
  }
  try {
    return migrateApplicationData(parsed.data.data).data;
  } catch (error) {
    throw new StorageError(error instanceof Error ? error.message : "Backup failed schema validation.", { status: 400 });
  }
}

/** Replace the user's data with a validated backup. The current data is snapshotted first. */
export async function restoreUserData(userId: string, input: unknown): Promise<ApplicationData> {
  const restored = validateUserBackup(userId, input);
  const retention = backupRetention();
  return updateDocument(definition(userId), async (current) => {
    await writeSnapshot(backupDirectory(userId), current, retention);
    return {
      data: { ...current, revision: current.revision + 1, updatedAt: new Date().toISOString(), data: restored },
      result: restored
    };
  });
}

export async function createUserSnapshot(userId: string): Promise<string> {
  const retention = backupRetention();
  const document = await readDocument(definition(userId));
  return writeSnapshot(backupDirectory(userId), document, retention);
}

export async function listUserSnapshots(userId: string): Promise<{ name: string; createdAt: string }[]> {
  const names = await listSnapshots(backupDirectory(userId));
  return names.map((name) => {
    const stamp = name.slice("snapshot-".length, "snapshot-".length + 24);
    const createdAt = stamp.replace(/T(\d{2})-(\d{2})-(\d{2})/, "T$1:$2:$3");
    return { name, createdAt };
  });
}

/** Restore one of the user's own automatic snapshots by name (validated against the listing). */
export async function restoreUserSnapshot(userId: string, name: string): Promise<ApplicationData> {
  const available = await listSnapshots(backupDirectory(userId));
  if (!available.includes(name)) throw new StorageError("Backup was not found.", { status: 404 });
  const raw = await readJsonFile(path.join(backupDirectory(userId), name));
  if (raw === null) throw new StorageError("Backup was not found.");
  const snapshot = parseEnvelope(raw, userId).data;
  return restoreUserData(userId, { ...snapshot, format: documentFormat });
}

async function ensureDailySnapshot(userId: string): Promise<void> {
  const directory = backupDirectory(userId);
  const today = new Date().toISOString().slice(0, 10);
  const existing = await listSnapshots(directory);
  if (existing.some((name) => name.startsWith(`snapshot-${today}T`))) return;
  const retention = backupRetention();
  await withFileLock(path.join(directory, "daily"), async () => {
    const again = await listSnapshots(directory);
    if (again.some((name) => name.startsWith(`snapshot-${today}T`))) return;
    await ensureDirectory(directory);
    const raw = await readJsonFile(definition(userId).filePath);
    if (raw === null) return;
    await writeSnapshot(directory, parseEnvelope(raw, userId).data, retention);
  });
}

export async function deleteUserData(userId: string): Promise<void> {
  await removeDirectory(userDirectory(userId));
}

/**
 * Import a legacy single-user workspace (DATA_DIR/learning-tracker.json from
 * versions before accounts existed) into one account. The legacy file is not modified.
 */
export async function importLegacyWorkspace(userId: string, legacyFile: string): Promise<ApplicationData> {
  const raw = await readJsonFile(legacyFile);
  if (raw === null) throw new StorageError("Legacy data file was not found.");
  let data: ApplicationData;
  try {
    data = migrateApplicationData(raw).data;
  } catch (error) {
    throw new StorageError(error instanceof Error ? error.message : "Legacy data failed validation.");
  }
  return restoreUserData(userId, { format: exportFormat, formatVersion: 1, ownerUserId: userId, data });
}
