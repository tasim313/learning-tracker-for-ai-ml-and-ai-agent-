import assert from "node:assert/strict";
import test from "node:test";
import type { ApplicationData, ExaminationAttempt } from "../src/lib/model";
import { createSeedData } from "../src/lib/seed";
import { createSeedCatalog } from "../src/lib/content/store";
import { buildRecommendations } from "../src/lib/services/recommendations";

const courses = Object.values(createSeedCatalog().published);
const now = new Date("2026-10-19T12:00:00.000Z");

function attempt(id: string, examType: ExaminationAttempt["examType"], topicId: string, correct: boolean, questionType: "short-answer" | "practical" = "short-answer", submittedAt = "2026-10-10T00:00:00.000Z"): ExaminationAttempt {
  return {
    id, blueprintId: "sample-diagnostic-blueprint", examType,
    questionSnapshots: [{ questionId: `q-${topicId}`, version: 1, prompt: "?", questionType, options: [], correctAnswer: "a", acceptedAnswers: [], numericTolerance: 0, explanation: "", rubric: "", maxMarks: 1, topicId, critical: false }],
    answers: {}, confidenceRatings: {}, startedAt: submittedAt, submittedAt, timeLimitMinutes: 10, passingPercent: 80,
    scorePercent: correct ? 100 : 0, marksEarned: correct ? 1 : 0, totalMarks: 1, grading: questionType === "practical" ? "manual" : "automatic",
    selfDeclaredClosedBook: false, manualGraded: questionType === "practical", result: correct ? "pass" : "not-yet-passed",
    questionResults: [{ questionId: `q-${topicId}`, answer: "x", marksEarned: correct ? 1 : 0, maxMarks: 1, correct, status: correct ? "correct" : "incorrect", feedback: "" }]
  };
}

const keys = (data: ApplicationData) => buildRecommendations({ data, courses, now }).visible.map((item) => item.key);

test("a new learner is pointed to a diagnostic and a first course, with reasons", () => {
  const result = buildRecommendations({ data: createSeedData(), courses, now });
  assert.equal(result.visible[0].key, "diagnostic:start");
  assert.ok(result.visible.some((item) => item.key.startsWith("course:")));
  for (const item of result.visible) {
    assert.ok(item.reason.length > 10, "every recommendation explains why");
    assert.ok(item.evidence.length > 0, "and lists evidence");
  }
});

test("strong theory with weak practical evidence recommends practical work", () => {
  const data = createSeedData();
  data.examinationAttempts = [attempt("a1", "topic", "topic-1", true)];
  assert.ok(keys(data).includes("practical:topic-1"));
  data.examinationAttempts.push(attempt("a2", "practical", "topic-1", true, "practical"));
  assert.ok(!keys(data).includes("practical:topic-1"), "a passing practical clears it");
});

test("strong immediate result but weak delayed recall recommends spaced repetition", () => {
  const data = createSeedData();
  data.examinationAttempts = [attempt("a1", "topic", "topic-2", true), attempt("r1", "retention", "topic-2", false, "short-answer", "2026-10-15T00:00:00.000Z")];
  const item = buildRecommendations({ data, courses, now }).visible.find((entry) => entry.key === "retention:topic-2");
  assert.ok(item);
  assert.equal(item.href, "/flashcards");
});

test("a repeatedly missed question is flagged as a possible gap, not a certain cause", () => {
  const data = createSeedData();
  data.examinationAttempts = [attempt("a1", "topic", "topic-2", false), attempt("a2", "topic", "topic-2", false, "short-answer", "2026-10-12T00:00:00.000Z")];
  const item = buildRecommendations({ data, courses, now }).visible.find((entry) => entry.key === "misconception:q-topic-2");
  assert.ok(item);
  assert.match(item.title, /Possible knowledge gap/);
  assert.match(item.reason, /may point to/);
  assert.match(item.href, /\/courses\/ai-engineering-foundations\/lessons\//, "links an alternative explanation");
});

test("diagnostic passes suggest topics that may be skipped", () => {
  const data = createSeedData();
  data.examinationAttempts = [attempt("d1", "diagnostic", "topic-3", true)];
  assert.ok(keys(data).includes("skip:topic-3"));
  assert.ok(!keys(data).includes("diagnostic:start"));
});

test("due revisions and flashcards are recommended from stored schedules", () => {
  const data = createSeedData();
  data.examinationAttempts = [attempt("a1", "topic", "topic-1", false)];
  data.revisionSchedules = [{ id: "rev-1", topicId: "topic-1", dueAt: "2026-10-18T00:00:00.000Z", intervalDays: 1, lastScorePercent: 0, sourceAttemptId: "a1" }];
  data.flashcards = [{ id: "c1", front: "f", back: "b", topicId: null, source: "", stage: 0, dueAt: "2026-10-19T00:00:00.000Z", createdAt: "2026-10-01T00:00:00.000Z", suspended: false, reviews: [] }];
  const result = keys(data);
  assert.ok(result.includes("revision:rev-1"));
  assert.ok(result.includes("flashcards:due"));
});

test("learner overrides dismiss, snooze until a date, and pin", () => {
  const data = createSeedData();
  data.recommendationOverrides = [
    { id: "o1", recommendationKey: "diagnostic:start", action: "dismissed", until: null, reason: "", createdAt: now.toISOString() },
    { id: "o2", recommendationKey: "topic:topic-1", action: "pinned", until: null, reason: "", createdAt: now.toISOString() }
  ];
  const result = buildRecommendations({ data, courses, now });
  assert.ok(!result.visible.some((item) => item.key === "diagnostic:start"));
  assert.ok(result.hidden.some((item) => item.key === "diagnostic:start"));
  assert.equal(result.visible[0].key, "topic:topic-1", "pinned items come first");

  data.recommendationOverrides = [{ id: "o3", recommendationKey: "diagnostic:start", action: "snoozed", until: "2026-10-18T00:00:00.000Z", reason: "", createdAt: now.toISOString() }];
  assert.ok(keys(data).includes("diagnostic:start"), "an expired snooze shows the item again");
});

test("time spent and lesson completion alone never produce mastery-style recommendations", () => {
  const data = createSeedData();
  data.learningSessions = [{ id: "s1", topicId: "topic-1", plannedStartAt: null, startedAt: "2026-10-01T00:00:00.000Z", endedAt: "2026-10-01T10:00:00.000Z", stateChangedAt: null, state: "completed", focusedSeconds: 36000, pausedSeconds: 0, breakSeconds: 0, plannedSeconds: 3600, notes: "", accomplishments: "", problems: "", distractions: "", manualAdjustmentNote: "", rating: 5, manuallyAdjusted: false }];
  const result = keys(data);
  assert.ok(!result.some((key) => key.startsWith("skip:")));
  assert.ok(!result.some((key) => key.startsWith("practical:")));
});
