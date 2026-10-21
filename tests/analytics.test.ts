import assert from "node:assert/strict";
import test from "node:test";
import type { ApplicationData, ExaminationAttempt } from "../src/lib/model";
import { applicationDataSchema, schemaVersion } from "../src/lib/model";
import { createSeedData } from "../src/lib/seed";
import { classifyGap, consistency, dashboardSeries, examBreakdown, firstAndBestScores, gapAnalysis, rewardSummary } from "../src/lib/services/analytics";
import { scheduleRevisions } from "../src/lib/services/revisions";
import { movePhase, moveTopic, setTopicPriority } from "../src/lib/services/roadmap";
import { startExamination, submitExamination } from "../src/lib/services/examinations";
import { appendMissingSamples, sampleBlueprints, sampleQuestionBank } from "../src/lib/seed-questions";
import { migrateApplicationData } from "../src/lib/storage/migrations";
import { assertPublicUrl, checkAvailability, isPublicAddress } from "../src/lib/net/url-guard";
import { createSession, transitionSession } from "../src/lib/services/timer";

function graded(data: ApplicationData, blueprintId: string, answers: (attempt: ExaminationAttempt) => Record<string, string>, startedAt: string, submittedAt: string) {
  const attempt = startExamination(data, blueprintId, startedAt, () => 0.4);
  return submitExamination({ ...attempt, answers: answers(attempt) }, submittedAt);
}
const key = (attempt: ExaminationAttempt) => Object.fromEntries(attempt.questionSnapshots.map((q) => [q.questionId, Array.isArray(q.correctAnswer) ? q.correctAnswer.join("\n") : String(q.correctAnswer ?? "")]));

test("every sample blueprint can be started and its auto-graded keys are self-consistent", () => {
  const data = createSeedData();
  assert.equal(applicationDataSchema.safeParse(data).success, true);
  assert.ok(sampleQuestionBank.every((question) => question.sample && /not independently verified/.test(question.source)));
  for (const blueprint of sampleBlueprints) {
    const attempt = graded(data, blueprint.id, key, "2026-10-19T00:00:00.000Z", "2026-10-19T00:05:00.000Z");
    if (attempt.grading === "automatic") assert.equal(attempt.scorePercent, 100, blueprint.id);
  }
  const types = new Set(sampleQuestionBank.map((question) => question.questionType));
  for (const type of ["single-choice", "multiple-select", "true-false", "fill-blank", "short-answer", "calculation", "code-reading", "predict-output", "practical", "code-writing", "correct-flawed-solution", "concept-comparison", "algorithm-design", "data-interpretation", "explanation", "case-study", "debugging", "long-answer"]) {
    assert.ok(types.has(type as never), `sample bank includes ${type}`);
  }
});

test("new question types grade correctly: numeric tolerance, predicted output, and manual review", () => {
  const data = createSeedData();
  const diagnostic = graded(data, "sample-ai-engineering-diagnostic", (attempt) => ({ ...key(attempt), "sample-q-rag-recall": "0.751", "sample-q-pytorch-shapes": "129" }), "2026-10-19T00:00:00.000Z", "2026-10-19T00:10:00.000Z");
  assert.equal(diagnostic.questionResults.find((result) => result.questionId === "sample-q-rag-recall")?.correct, true, "within tolerance");
  assert.equal(diagnostic.questionResults.find((result) => result.questionId === "sample-q-pytorch-shapes")?.correct, false);
  const python = graded(data, "sample-topic-exam-python", (attempt) => ({ ...key(attempt), "sample-q-python-optional": "None" }), "2026-10-19T00:00:00.000Z", "2026-10-19T00:10:00.000Z");
  assert.equal(python.questionResults.find((result) => result.questionId === "sample-q-python-optional")?.correct, true);
  assert.equal(python.questionResults.find((result) => result.questionId === "sample-q-python-dedupe")?.status, "manual", "code-writing is reviewed, never executed");
  assert.equal(python.grading, "manual");
});

