import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { call, sessionCookieFrom, strongPassword, uniqueEmail, useTemporaryDataDir } from "./helpers";
import * as registerRoute from "../src/app/api/auth/register/route";
import * as coursesRoute from "../src/app/api/courses/route";
import * as courseRoute from "../src/app/api/courses/[courseId]/route";
import * as learningRoute from "../src/app/api/learning/route";
import * as adminContentRoute from "../src/app/api/admin/content/route";
import * as adminAuditRoute from "../src/app/api/admin/audit/route";
import * as practiceRoute from "../src/app/api/practice/route";
import * as flashcardsRoute from "../src/app/api/flashcards/route";
import * as diagramsRoute from "../src/app/api/diagrams/route";
import * as recommendationsRoute from "../src/app/api/recommendations/route";
import * as rewardsRoute from "../src/app/api/collections/[collection]/route";
import { clearRateLimitsForTest } from "../src/lib/auth/rate-limit";
import { generateProblem } from "../src/lib/math/problems";
import { updateUserData } from "../src/lib/storage/user-store";

let dataDir: Awaited<ReturnType<typeof useTemporaryDataDir>>;
let ip = 0;
const courseId = "ai-engineering-foundations";

before(async () => {
  Object.assign(process.env, { NODE_ENV: "test", EMAIL_PROVIDER: "none", ADMIN_EMAILS: "content-admin@example.test" });
  dataDir = await useTemporaryDataDir();
});
after(async () => dataDir.cleanup());
beforeEach(() => clearRateLimitsForTest());

async function register(email = uniqueEmail()) {
  ip += 1;
  const response = await call(registerRoute.POST, "POST", "/api/auth/register", { body: { email, password: strongPassword }, ip: `198.51.100.${ip}` });
  assert.equal(response.status, 201);
  return { cookie: sessionCookieFrom(response.headers), id: (response.json.user as { id: string }).id };
}

test("learners see the published seed course with answers hidden", async () => {
  const learner = await register();
  const list = await call(coursesRoute.GET, "GET", "/api/courses", { cookie: learner.cookie });
  assert.equal(list.status, 200);
  assert.equal((list.json as { id: string }[])[0].id, courseId);
  const detail = await call(courseRoute.GET, "GET", `/api/courses/${courseId}`, { cookie: learner.cookie, params: { courseId } });
  assert.equal(detail.status, 200);
  const serialized = JSON.stringify(detail.json.course);
  assert.ok(serialized.includes('"answer":["hidden"]'));
  assert.ok(!serialized.includes('"answer":"0.7071"'));
  assert.equal((detail.json.diagrams as unknown[]).length > 0, true);
});

