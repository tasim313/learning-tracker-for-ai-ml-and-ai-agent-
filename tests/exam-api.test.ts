import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { call, sessionCookieFrom, strongPassword, uniqueEmail, useTemporaryDataDir } from "./helpers";
import * as registerRoute from "../src/app/api/auth/register/route";
import * as examsRoute from "../src/app/api/exams/route";
import * as settingsRoute from "../src/app/api/settings/route";
import * as roadmapRoute from "../src/app/api/roadmap/route";
import * as analyticsRoute from "../src/app/api/analytics/route";
import * as resourceCheckRoute from "../src/app/api/resources/check/route";
import * as collectionsRoute from "../src/app/api/collections/[collection]/route";
import { clearRateLimitsForTest } from "../src/lib/auth/rate-limit";

let dataDir: Awaited<ReturnType<typeof useTemporaryDataDir>>;
let ip = 0;
before(async () => { Object.assign(process.env, { NODE_ENV: "test", EMAIL_PROVIDER: "none" }); dataDir = await useTemporaryDataDir(); });
after(async () => dataDir.cleanup());
beforeEach(() => clearRateLimitsForTest());

async function register() {
  ip += 1;
  const response = await call(registerRoute.POST, "POST", "/api/auth/register", { body: { email: uniqueEmail(), password: strongPassword }, ip: `198.51.100.${ip}` });
  return { cookie: sessionCookieFrom(response.headers) };
}

test("confidence ratings are saved separately from answers and locked after submission", async () => {
  const learner = await register();
  const started = await call(examsRoute.POST, "POST", "/api/exams", { cookie: learner.cookie, body: { action: "start", blueprintId: "sample-retention-evaluation" } });
  assert.equal(started.status, 201, JSON.stringify(started.json));
  const attemptId = started.json.id as string;
  const questionId = (started.json.questionSnapshots as { questionId: string }[])[0].questionId;
  assert.equal((await call(examsRoute.PATCH, "PATCH", "/api/exams", { cookie: learner.cookie, body: { action: "confidence", attemptId, questionId, confidence: 9 } })).status, 400);
  const rated = await call(examsRoute.PATCH, "PATCH", "/api/exams", { cookie: learner.cookie, body: { action: "confidence", attemptId, questionId, confidence: 4 } });
  assert.equal(rated.status, 200);
  assert.equal((rated.json.confidenceRatings as Record<string, number>)[questionId], 4);
  assert.deepEqual(rated.json.answers, {}, "a confidence rating is not an answer");

  // Answers saved in sequence keep the last value.
  for (const value of ["f", "fa", "fal", "false"]) {
    await call(examsRoute.PATCH, "PATCH", "/api/exams", { cookie: learner.cookie, body: { action: "answer", attemptId, questionId, answer: value } });
  }
  const submitted = await call(examsRoute.POST, "POST", "/api/exams", { cookie: learner.cookie, body: { action: "submit", attemptId } });
  assert.equal(submitted.status, 200);
  assert.equal((submitted.json.answers as Record<string, string>)[questionId], "false");
  assert.equal((await call(examsRoute.PATCH, "PATCH", "/api/exams", { cookie: learner.cookie, body: { action: "confidence", attemptId, questionId, confidence: 5 } })).status, 400, "locked after submission");
  assert.equal((await call(examsRoute.PATCH, "PATCH", "/api/exams", { cookie: learner.cookie, body: { action: "answer", attemptId, questionId, answer: "true" } })).status, 400);

  const analytics = await call(analyticsRoute.GET, "GET", "/api/analytics", { cookie: learner.cookie });
  assert.equal(analytics.status, 200);
  assert.ok((analytics.json.examBreakdowns as Record<string, unknown>)[attemptId]);
  const revisions = await call(collectionsRoute.GET, "GET", "/api/collections/revisionSchedules", { cookie: learner.cookie, params: { collection: "revisionSchedules" } });
  assert.equal((revisions.json as unknown[]).length, 1, "a revision is scheduled from the submitted result");
});

test("revision intervals are validated and saved in settings", async () => {
  const learner = await register();
  const base = { timezone: "Asia/Dhaka", weeklyHours: 10, studyDays: ["Monday", "Wednesday"] };
  assert.equal((await call(settingsRoute.PATCH, "PATCH", "/api/settings", { cookie: learner.cookie, body: { ...base, revisionIntervalsDays: [3, 1] } })).status, 400, "must increase");
  assert.equal((await call(settingsRoute.PATCH, "PATCH", "/api/settings", { cookie: learner.cookie, body: { ...base, revisionIntervalsDays: [0, 2] } })).status, 400);
  assert.equal((await call(settingsRoute.PATCH, "PATCH", "/api/settings", { cookie: learner.cookie, body: { ...base, timezone: "Mars/Olympus" } })).status, 400);
  const saved = await call(settingsRoute.PATCH, "PATCH", "/api/settings", { cookie: learner.cookie, body: { ...base, revisionIntervalsDays: [1, 4, 10] } });
  assert.equal(saved.status, 200);
  const settings = await call(settingsRoute.GET, "GET", "/api/settings", { cookie: learner.cookie });
  assert.deepEqual(settings.json.revisionIntervalsDays, [1, 4, 10]);
  assert.equal(settings.json.timezone, "Asia/Dhaka");
});

test("roadmap changes and link checks apply only to the caller's own records", async () => {
  const alice = await register();
  const bob = await register();
  assert.equal((await call(roadmapRoute.POST, "POST", "/api/roadmap", { cookie: alice.cookie, body: { action: "move-phase", id: "phase-3", direction: "up" } })).status, 200);
  const alicePhases = await call(collectionsRoute.GET, "GET", "/api/collections/roadmapPhases", { cookie: alice.cookie, params: { collection: "roadmapPhases" } });
  const bobPhases = await call(collectionsRoute.GET, "GET", "/api/collections/roadmapPhases", { cookie: bob.cookie, params: { collection: "roadmapPhases" } });
  const order = (rows: unknown) => (rows as { id: string; order: number }[]).sort((a, b) => a.order - b.order).map((phase) => phase.id).slice(0, 3);
  assert.deepEqual(order(alicePhases.json), ["phase-1", "phase-3", "phase-2"]);
  assert.deepEqual(order(bobPhases.json), ["phase-1", "phase-2", "phase-3"]);
  assert.equal((await call(roadmapRoute.POST, "POST", "/api/roadmap", { cookie: alice.cookie, body: { action: "set-priority", id: "topic-1", priority: "urgent" } })).status, 400);

  const created = await call(collectionsRoute.POST, "POST", "/api/collections/resources", { cookie: alice.cookie, params: { collection: "resources" }, body: { title: "Internal", url: "http://127.0.0.1/admin", type: "article", phaseId: "phase-1" } });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  assert.equal(created.json.availability, "unchecked", "nothing is claimed before a check");
  assert.equal((await call(resourceCheckRoute.POST, "POST", "/api/resources/check", { cookie: bob.cookie, body: { id: created.json.id } })).status, 404);
  const check = await call(resourceCheckRoute.POST, "POST", "/api/resources/check", { cookie: alice.cookie, body: { id: created.json.id } });
  assert.equal(check.status, 200);
  assert.equal(check.json.availability, "needs-check");
  assert.match(String(check.json.detail), /Private/);
});
