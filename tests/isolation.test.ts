import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { call, sessionCookieFrom, strongPassword, uniqueEmail, useTemporaryDataDir } from "./helpers";
import * as registerRoute from "../src/app/api/auth/register/route";
import * as collectionsRoute from "../src/app/api/collections/[collection]/route";
import * as timerRoute from "../src/app/api/timer/route";
import * as examsRoute from "../src/app/api/exams/route";
import * as backupRoute from "../src/app/api/backup/route";
import * as reportsRoute from "../src/app/api/reports/route";
import * as adminUsersRoute from "../src/app/api/admin/users/route";
import * as adminAuditRoute from "../src/app/api/admin/audit/route";
import { clearRateLimitsForTest } from "../src/lib/auth/rate-limit";

let dataDir: Awaited<ReturnType<typeof useTemporaryDataDir>>;
let ip = 0;

before(async () => {
  Object.assign(process.env, { NODE_ENV: "test", EMAIL_PROVIDER: "none", ADMIN_EMAILS: "owner@example.test" });
  dataDir = await useTemporaryDataDir();
});
after(async () => dataDir.cleanup());
beforeEach(() => clearRateLimitsForTest());

async function register(email = uniqueEmail()) {
  ip += 1;
  const response = await call(registerRoute.POST, "POST", "/api/auth/register", { body: { email, password: strongPassword }, ip: `198.51.100.${ip}` });
  assert.equal(response.status, 201, JSON.stringify(response.json));
  return { cookie: sessionCookieFrom(response.headers), id: (response.json.user as { id: string }).id };
}

const notes = (cookie: string) => call(collectionsRoute.GET, "GET", "/api/collections/notes", { cookie, params: { collection: "notes" } });
const createNote = (cookie: string, title: string) =>
  call(collectionsRoute.POST, "POST", "/api/collections/notes", { cookie, params: { collection: "notes" }, body: { title, body: "private body", topicId: null, tags: [] } });

test("one learner cannot read, modify, or delete another learner's records by id", async () => {
  const alice = await register();
  const bob = await register();
  const created = await createNote(alice.cookie, "Alice private note");
  assert.equal(created.status, 201);
  const noteId = created.json.id as string;

  assert.equal((await notes(alice.cookie)).json.length, 1);
  assert.equal((await notes(bob.cookie)).json.length, 0, "Bob's list must not include Alice's note");

  const patch = await call(collectionsRoute.PATCH, "PATCH", "/api/collections/notes", { cookie: bob.cookie, params: { collection: "notes" }, body: { id: noteId, title: "hijacked" } });
  assert.equal(patch.status, 400);
  assert.match(String(patch.json.error), /not found/i);
  const remove = await call(collectionsRoute.DELETE, "DELETE", `/api/collections/notes?id=${noteId}`, { cookie: bob.cookie, params: { collection: "notes" } });
  assert.equal(remove.status, 400);

  // A user id smuggled into the body is ignored; ownership comes from the session only.
  const smuggled = await call(collectionsRoute.POST, "POST", "/api/collections/notes", {
    cookie: bob.cookie, params: { collection: "notes" }, body: { title: "smuggled", body: "", topicId: null, tags: [], userId: alice.id, ownerUserId: alice.id }
  });
  assert.equal(smuggled.status, 201);
  const aliceNotes = (await notes(alice.cookie)).json as { title: string }[];
  assert.deepEqual(aliceNotes.map((note) => note.title), ["Alice private note"]);
});

test("timer sessions and examination attempts are isolated per user", async () => {
  const alice = await register();
  const bob = await register();
  const started = await call(timerRoute.POST, "POST", "/api/timer", { cookie: alice.cookie, body: { action: "start", topicId: "topic-1", plannedSeconds: 1800 } });
  assert.equal(started.status, 201, JSON.stringify(started.json));
  const sessionId = started.json.id as string;
  const hijack = await call(timerRoute.POST, "POST", "/api/timer", { cookie: bob.cookie, body: { action: "finish", sessionId } });
  assert.equal(hijack.status, 400);
  assert.match(String(hijack.json.error), /not found/i);
  // Bob can run his own timer even though Alice has an active session.
  assert.equal((await call(timerRoute.POST, "POST", "/api/timer", { cookie: bob.cookie, body: { action: "start", topicId: "topic-1", plannedSeconds: 600 } })).status, 201);

  const blueprints = await call(collectionsRoute.GET, "GET", "/api/collections/examinationBlueprints", { cookie: alice.cookie, params: { collection: "examinationBlueprints" } });
  const blueprintId = (blueprints.json as { id: string; active: boolean }[]).find((item) => item.active)?.id;
  assert.ok(blueprintId);
  const exam = await call(examsRoute.POST, "POST", "/api/exams", { cookie: alice.cookie, body: { action: "start", blueprintId } });
  assert.equal(exam.status, 201, JSON.stringify(exam.json));
  const attemptId = exam.json.id as string;
  const questionId = (exam.json.questionSnapshots as { questionId: string }[])[0].questionId;
  const answer = await call(examsRoute.PATCH, "PATCH", "/api/exams", { cookie: bob.cookie, body: { action: "answer", attemptId, questionId, answer: "x" } });
  assert.equal(answer.status, 400);
  const submit = await call(examsRoute.POST, "POST", "/api/exams", { cookie: bob.cookie, body: { action: "submit", attemptId } });
  assert.equal(submit.status, 400);
  const bobAttempts = await call(collectionsRoute.GET, "GET", "/api/collections/examinationAttempts", { cookie: bob.cookie, params: { collection: "examinationAttempts" } });
  assert.equal(bobAttempts.json.length, 0);
});

