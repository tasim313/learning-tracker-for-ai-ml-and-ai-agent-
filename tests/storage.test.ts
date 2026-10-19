import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { after, before, test } from "node:test";
import { useTemporaryDataDir } from "./helpers";
import { StorageError, resolveDataPath, withFileLock, writeJsonAtomic } from "../src/lib/storage/file-store";
import {
  assertUserId, createUserSnapshot, exportUserData, importLegacyWorkspace, listUserSnapshots, loadUserData,
  restoreUserData, restoreUserSnapshot, updateUserData
} from "../src/lib/storage/user-store";
import { createSeedData } from "../src/lib/seed";
import { schemaVersion } from "../src/lib/model";

let dataDir: Awaited<ReturnType<typeof useTemporaryDataDir>>;
before(async () => { dataDir = await useTemporaryDataDir(); });
after(async () => dataDir.cleanup());

const userFile = (userId: string) => path.join(dataDir.directory, "users", userId, "learning-data.json");

test("a new user's data is initialized from the seed with no invented activity", async () => {
  const userId = randomUUID();
  const data = await loadUserData(userId);
  assert.equal(data.schemaVersion, schemaVersion);
  assert.equal(data.topics.length, 48);
  assert.deepEqual(data.learningSessions, []);
  assert.deepEqual(data.examinationAttempts, []);
  const stored = JSON.parse(await readFile(userFile(userId), "utf8")) as { ownerUserId: string; format: string };
  assert.equal(stored.ownerUserId, userId);
});

test("storage rejects path traversal and invalid user identifiers", () => {
  assert.throws(() => assertUserId("../../etc"), StorageError);
  assert.throws(() => assertUserId("not-a-uuid"), StorageError);
  assert.throws(() => resolveDataPath("..", "secrets.json"), StorageError);
  assert.throws(() => resolveDataPath("users", "a/b"), StorageError);
  assert.throws(() => resolveDataPath("users", ".hidden"), StorageError);
});

test("corrupt JSON is reported and never overwritten", async () => {
  const userId = randomUUID();
  await mkdir(path.dirname(userFile(userId)), { recursive: true });
  await writeFile(userFile(userId), "{not-json");
  await assert.rejects(loadUserData(userId), StorageError);
  await assert.rejects(updateUserData(userId, (data) => ({ data, result: null })), StorageError);
  assert.equal(await readFile(userFile(userId), "utf8"), "{not-json");
});

test("a data file whose owner does not match the account is refused", async () => {
  const owner = randomUUID();
  const intruder = randomUUID();
  await loadUserData(owner);
  const content = await readFile(userFile(owner), "utf8");
  await mkdir(path.dirname(userFile(intruder)), { recursive: true });
  await writeFile(userFile(intruder), content);
  await assert.rejects(loadUserData(intruder), /does not belong/);
});

test("invalid changes are refused and the previous data remains", async () => {
  const userId = randomUUID();
  await loadUserData(userId);
  await assert.rejects(updateUserData(userId, (data) => ({ data: { ...data, topics: [{ ...data.topics[0], phaseId: "missing" }] }, result: null })), StorageError);
  assert.equal((await loadUserData(userId)).topics.length, 48);
});

test("concurrent updates to one user's file are serialized without lost updates", async () => {
  const userId = randomUUID();
  await loadUserData(userId);
  await Promise.all(Array.from({ length: 40 }, (_, index) => updateUserData(userId, (data) => ({
    data: { ...data, goals: [...data.goals, { id: `goal-${index}`, title: `Goal ${index}`, targetDate: null, completed: false }] },
    result: null
  }))));
  const goals = (await loadUserData(userId)).goals;
  assert.equal(goals.length, 40);
  assert.equal(new Set(goals.map((goal) => goal.id)).size, 40);
});