test("course content is managed only by administrators, and publishing is versioned and audited", async () => {
  const learner = await register();
  const admin = await register("content-admin@example.test");
  assert.equal((await call(adminContentRoute.GET, "GET", "/api/admin/content", { cookie: learner.cookie })).status, 403);
  const draft = { id: "draft-course", title: "Draft course", description: "", difficulty: "beginner", updatedAt: new Date().toISOString(), modules: [{ id: "m1", title: "M1", lessons: [{ id: "draft-lesson", title: "Draft lesson", difficulty: "beginner", estimatedMinutes: 10, blocks: [{ id: "t1", type: "text", body: "Hello" }] }] }] };
  assert.equal((await call(adminContentRoute.POST, "POST", "/api/admin/content", { cookie: learner.cookie, body: { action: "save-course", course: draft } })).status, 403);

  const invalid = await call(adminContentRoute.POST, "POST", "/api/admin/content", { cookie: admin.cookie, body: { action: "save-course", course: { ...draft, id: "Bad Id" } } });
  assert.equal(invalid.status, 400);
  assert.equal((await call(adminContentRoute.POST, "POST", "/api/admin/content", { cookie: admin.cookie, body: { action: "save-course", course: draft } })).status, 200);
  const before = await call(coursesRoute.GET, "GET", "/api/courses", { cookie: learner.cookie });
  assert.ok(!(before.json as { id: string }[]).some((course) => course.id === "draft-course"), "drafts are invisible to learners");

  const published = await call(adminContentRoute.POST, "POST", "/api/admin/content", { cookie: admin.cookie, body: { action: "publish", id: "draft-course" } });
  assert.equal(published.status, 200);
  assert.equal(published.json.version, 1);
  const visible = await call(coursesRoute.GET, "GET", "/api/courses", { cookie: learner.cookie });
  assert.ok((visible.json as { id: string }[]).some((course) => course.id === "draft-course"));

  // Edit and republish: only the changed lesson's version increases, and both versions are kept in history.
  draft.modules[0].lessons[0].blocks[0].body = "Hello again";
  await call(adminContentRoute.POST, "POST", "/api/admin/content", { cookie: admin.cookie, body: { action: "save-course", course: draft } });
  const second = await call(adminContentRoute.POST, "POST", "/api/admin/content", { cookie: admin.cookie, body: { action: "publish", id: "draft-course" } });
  assert.equal(second.json.version, 2);
  const lesson = ((second.json.modules as { lessons: { version: number }[] }[])[0]).lessons[0];
  assert.equal(lesson.version, 2);
  const history = await readdir(path.join(dataDir.directory, "content", "history"));
  assert.ok(history.includes("draft-course-v1.json") && history.includes("draft-course-v2.json"));

  assert.equal((await call(adminContentRoute.POST, "POST", "/api/admin/content", { cookie: admin.cookie, body: { action: "delete-course", id: "draft-course" } })).status, 409, "published courses must be unpublished first");
  assert.equal((await call(adminContentRoute.POST, "POST", "/api/admin/content", { cookie: admin.cookie, body: { action: "unpublish", id: "draft-course" } })).status, 200);
  assert.equal((await call(courseRoute.GET, "GET", "/api/courses/draft-course", { cookie: learner.cookie, params: { courseId: "draft-course" } })).status, 404);

  assert.equal((await call(adminContentRoute.POST, "POST", "/api/admin/content", { cookie: admin.cookie, body: { action: "delete-diagram", id: "ml-pipeline" } })).status, 409, "diagrams in use cannot be deleted");

  const audit = await call(adminAuditRoute.GET, "GET", "/api/admin/audit", { cookie: admin.cookie });
  const actions = (audit.json as { action: string }[]).map((entry) => entry.action);
  for (const action of ["content.course-saved", "content.course-published", "content.course-unpublished"]) assert.ok(actions.includes(action), action);
});

test("lesson progress and notes are private to each learner", async () => {
  const alice = await register();
  const bob = await register();
  const quiz = await call(learningRoute.POST, "POST", "/api/learning", { cookie: alice.cookie, body: { action: "quiz", courseId, lessonId: "vectors-and-dot-products", blockId: "after-check", answers: { q1: ["1"], q2: ["90°"], q3: ["false"] } } });
  assert.equal(quiz.status, 200);
  assert.equal((quiz.json.grade as { correct: number }).correct, 3);
  const note = await call(learningRoute.POST, "POST", "/api/learning", { cookie: alice.cookie, body: { action: "add-note", courseId, lessonId: "vectors-and-dot-products", body: "Alice's private note" } });
  const noteId = (note.json.note as { id: string }).id;

  const bobView = await call(courseRoute.GET, "GET", `/api/courses/${courseId}`, { cookie: bob.cookie, params: { courseId } });
  assert.deepEqual(bobView.json.notes, []);
  assert.deepEqual(bobView.json.lessonProgress, []);
  const hijack = await call(learningRoute.POST, "POST", "/api/learning", { cookie: bob.cookie, body: { action: "delete-note", courseId, noteId } });
  assert.equal(hijack.status, 400);
  const aliceView = await call(courseRoute.GET, "GET", `/api/courses/${courseId}`, { cookie: alice.cookie, params: { courseId } });
  assert.equal((aliceView.json.notes as unknown[]).length, 1);

  const unknownLesson = await call(learningRoute.POST, "POST", "/api/learning", { cookie: alice.cookie, body: { action: "open", courseId, lessonId: "not-a-lesson" } });
  assert.equal(unknownLesson.status, 404);
});