test("exports contain only the caller's data and cross-account restores are rejected", async () => {
  const alice = await register();
  const bob = await register();
  await createNote(alice.cookie, "Alice export marker");
  const aliceExport = await call(backupRoute.GET, "GET", "/api/backup", { cookie: alice.cookie });
  assert.equal(aliceExport.status, 200);
  assert.equal(aliceExport.json.ownerUserId, alice.id);
  const bobExport = await call(backupRoute.GET, "GET", "/api/backup", { cookie: bob.cookie });
  assert.ok(!JSON.stringify(bobExport.json).includes("Alice export marker"));

  const crossRestore = await call(backupRoute.PUT, "PUT", "/api/backup", { cookie: bob.cookie, body: { confirm: true, data: aliceExport.json } });
  assert.equal(crossRestore.status, 403);
  // Rewriting the owner id does not help: the restore applies only to the caller's own file.
  const relabeled = await call(backupRoute.PUT, "PUT", "/api/backup", { cookie: bob.cookie, body: { confirm: true, data: { ...aliceExport.json, ownerUserId: alice.id } } });
  assert.equal(relabeled.status, 403);
  assert.equal((await notes(bob.cookie)).json.length, 0);

  const reports = await call(reportsRoute.GET, "GET", "/api/reports?format=json", { cookie: bob.cookie });
  assert.equal(reports.status, 200);
  assert.ok(!JSON.stringify(reports.json).includes("Alice export marker"));

  const unconfirmed = await call(backupRoute.PUT, "PUT", "/api/backup", { cookie: alice.cookie, body: { data: aliceExport.json } });
  assert.equal(unconfirmed.status, 400);
  const invalid = await call(backupRoute.PUT, "PUT", "/api/backup", { cookie: alice.cookie, body: { confirm: true, data: { ...aliceExport.json, data: { schemaVersion: 99 } } } });
  assert.equal(invalid.status, 400);
  const restored = await call(backupRoute.PUT, "PUT", "/api/backup", { cookie: alice.cookie, body: { confirm: true, data: aliceExport.json } });
  assert.equal(restored.status, 200);
  assert.equal((await notes(alice.cookie)).json.length, 1);
});

test("administrator endpoints require the admin role and never expose learning data or hashes", async () => {
  const learner = await register();
  const admin = await register("owner@example.test");
  assert.equal((await call(adminUsersRoute.GET, "GET", "/api/admin/users", { cookie: learner.cookie })).status, 403);
  assert.equal((await call(adminAuditRoute.GET, "GET", "/api/admin/audit", { cookie: learner.cookie })).status, 403);
  assert.equal((await call(adminUsersRoute.PATCH, "PATCH", "/api/admin/users", { cookie: learner.cookie, body: { userId: learner.id, role: "admin" } })).status, 403);

  const listing = await call(adminUsersRoute.GET, "GET", "/api/admin/users", { cookie: admin.cookie });
  assert.equal(listing.status, 200);
  const serialized = JSON.stringify(listing.json);
  assert.ok(!serialized.includes("argon2"));
  assert.ok(!serialized.includes("learningSessions") && !serialized.includes("notes"));

  assert.equal((await call(adminUsersRoute.PATCH, "PATCH", "/api/admin/users", { cookie: admin.cookie, body: { userId: admin.id, role: "learner" } })).status, 409, "last admin cannot be demoted");
  assert.equal((await call(adminUsersRoute.PATCH, "PATCH", "/api/admin/users", { cookie: admin.cookie, body: { userId: learner.id, role: "admin" } })).status, 200);
  const audit = await call(adminAuditRoute.GET, "GET", "/api/admin/audit", { cookie: admin.cookie });
  const entry = (audit.json as { action: string; actorUserId: string; targetId: string }[]).find((item) => item.action === "account.role-changed");
  assert.ok(entry);
  assert.equal(entry.actorUserId, admin.id);
  assert.equal(entry.targetId, learner.id);
});

test("concurrent writes from several users never lose updates or corrupt files", async () => {
  const users = await Promise.all([register(), register(), register()]);
  const perUser = 15;
  const results = await Promise.all(users.flatMap((user, userIndex) =>
    Array.from({ length: perUser }, (_, index) => createNote(user.cookie, `u${userIndex}-n${index}`))
  ));
  assert.ok(results.every((result) => result.status === 201), JSON.stringify(results.find((result) => result.status !== 201)?.json));
  for (const [userIndex, user] of users.entries()) {
    const titles = ((await notes(user.cookie)).json as { title: string }[]).map((note) => note.title).sort();
    assert.equal(titles.length, perUser);
    assert.ok(titles.every((title) => title.startsWith(`u${userIndex}-`)));
    const raw = await readFile(path.join(dataDir.directory, "users", user.id, "learning-data.json"), "utf8");
    const parsed = JSON.parse(raw) as { ownerUserId: string; revision: number };
    assert.equal(parsed.ownerUserId, user.id);
    assert.ok(parsed.revision >= perUser);
  }
});