test("the file lock also serializes writers in a separate process", async () => {
  const filePath = path.join(dataDir.directory, "lock-test.json");
  await writeJsonAtomic(filePath, { count: 0 });
  const script = `
    import { withFileLock, readJsonFile, writeJsonAtomic } from ${JSON.stringify(path.resolve("src/lib/storage/file-store.ts"))};
    const file = ${JSON.stringify(filePath)};
    await Promise.all(Array.from({ length: 20 }, () => withFileLock(file, async () => {
      const current = await readJsonFile(file);
      await new Promise((r) => setTimeout(r, 2));
      await writeJsonAtomic(file, { count: current.count + 1 });
    })));
  `;
  const child = promisify(execFile)(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], { cwd: process.cwd() });
  await Promise.all(Array.from({ length: 20 }, () => withFileLock(filePath, async () => {
    const current = JSON.parse(await readFile(filePath, "utf8")) as { count: number };
    await new Promise((resolve) => setTimeout(resolve, 2));
    await writeJsonAtomic(filePath, { count: current.count + 1 });
  })));
  await child;
  assert.equal((JSON.parse(await readFile(filePath, "utf8")) as { count: number }).count, 40);
});

test("snapshots respect retention and restores snapshot the current data first", async () => {
  const previous = process.env.BACKUP_RETENTION;
  process.env.BACKUP_RETENTION = "2";
  try {
    const userId = randomUUID();
    await loadUserData(userId);
    await updateUserData(userId, (data) => ({ data: { ...data, settings: { ...data.settings, marker: "original" } }, result: null }));
    for (let index = 0; index < 4; index += 1) await createUserSnapshot(userId);
    assert.equal((await listUserSnapshots(userId)).length, 2);

    const replacement = createSeedData();
    replacement.settings = { marker: "restored" };
    await restoreUserData(userId, { format: "learning-tracker/export", formatVersion: 1, ownerUserId: userId, data: replacement });
    assert.equal((await loadUserData(userId)).settings.marker, "restored");
    const snapshots = await listUserSnapshots(userId);
    const newest = JSON.parse(await readFile(path.join(dataDir.directory, "users", userId, "backups", snapshots[0].name), "utf8")) as { data: { settings: { marker: string } } };
    assert.equal(newest.data.settings.marker, "original", "the pre-restore state is kept as a snapshot");

    await restoreUserSnapshot(userId, snapshots[0].name);
    assert.equal((await loadUserData(userId)).settings.marker, "original");
    await assert.rejects(restoreUserSnapshot(userId, "../../system/accounts.json"), StorageError);
  } finally {
    if (previous === undefined) delete process.env.BACKUP_RETENTION;
    else process.env.BACKUP_RETENTION = previous;
  }
});

test("invalid backups are rejected before anything is replaced", async () => {
  const userId = randomUUID();
  await updateUserData(userId, (data) => ({ data: { ...data, settings: { marker: "keep" } }, result: null }));
  await assert.rejects(restoreUserData(userId, { schemaVersion: 2 }), StorageError);
  await assert.rejects(restoreUserData(userId, { format: "learning-tracker/export", formatVersion: 1, ownerUserId: userId, data: { schemaVersion: 2 } }), StorageError);
  const exported = await exportUserData(userId);
  const broken = structuredClone(exported);
  broken.data.topics[0].phaseId = "missing-phase";
  await assert.rejects(restoreUserData(userId, broken), StorageError);
  assert.equal((await loadUserData(userId)).settings.marker, "keep");
});

test("a legacy single-user workspace is imported into an account without modifying the legacy file", async () => {
  const userId = randomUUID();
  const legacy = createSeedData();
  legacy.notes = [{ id: "legacy-note", title: "From before accounts", body: "", topicId: null, tags: [], updatedAt: "2026-01-01T00:00:00.000Z" }];
  const legacyFile = path.join(dataDir.directory, "learning-tracker.json");
  const raw = JSON.stringify({ ...legacy, schemaVersion: 4 });
  await writeFile(legacyFile, raw);
  await importLegacyWorkspace(userId, legacyFile);
  assert.equal((await loadUserData(userId)).notes[0].title, "From before accounts");
  assert.equal(await readFile(legacyFile, "utf8"), raw);
});

test("no temporary or lock files are left behind after writes", async () => {
  const userId = randomUUID();
  await Promise.all(Array.from({ length: 10 }, () => updateUserData(userId, (data) => ({ data, result: null }))));
  const leftovers = (await readdir(path.dirname(userFile(userId)))).filter((name) => name.endsWith(".tmp") || name.endsWith(".lock"));
  assert.deepEqual(leftovers, []);
});