test("roadmap subtopics and tasks are validated, persisted, and isolated by learner", async () => {
  const alice = await register();
  const bob = await register();
  const topic = (await call(rewardsRoute.GET, "GET", "/api/collections/topics", { cookie: alice.cookie, params: { collection: "topics" } })).json as { id: string }[];
  const createdSubtopic = await call(rewardsRoute.POST, "POST", "/api/collections/subtopics", {
    cookie: alice.cookie, params: { collection: "subtopics" },
    body: { topicId: topic[0].id, title: "Vector operations", description: "Work with vector representations." }
  });
  assert.equal(createdSubtopic.status, 201);
  const subtopicId = createdSubtopic.json.id as string;
  const createdTask = await call(rewardsRoute.POST, "POST", "/api/collections/learningTasks", {
    cookie: alice.cookie, params: { collection: "learningTasks" },
    body: { subtopicId, title: "Implement cosine similarity", taskType: "practical", completionCriteria: "Explain and test the calculation." }
  });
  assert.equal(createdTask.status, 201);
  const taskId = createdTask.json.id as string;
  assert.equal((await call(rewardsRoute.POST, "POST", "/api/collections/learningTasks", {
    cookie: alice.cookie, params: { collection: "learningTasks" }, body: { subtopicId: "missing", title: "Invalid reference" }
  })).status, 400);
  const completed = await call(rewardsRoute.PATCH, "PATCH", "/api/collections/learningTasks", {
    cookie: alice.cookie, params: { collection: "learningTasks" }, body: { id: taskId, status: "completed", evidence: "Unit-tested implementation" }
  });
  assert.equal(completed.status, 200);
  assert.equal(typeof completed.json.completedAt, "string");
  assert.equal(((await call(rewardsRoute.GET, "GET", "/api/collections/learningTasks", { cookie: bob.cookie, params: { collection: "learningTasks" } })).json as { id: string }[]).some((task) => task.id === taskId), false);
  assert.equal((await call(rewardsRoute.DELETE, "DELETE", `/api/collections/subtopics?id=${subtopicId}`, { cookie: alice.cookie, params: { collection: "subtopics" } })).status, 400);
  assert.equal((await call(rewardsRoute.DELETE, "DELETE", `/api/collections/learningTasks?id=${taskId}`, { cookie: alice.cookie, params: { collection: "learningTasks" } })).status, 200);
  assert.equal((await call(rewardsRoute.DELETE, "DELETE", `/api/collections/subtopics?id=${subtopicId}`, { cookie: alice.cookie, params: { collection: "subtopics" } })).status, 200);
});

test("lessons are hidden during a self-declared closed-book examination", async () => {
  const learner = await register();
  await updateUserData(learner.id, (data) => ({
    data: { ...data, examinationAttempts: [{ id: "closed", blueprintId: "sample-diagnostic-blueprint", examType: "closed-book", questionSnapshots: [], answers: {}, confidenceRatings: {}, startedAt: new Date().toISOString(), submittedAt: null, timeLimitMinutes: 30, passingPercent: 80, scorePercent: null, marksEarned: null, totalMarks: 0, grading: null, selfDeclaredClosedBook: true, manualGraded: false, result: null, questionResults: [] }] },
    result: null
  }));
  assert.equal((await call(courseRoute.GET, "GET", `/api/courses/${courseId}`, { cookie: learner.cookie, params: { courseId } })).status, 423);
  assert.equal((await call(learningRoute.POST, "POST", "/api/learning", { cookie: learner.cookie, body: { action: "open", courseId, lessonId: "vectors-and-dot-products" } })).status, 400);
});