test("examination breakdown reports counts, topics, difficulty, type, time, and improvement", () => {
  const data = createSeedData();
  const first = graded(data, "sample-retention-evaluation", () => ({ "sample-q-retention-imbalance": "false" }), "2026-10-10T00:00:00.000Z", "2026-10-10T00:12:00.000Z");
  data.examinationAttempts = [first];
  const second = graded(data, "sample-retention-evaluation", key, "2026-10-17T00:00:00.000Z", "2026-10-17T00:08:00.000Z");
  data.examinationAttempts.push(second);
  const breakdown = examBreakdown(second, data);
  assert.equal(breakdown.counts.correct, 3);
  assert.equal(breakdown.timeTakenSeconds, 480);
  assert.equal(breakdown.byTopic[0].key, "topic-2");
  assert.equal(breakdown.byTopic[0].percent, 100);
  assert.ok(breakdown.byDifficulty.some((row) => row.key === "fundamental"));
  assert.ok(breakdown.byType.some((row) => row.key === "calculation"));
  assert.equal(breakdown.previous?.attemptId, first.id);
  assert.ok(Math.abs((breakdown.improvement ?? 0) - (100 - first.scorePercent!)) < 1e-9);
  const firstBreakdown = examBreakdown(first, data);
  assert.equal(firstBreakdown.counts.unanswered, 2);
  assert.equal(firstBreakdown.improvement, null);
  const scores = firstAndBestScores(data.examinationAttempts).get("sample-retention-evaluation")!;
  assert.equal(scores.first, first.scorePercent);
  assert.equal(scores.best, 100);
  assert.equal(scores.attempts, 2);
});

test("gap analysis categorizes possible gaps from evidence and labels them as possible", () => {
  assert.equal(classifyGap({ questionType: "short-answer", difficulty: "beginner", examType: "topic", status: "unanswered", ranOutOfTime: true }), "Time management");
  assert.equal(classifyGap({ questionType: "practical", difficulty: "beginner", examType: "practical", status: "incorrect", ranOutOfTime: false }), "Practical implementation");
  assert.equal(classifyGap({ questionType: "debugging", difficulty: "beginner", examType: "topic", status: "partial", ranOutOfTime: false }), "Debugging");
  assert.equal(classifyGap({ questionType: "calculation", difficulty: "beginner", examType: "topic", status: "incorrect", ranOutOfTime: false }), "Application");
  assert.equal(classifyGap({ questionType: "short-answer", difficulty: "beginner", examType: "retention", status: "incorrect", ranOutOfTime: false }), "Recall");
  assert.equal(classifyGap({ questionType: "single-choice", difficulty: "fundamental", examType: "topic", status: "incorrect", ranOutOfTime: false }), "Fundamental knowledge");
  assert.equal(classifyGap({ questionType: "single-choice", difficulty: "intermediate", examType: "topic", status: "incorrect", ranOutOfTime: false }), "Conceptual understanding");

  const data = createSeedData();
  data.examinationAttempts = [graded(data, "sample-retention-evaluation", () => ({ "sample-q-retention-f1": "0.675" }), "2026-10-10T00:00:00.000Z", "2026-10-10T00:20:00.000Z")];
  const report = gapAnalysis(data);
  const f1 = report.items.find((item) => item.prompt.includes("F1"))!;
  assert.equal(f1.category, "Recall");
  assert.deepEqual(f1.possibleMisconceptions, ["Averaging precision and recall arithmetically (0.675)"]);
  assert.equal(f1.submittedAnswer, "0.675");
  const unanswered = report.items.filter((item) => item.status === "unanswered");
  assert.ok(unanswered.every((item) => item.category === "Time management"), "time limit (15 min) was exceeded");
  assert.equal(report.byCategory.reduce((sum, item) => sum + item.count, 0), report.items.length);
});

test("consistency excludes rest days and non-study days, and the flexible streak skips them", () => {
  const data = createSeedData();
  data.settings = { ...data.settings, timezone: "UTC", studyDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] };
  const session = (day: string) => ({ id: `s-${day}`, topicId: "topic-1", activityType: "learning" as const, plannedStartAt: null, startedAt: `${day}T09:00:00.000Z`, endedAt: `${day}T10:00:00.000Z`, stateChangedAt: null, state: "completed" as const, focusedSeconds: 3600, pausedSeconds: 0, breakSeconds: 0, plannedSeconds: 3600, notes: "", accomplishments: "", problems: "", distractions: "", manualAdjustmentNote: "", rating: null, manuallyAdjusted: false });
  // 2026-10-19 is a Monday. Study Fri 16th and Mon 19th; Thu 15th is a planned rest day; Wed 14th was studied.
  data.learningSessions = ["2026-10-14", "2026-10-16", "2026-10-19"].map(session);
  data.studyPlans = [{ id: "rest", title: "Rest", date: "2026-10-15", topicIds: [], plannedMinutes: 1, completed: false, restDay: true }];
  const result = consistency(data, new Date("2026-10-19T18:00:00.000Z"), 7);
  // Window: 13th–19th. Weekdays: 13, 14, 15 (rest), 16, 19 → 4 planned; studied 14, 16, 19 → 3.
  assert.equal(result.plannedDays, 4);
  assert.equal(result.daysWithStudy, 3);
  assert.equal(result.score, 75);
  assert.equal(result.flexibleStreak, 3, "weekend and rest day do not break the streak");
  const empty = consistency({ ...data, settings: { ...data.settings, studyDays: [] } }, new Date("2026-10-19T18:00:00.000Z"), 7);
  assert.equal(empty.plannedDays, 6, "an empty selection means every day is a study day, minus the planned rest day");
});

