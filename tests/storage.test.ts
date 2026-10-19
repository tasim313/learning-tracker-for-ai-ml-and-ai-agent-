import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createAutomaticBackup, loadApplicationData, restoreApplicationData, saveApplicationData, StorageError } from "../src/lib/storage/json-store";
import { createSeedData } from "../src/lib/seed";

test("storage initializes versioned data and persists concurrent writes without corrupting JSON", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "learning-tracker-"));
  const previousDataDir = process.env.DATA_DIR;
  process.env.DATA_DIR = directory;
  try {
    const initial = await loadApplicationData();
    assert.equal(initial.schemaVersion, 4);
    const writes = Array.from({ length: 8 }, async (_, index) => {
      const next = createSeedData();
      next.settings = { write: index };
      await saveApplicationData(next);
    });
    await Promise.all(writes);
    const stored = JSON.parse(await readFile(path.join(directory, "learning-tracker.json"), "utf8")) as { settings: { write: number } };
    assert.ok(stored.settings.write >= 0 && stored.settings.write < 8);
    assert.equal((await loadApplicationData()).schemaVersion, 4);
  } finally {
    if (previousDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = previousDataDir;
    await rm(directory, { recursive: true, force: true });
  }
});

test("storage surfaces invalid JSON without replacing the corrupt file", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "learning-tracker-"));
  const previousDataDir = process.env.DATA_DIR;
  process.env.DATA_DIR = directory;
  const corrupt = "{not-json";
  try {
    await import("node:fs/promises").then(({ writeFile }) =>
      writeFile(path.join(directory, "learning-tracker.json"), corrupt)
    );
    await assert.rejects(loadApplicationData(), StorageError);
    assert.equal(await readFile(path.join(directory, "learning-tracker.json"), "utf8"), corrupt);
  } finally {
    if (previousDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = previousDataDir;
    await rm(directory, { recursive: true, force: true });
  }
});

test("automatic backups retain the configured number of validated snapshots", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "learning-tracker-"));
  const previousDataDir = process.env.DATA_DIR;
  const previousRetention = process.env.BACKUP_RETENTION;
  process.env.DATA_DIR = directory;
  process.env.BACKUP_RETENTION = "1";
  try {
    await loadApplicationData();
    await createAutomaticBackup();
    const updated = createSeedData();
    updated.settings = { marker: "latest" };
    await saveApplicationData(updated);
    const latestBackup = await createAutomaticBackup();
    const files = await import("node:fs/promises").then(({ readdir }) => readdir(directory));
    const backups = files.filter((name) => name.startsWith("learning-tracker-") && name !== "learning-tracker.json");
    assert.equal(backups.length, 1);
    assert.equal(path.join(directory, backups[0]), latestBackup);
    assert.equal(JSON.parse(await readFile(latestBackup, "utf8")).settings.marker, "latest");
  } finally {
    if (previousDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = previousDataDir;
    if (previousRetention === undefined) delete process.env.BACKUP_RETENTION;
    else process.env.BACKUP_RETENTION = previousRetention;
    await rm(directory, { recursive: true, force: true });
  }
});

test("restore snapshots current data before replacing it and rejects invalid imports", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "learning-tracker-"));
  const previousDataDir = process.env.DATA_DIR;
  process.env.DATA_DIR = directory;
  try {
    const original = createSeedData();
    original.settings = { marker: "original" };
    await saveApplicationData(original);

    const replacement = createSeedData();
    replacement.settings = { marker: "restored" };
    const restored = await restoreApplicationData(replacement);
    assert.equal(restored.settings.marker, "restored");

    const backups = (await import("node:fs/promises").then(({ readdir }) => readdir(directory)))
      .filter((name) => name.startsWith("learning-tracker-") && name !== "learning-tracker.json");
    assert.equal(backups.length, 1);
    const backup = JSON.parse(await readFile(path.join(directory, backups[0]), "utf8")) as { settings: { marker: string } };
    assert.equal(backup.settings.marker, "original");

    await assert.rejects(restoreApplicationData({ schemaVersion: 2 }), StorageError);
    const current = await loadApplicationData();
    assert.equal(current.settings.marker, "restored");
  } finally {
    if (previousDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = previousDataDir;
    await rm(directory, { recursive: true, force: true });
  }
});