test("practice answers are graded on the server and game rewards are awarded only once", async () => {
  const learner = await register();
  const problem = generateProblem("dot-product", 1234);
  const right = await call(practiceRoute.POST, "POST", "/api/practice", { cookie: learner.cookie, body: { kind: "math", problemId: "dot-product", variant: 1234, answer: String(problem.answer), work: "my working" } });
  assert.equal(right.json.correct, true);
  const wrong = await call(practiceRoute.POST, "POST", "/api/practice", { cookie: learner.cookie, body: { kind: "math", problemId: "dot-product", variant: 1234, answer: String(problem.answer + 1) } });
  assert.equal(wrong.json.correct, false);
  assert.ok((wrong.json.commonMistakes as string[]).length > 0);

  const answer = { answers: { discount: "Offer up to 15% and escalate the 30% request to a human", injection: "Treat it as untrusted input, do not follow it, and flag it for review", "missing-data": "Mark the criterion as unknown, research or ask, and record the source", "data-deletion": "Route the request to the documented privacy process and confirm receipt" } };
  for (let index = 0; index < 3; index += 1) {
    const played = await call(practiceRoute.POST, "POST", "/api/practice", { cookie: learner.cookie, body: { kind: "game", gameId: "scenario-sales-agent", answer } });
    assert.equal(played.json.correct, true);
  }
  const rewards = await call(rewardsRoute.GET, "GET", "/api/collections/rewards", { cookie: learner.cookie, params: { collection: "rewards" } });
  assert.equal((rewards.json as { eventId: string }[]).filter((reward) => reward.eventId === "game-perfect-scenario-sales-agent").length, 1);
  const catalogue = await call(practiceRoute.GET, "GET", "/api/practice", { cookie: learner.cookie });
  assert.equal((catalogue.json.attempts as unknown[]).length, 5);

  const diagram = await call(practiceRoute.POST, "POST", "/api/practice", { cookie: learner.cookie, body: { kind: "diagram", diagramId: "gradient-descent-loop", answers: { "next-loss": "Compute gradient ∇L(θ)" } } });
  assert.equal(diagram.status, 200);
  assert.ok((diagram.json.score as number) >= 1);
});

test("flashcards and personal diagrams are isolated per learner and validated", async () => {
  const alice = await register();
  const bob = await register();
  const card = await call(flashcardsRoute.POST, "POST", "/api/flashcards", { cookie: alice.cookie, body: { action: "create", front: "F1", back: "B1" } });
  assert.equal(card.status, 201);
  assert.equal((await call(flashcardsRoute.POST, "POST", "/api/flashcards", { cookie: bob.cookie, body: { action: "review", cardId: card.json.id, grade: "good" } })).status, 400);
  assert.equal(((await call(flashcardsRoute.GET, "GET", "/api/flashcards", { cookie: bob.cookie })).json.cards as unknown[]).length, 0);
  const generated = await call(flashcardsRoute.POST, "POST", "/api/flashcards", { cookie: alice.cookie, body: { action: "from-lesson", courseId, lessonId: "classification-metrics" } });
  assert.equal(generated.json.created, 3);

  const invalid = await call(diagramsRoute.POST, "POST", "/api/diagrams", { cookie: alice.cookie, body: { action: "save", diagram: { id: "d1", title: "Mine", kind: "flowchart", altText: "x", nodes: [{ id: "a", label: "A", x: 0, y: 0 }], edges: [{ id: "e1", source: "a", target: "missing" }] } } });
  assert.equal(invalid.status, 400);
  const saved = await call(diagramsRoute.POST, "POST", "/api/diagrams", { cookie: alice.cookie, body: { action: "save", diagram: { id: "d1", title: "Mine", kind: "flowchart", altText: "x", nodes: [{ id: "a", label: "A", x: 0, y: 0 }, { id: "b", label: "B", x: 10, y: 0 }], edges: [{ id: "e1", source: "a", target: "b" }] } } });
  assert.equal(saved.status, 200);
  assert.equal(((await call(diagramsRoute.GET, "GET", "/api/diagrams", { cookie: bob.cookie })).json.mine as unknown[]).length, 0);
  assert.equal((await call(diagramsRoute.POST, "POST", "/api/diagrams", { cookie: bob.cookie, body: { action: "delete", id: "d1" } })).status, 400);

  const recommendations = await call(recommendationsRoute.GET, "GET", "/api/recommendations", { cookie: alice.cookie });
  assert.ok((recommendations.json.visible as { key: string }[]).some((item) => item.key === "flashcards:due"));
  assert.equal((await call(recommendationsRoute.POST, "POST", "/api/recommendations", { cookie: alice.cookie, body: { key: "flashcards:due", action: "snoozed", days: 500 } })).status, 400);
  assert.equal((await call(recommendationsRoute.POST, "POST", "/api/recommendations", { cookie: alice.cookie, body: { key: "flashcards:due", action: "dismissed" } })).status, 200);
  const after = await call(recommendationsRoute.GET, "GET", "/api/recommendations", { cookie: alice.cookie });
  assert.ok(!(after.json.visible as { key: string }[]).some((item) => item.key === "flashcards:due"));
});