test("rewards: XP, level formula, and weekly challenges come from recorded events", () => {
  const data = createSeedData();
  assert.deepEqual([rewardSummary(data).xp, rewardSummary(data).level], [0, 1]);
  data.rewards = [{ id: "r1", title: "x", earnedAt: "2026-10-19T00:00:00.000Z", reason: "x", points: 95, eventId: "e1" }, { id: "r2", title: "y", earnedAt: "2026-10-19T00:00:00.000Z", reason: "y", points: 10, eventId: "e2" }];
  const summary = rewardSummary(data, new Date("2026-10-19T12:00:00.000Z"));
  assert.equal(summary.xp, 105);
  assert.equal(summary.level, 2);
  assert.equal(summary.toNextLevel, 95);
  assert.ok(summary.challenges.every((challenge) => challenge.progress === 0 && !challenge.complete));
});

test("dashboard series are empty for a new learner and reflect recorded data", () => {
  const data = createSeedData();
  const empty = dashboardSeries(data, new Date("2026-10-19T12:00:00.000Z"));
  assert.equal(empty.daily.length, 30);
  assert.ok(empty.daily.every((day) => day.focusedMinutes === 0));
  assert.deepEqual(empty.scores, []);
  assert.ok(empty.proficiency.every((row) => row.averageLevel === 0), "no invented proficiency");
  const startedAt = "2026-10-19T10:00:00.000Z";
  const review = transitionSession(createSession(data, "topic-1", 600, startedAt, "review"), "finish", "2026-10-19T10:02:00.000Z");
  const practical = transitionSession(createSession(data, "topic-2", 600, startedAt, "practical"), "finish", "2026-10-19T10:03:00.000Z");
  data.learningSessions = [review, practical];
  const classified = dashboardSeries(data, new Date("2026-10-19T12:00:00.000Z"));
  assert.equal(classified.activityBreakdown.find((item) => item.activityType === "review")?.focusedMinutes, 2);
  assert.equal(classified.activityBreakdown.find((item) => item.activityType === "practical")?.focusedMinutes, 3);
});

test("revision scheduling uses configured intervals and advances only on passes", () => {
  const data = createSeedData();
  data.settings = { ...data.settings, revisionIntervalsDays: [2, 5, 12] };
  const failed = graded(data, "sample-retention-evaluation", () => ({}), "2026-10-01T00:00:00.000Z", "2026-10-01T00:05:00.000Z");
  let schedules = scheduleRevisions(data, failed);
  assert.equal(schedules.find((item) => item.topicId === "topic-2")?.intervalDays, 2);
  const passed = graded(data, "sample-retention-evaluation", key, "2026-10-03T00:00:00.000Z", "2026-10-03T00:05:00.000Z");
  schedules = scheduleRevisions({ ...data, revisionSchedules: schedules }, passed);
  const afterPass = schedules.find((item) => item.topicId === "topic-2")!;
  assert.equal(afterPass.intervalDays, 5);
  assert.equal(afterPass.dueAt, "2026-10-08T00:05:00.000Z");
  const again = graded(data, "sample-retention-evaluation", key, "2026-10-08T00:00:00.000Z", "2026-10-08T00:05:00.000Z");
  schedules = scheduleRevisions({ ...data, revisionSchedules: schedules }, again);
  assert.equal(schedules.find((item) => item.topicId === "topic-2")?.intervalDays, 12);
  const capped = scheduleRevisions({ ...data, revisionSchedules: schedules }, { ...again, id: "another" });
  assert.equal(capped.find((item) => item.topicId === "topic-2")?.intervalDays, 12, "capped at the last interval");
  assert.equal(capped.filter((item) => item.topicId === "topic-2").length, 1);
});

