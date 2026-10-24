import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import * as registerRoute from "../src/app/api/auth/register/route";
import * as loginRoute from "../src/app/api/auth/login/route";
import * as settingsRoute from "../src/app/api/settings/route";
import * as adminUsersRoute from "../src/app/api/admin/users/route";
import { initializeConfiguredSuperuser, recordHeartbeat, validateSessionToken } from "../src/lib/auth/service";
import { call, sessionCookieFrom, strongPassword, uniqueEmail, useTemporaryDataDir } from "./helpers";

let dataDir: Awaited<ReturnType<typeof useTemporaryDataDir>>;
let ipCounter = 0;

before(async () => {
  Object.assign(process.env, { NODE_ENV: "test", EMAIL_PROVIDER: "none", ADMIN_EMAILS: "admin@example.test" });
  dataDir = await useTemporaryDataDir();
});

after(async () => {
  delete process.env.SUPERUSER_EMAIL;
  delete process.env.SUPERUSER_PASSWORD;
  await dataDir.cleanup();
});

async function register(email: string) {
  ipCounter += 1;
  const response = await call(registerRoute.POST, "POST", "/api/auth/register", {
    body: { email, password: strongPassword, displayName: "Test account" },
    ip: `198.51.100.${ipCounter}`
  });
  assert.equal(response.status, 201, JSON.stringify(response.json));
  return { cookie: sessionCookieFrom(response.headers), id: (response.json.user as { id: string }).id, email };
}

test("admin account API filters and paginates, and suspending an account revokes its sessions", async () => {
  const admin = await register("admin@example.test");
  const learner = await register(uniqueEmail());
  const users = await call(adminUsersRoute.GET, "GET", "/api/admin/users?page=1&pageSize=1", { cookie: admin.cookie });
  assert.equal(users.status, 200);
  const page = users.json as unknown as { rows: unknown[]; pageSize: number };
  assert.equal(page.rows.length, 1);
  assert.equal(page.pageSize, 1);
  const admins = await call(adminUsersRoute.GET, "GET", "/api/admin/users?role=admin", { cookie: admin.cookie });
  assert.ok((admins.json as unknown as { rows: { role: string }[] }).rows.every((row) => row.role === "admin"));

  const suspended = await call(adminUsersRoute.PATCH, "PATCH", "/api/admin/users", {
    cookie: admin.cookie,
    body: { userId: learner.id, status: "suspended" }
  });
  assert.equal(suspended.status, 200);
  assert.ok([401, 403].includes((await call(settingsRoute.GET, "GET", "/api/settings", { cookie: learner.cookie })).status));
  assert.equal((await call(loginRoute.POST, "POST", "/api/auth/login", { body: { email: learner.email, password: strongPassword } })).status, 403);
  const reactivated = await call(adminUsersRoute.PATCH, "PATCH", "/api/admin/users", {
    cookie: admin.cookie,
    body: { userId: learner.id, status: "active" }
  });
  assert.equal(reactivated.status, 200);
  assert.equal((await call(loginRoute.POST, "POST", "/api/auth/login", { body: { email: learner.email, password: strongPassword } })).status, 200);
});

test("configured superuser bootstrap hashes a new password once and preserves existing passwords", async () => {
  const email = uniqueEmail("superuser");
  const password = "a unique strong superuser passphrase";
  process.env.SUPERUSER_EMAIL = email;
  process.env.SUPERUSER_PASSWORD = password;
  await initializeConfiguredSuperuser();
  const storePath = path.join(dataDir.directory, "system", "accounts.json");
  const firstDocument = JSON.parse(await readFile(storePath, "utf8")) as { users: { email: string; passwordHash: string; role: string }[] };
  const first = firstDocument.users.find((user) => user.email === email);
  assert.ok(first);
  assert.equal(first.role, "superuser");
  assert.ok(first.passwordHash.startsWith("$2b$") || first.passwordHash.startsWith("$2a$"));
  assert.notEqual(first.passwordHash, password);

  process.env.SUPERUSER_PASSWORD = "a different replacement password";
  await initializeConfiguredSuperuser();
  const secondDocument = JSON.parse(await readFile(storePath, "utf8")) as { users: { email: string; passwordHash: string }[] };
  assert.equal(secondDocument.users.find((user) => user.email === email)?.passwordHash, first.passwordHash);
});

test("heartbeat IDs are deduplicated and active time is credited only between active heartbeats", async () => {
  const account = await register(uniqueEmail());
  const token = account.cookie.split("=")[1];
  const valid = await validateSessionToken(token);
  assert.ok(valid);
  const firstId = randomUUID();
  const secondId = randomUUID();
  const firstAt = Date.parse(valid.session.lastUsedAt) + 1_000;
  assert.deepEqual(await recordHeartbeat(valid.session.id, { eventId: firstId, learningActive: true, activity: "/courses/demo" }, firstAt), { accepted: true });
  assert.deepEqual(await recordHeartbeat(valid.session.id, { eventId: firstId, learningActive: true, activity: "/courses/demo" }, firstAt + 2_000), { accepted: false });
  assert.deepEqual(await recordHeartbeat(valid.session.id, { eventId: secondId, learningActive: true, activity: "/courses/demo" }, firstAt + 6_000), { accepted: true });
  const sessions = JSON.parse(await readFile(path.join(dataDir.directory, "system", "sessions.json"), "utf8")) as { sessions: { id: string; activeLearningSeconds: number }[] };
  assert.equal(sessions.sessions.find((session) => session.id === valid.session.id)?.activeLearningSeconds, 6);
});