test("roadmap phases and topics can be reordered and reprioritized", () => {
  const data = createSeedData();
  const moved = movePhase(data, "phase-2", "up");
  assert.deepEqual(moved.roadmapPhases.sort((a, b) => a.order - b.order).slice(0, 2).map((phase) => phase.id), ["phase-2", "phase-1"]);
  assert.deepEqual(moved.roadmapPhases.map((phase) => phase.order).sort((a, b) => a - b), Array.from({ length: 12 }, (_, index) => index + 1));
  assert.equal(movePhase(data, "phase-1", "up"), data, "first phase cannot move up");
  const phase1 = data.topics.filter((topic) => topic.phaseId === "phase-1").map((topic) => topic.id);
  const reordered = moveTopic(data, phase1[1], "up");
  assert.deepEqual(reordered.topics.filter((topic) => topic.phaseId === "phase-1").map((topic) => topic.id).slice(0, 2), [phase1[1], phase1[0]]);
  assert.equal(reordered.topics.length, data.topics.length);
  assert.throws(() => moveTopic(data, "missing", "up"));
  assert.throws(() => moveTopic(data, phase1[0], "sideways"));
  assert.equal(setTopicPriority(data, "topic-1", "low").topics[0].priority, "low");
  assert.throws(() => setTopicPriority(data, "topic-1", "urgent"));
});

test("upgrading saved data adds missing sample questions without changing saved ones", () => {
  const legacy = createSeedData() as unknown as Record<string, unknown> & ApplicationData;
  legacy.examinationQuestions = legacy.examinationQuestions.filter((question) => !question.id.startsWith("sample-q-"));
  legacy.examinationQuestions[0] = { ...legacy.examinationQuestions[0], prompt: "My edited prompt", version: 3 };
  legacy.examinationBlueprints = legacy.examinationBlueprints.filter((item) => !item.id.startsWith("sample-") || item.id === "sample-diagnostic-blueprint");
  const migrated = migrateApplicationData({ ...legacy, schemaVersion: 5 });
  assert.equal(migrated.data.schemaVersion, schemaVersion);
  assert.equal(migrated.data.examinationQuestions[0].prompt, "My edited prompt");
  assert.ok(migrated.data.examinationQuestions.some((question) => question.id === "sample-q-agent-practical"));
  assert.ok(migrated.data.examinationBlueprints.some((item) => item.id === "sample-practical-agents"));
  const again = appendMissingSamples(migrated.data);
  assert.equal(again.examinationQuestions.length, migrated.data.examinationQuestions.length, "idempotent");
});

test("the link checker refuses private, loopback, and metadata addresses, including after redirects", async () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "224.0.0.1"]) {
    assert.equal(isPublicAddress(ip), false, ip);
  }
  for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"]) assert.equal(isPublicAddress(ip), true, ip);
  await assert.rejects(assertPublicUrl("http://127.0.0.1/admin"), /Private/);
  await assert.rejects(assertPublicUrl("http://localhost:3000"), /port|Private/);
  await assert.rejects(assertPublicUrl("file:///etc/passwd"), /http/);
  await assert.rejects(assertPublicUrl("https://user:pass@8.8.8.8/"), /credentials/);
  await assert.rejects(assertPublicUrl("https://8.8.8.8:8443/"), /port/);

  const calls: string[] = [];
  const redirectToMetadata = (async (input: URL | RequestInfo) => {
    calls.push(String(input));
    return new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data" } });
  }) as typeof fetch;
  const result = await checkAvailability("https://1.1.1.1/start", redirectToMetadata);
  assert.equal(result.availability, "needs-check");
  assert.match(result.detail, /Private/);
  assert.equal(calls.length, 1, "the private redirect target is never requested");

  const ok = await checkAvailability("https://1.1.1.1/", (async () => new Response(null, { status: 200 })) as typeof fetch);
  assert.equal(ok.availability, "available");
  const gone = await checkAvailability("https://1.1.1.1/", (async () => new Response(null, { status: 404 })) as typeof fetch);
  assert.equal(gone.availability, "unavailable");
  const blocked = await checkAvailability("https://1.1.1.1/", (async () => new Response(null, { status: 403 })) as typeof fetch);
  assert.equal(blocked.availability, "needs-check", "a 403 is not reported as unavailable");
});
