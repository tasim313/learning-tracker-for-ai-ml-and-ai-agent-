import assert from "node:assert/strict";
import test from "node:test";
import type { ApplicationData, ExaminationAttempt } from "../src/lib/model";
import { completionStreak, focusedMinutesByDay, timeEstimationAccuracy } from "../src/lib/calculations/time";
import { competencyReadiness } from "../src/lib/services/competency";
import { gradeManualQuestions, startExamination, submitExamination } from "../src/lib/services/examinations";
import { recordRewardEvent } from "../src/lib/services/rewards";
import { createSession, transitionSession } from "../src/lib/services/timer";
import { createSeedData } from "../src/lib/seed";
import { migrateApplicationData } from "../src/lib/storage/migrations";

function examData(questionType: "multiple-select" | "short-answer" | "calculation", critical = false): ApplicationData {
  const data = createSeedData();
  data.examinationQuestions = [{
    id: "test-question",
    version: 1,
    topicId: "topic-1",
    prompt: "Test prompt",
    questionType,
    difficulty: "fundamental",
    critical,
    objective: "Test objective",
    options: questionType === "multiple-select" ? ["A", "B", "C"] : [],
    correctAnswer: questionType === "multiple-select" ? ["A", "B"] : questionType === "calculation" ? 10 : null,
    acceptedAnswers: [],
    numericTolerance: questionType === "calculation" ? 0.5 : 0,
    explanation: "Test explanation",
    misconceptions: [],
    rubric: "Award marks for supported evidence.",
    maxMarks: 2,
    suggestedMinutes: 2,
    source: "Unit test",
    sample: false,
    active: true,
    createdAt: "2026-10-19T00:00:00.000Z",
    updatedAt: "2026-10-19T00:00:00.000Z"
  }];
  data.examinationBlueprints = [{
    id: "test-blueprint",
    title: "Test blueprint",
    examType: questionType === "short-answer" ? "practical" : "topic",
    topicIds: ["topic-1"],
    questionIds: ["test-question"],
    questionCount: 1,
    learningObjectives: ["Test objective"],
    difficultyDistribution: { fundamental: 1 },
    questionTypes: [questionType],
    retakePolicy: "unrestricted",
    retakeCooldownHours: 24,
    timeLimitMinutes: 10,
    passingPercent: 50,
    difficulty: "fundamental",
    allowedMaterials: "",
    practicalRequirements: "",
    active: true
  }];
  return data;
}

test("exam blueprints honor question type, difficulty distribution, and snapshots", () => {
  const data = examData("multiple-select", true);
  const attempt = startExamination(data, "test-blueprint", "2026-10-19T10:00:00.000Z", () => 0);
  assert.deepEqual(attempt.questionSnapshots.map(({ questionId }) => questionId), ["test-question"]);
  assert.equal(attempt.questionSnapshots[0].critical, true);
  assert.equal(attempt.questionSnapshots[0].correctAnswer instanceof Array, true);
});

test("retakes use unused questions when available and enforce a configured cooldown", () => {
  const data = examData("multiple-select");
  data.examinationQuestions.push({ ...data.examinationQuestions[0], id: "test-question-2", prompt: "Retake prompt" });
  data.examinationBlueprints[0].questionCount = 1;
  data.examinationBlueprints[0].questionIds.push("test-question-2");
  const first = startExamination(data, "test-blueprint", "2026-10-19T10:00:00.000Z", () => 0);
  const completed = submitExamination(first, "2026-10-19T10:05:00.000Z");
  data.examinationAttempts.push(completed);
  data.examinationBlueprints[0].retakePolicy = "cooldown";
  data.examinationBlueprints[0].retakeCooldownHours = 24;
  assert.throws(() => startExamination(data, "test-blueprint", "2026-10-19T11:00:00.000Z"), /after 24 hours/);
  data.examinationBlueprints[0].retakePolicy = "unrestricted";
  const retake = startExamination(data, "test-blueprint", "2026-10-19T11:00:00.000Z", () => 0);
  assert.notEqual(retake.questionSnapshots[0].questionId, first.questionSnapshots[0].questionId);
});

test("question snapshots preserve versions and incomplete submissions record unanswered items", () => {
  const data = examData("multiple-select");
  const attempt = startExamination(data, "test-blueprint", "2026-10-19T10:00:00.000Z", () => 0);
  data.examinationQuestions[0].version = 2;
  data.examinationQuestions[0].correctAnswer = ["B", "C"];
  const submitted = submitExamination(attempt, "2026-10-19T10:01:00.000Z");
  assert.equal(submitted.questionSnapshots[0].version, 1);
  assert.equal(submitted.questionSnapshots[0].correctAnswer instanceof Array, true);
  assert.equal(submitted.questionResults[0].status, "unanswered");
  assert.equal(submitted.questionResults[0].marksEarned, 0);
});

test("multiple-select partial credit is recorded and critical misses prevent passing", () => {
  const data = examData("multiple-select", true);
  const started = startExamination(data, "test-blueprint", "2026-10-19T10:00:00.000Z", () => 0);
  const submitted = submitExamination({ ...started, answers: { "test-question": "A" } }, "2026-10-19T10:01:00.000Z");
  assert.equal(submitted.questionResults[0].status, "partial");
  assert.equal(submitted.marksEarned, 1);
  assert.equal(submitted.result, "not-yet-passed");
});

test("manual grading requires evidence, finalizes once, and critical questions gate the result", () => {
  const data = examData("short-answer", true);
  const started = startExamination(data, "test-blueprint", "2026-10-19T10:00:00.000Z", () => 0);
  const submitted = submitExamination({ ...started, answers: { "test-question": "A reasoned answer" } }, "2026-10-19T10:01:00.000Z");
  assert.equal(submitted.grading, "manual");
  const graded = gradeManualQuestions(submitted, { "test-question": { marksEarned: 1, feedback: "Partial evidence; explain the limitation." } });
  assert.equal(graded.manualGraded, true);
  assert.equal(graded.questionResults[0].status, "partial");
  assert.equal(graded.result, "not-yet-passed");
  assert.throws(() => gradeManualQuestions(graded, {}), /finalized and immutable/);
});

test("calculation grading honors numeric tolerance", () => {
  const data = examData("calculation");
  const started = startExamination(data, "test-blueprint", "2026-10-19T10:00:00.000Z", () => 0);
  const submitted = submitExamination({ ...started, answers: { "test-question": "10.4" } });
  assert.equal(submitted.questionResults[0].correct, true);
  assert.equal(submitted.marksEarned, 2);
});

test("timer transitions account for focus, pause, and break time from timestamps", () => {
  const data = createSeedData();
  const started = createSession(data, "topic-1", 3600, "2026-10-19T10:00:00.000Z");
  const paused = transitionSession(started, "pause", "2026-10-19T10:05:00.000Z");
  const resumed = transitionSession(paused, "resume", "2026-10-19T10:08:00.000Z");
  const onBreak = transitionSession(resumed, "break", "2026-10-19T10:10:00.000Z");
  const afterBreak = transitionSession(onBreak, "resume-break", "2026-10-19T10:20:00.000Z");
  const completed = transitionSession(afterBreak, "finish", "2026-10-19T10:25:00.000Z");
  assert.equal(completed.focusedSeconds, 12 * 60);
  assert.equal(completed.pausedSeconds, 3 * 60);
  assert.equal(completed.breakSeconds, 10 * 60);
  assert.equal(completed.state, "completed");
});

test("time accuracy, daily focus, and streak calculations use recorded sessions only", () => {
  const data = createSeedData();
  data.learningSessions.push({
    id: "completed-session",
    topicId: "topic-1",
    activityType: "learning",
    plannedStartAt: null,
    startedAt: "2026-10-19T10:00:00.000Z",
    endedAt: "2026-10-19T10:30:00.000Z",
    stateChangedAt: null,
    state: "completed",
    focusedSeconds: 1800,
    pausedSeconds: 0,
    breakSeconds: 0,
    plannedSeconds: 3600,
    notes: "",
    accomplishments: "",
    problems: "",
    distractions: "",
    manualAdjustmentNote: "",
    rating: null,
    manuallyAdjusted: false
  });
  assert.equal(timeEstimationAccuracy(60, 90), 50);
  assert.equal(timeEstimationAccuracy(0, 90), null);
  assert.deepEqual(focusedMinutesByDay(data, 1, new Date("2026-10-19T12:00:00.000Z")), [{ date: "2026-10-19", minutes: 30 }]);
  assert.equal(completionStreak(data, new Date("2026-10-19T12:00:00.000Z")), 1);
});

function evidenceAttempt(id: string, examType: ExaminationAttempt["examType"], correct: boolean, manualGraded = false): ExaminationAttempt {
  return {
    id,
    blueprintId: "evidence-blueprint",
    examType,
    questionSnapshots: [{
      questionId: `${id}-question`,
      version: 1,
      prompt: "Evidence prompt",
      questionType: examType === "practical" ? "practical" : "single-choice",
      options: [],
      correctAnswer: "yes",
      acceptedAnswers: [],
      numericTolerance: 0,
      explanation: "",
      rubric: "",
      maxMarks: 1,
      topicId: "topic-1",
      critical: true
    }],
    answers: {}, confidenceRatings: {},
    startedAt: "2026-10-01T10:00:00.000Z",
    submittedAt: "2026-10-01T10:10:00.000Z",
    timeLimitMinutes: 20,
    passingPercent: 80,
    scorePercent: correct ? 100 : 0,
    marksEarned: correct ? 1 : 0,
    totalMarks: 1,
    grading: examType === "practical" ? "manual" : "automatic",
    selfDeclaredClosedBook: false,
    manualGraded,
    result: correct ? "pass" : "not-yet-passed",
    questionResults: [{
      questionId: `${id}-question`,
      answer: correct ? "yes" : "no",
      marksEarned: correct ? 1 : 0,
      maxMarks: 1,
      correct,
      status: correct ? "correct" : "incorrect",
      feedback: ""
    }]
  };
}

test("competency requires topic, practical, and two delayed-retention passes", () => {
  const data = createSeedData();
  data.examinationAttempts = [evidenceAttempt("topic-pass", "topic", true)];
  assert.equal(competencyReadiness(data, "topic-1").level, "Developing");
  data.examinationAttempts.push(evidenceAttempt("practical-pass", "practical", true, true));
  assert.equal(competencyReadiness(data, "topic-1").level, "Competent");
  data.examinationAttempts.push(evidenceAttempt("retention-one", "retention", true));
  assert.equal(competencyReadiness(data, "topic-1").level, "Proficient");
  data.examinationAttempts.push(evidenceAttempt("retention-two", "retention", true));
  assert.equal(competencyReadiness(data, "topic-1").level, "Mastered");
});

test("critical-question failures block competency despite a high percentage", () => {
  const data = createSeedData();
  const attempt = evidenceAttempt("critical-failure", "topic", false);
  for (let index = 0; index < 9; index += 1) {
    const questionId = `noncritical-${index}`;
    attempt.questionSnapshots.push({
      questionId,
      version: 1,
      prompt: "Non-critical question",
      questionType: "single-choice",
      options: [],
      correctAnswer: "yes",
      acceptedAnswers: [],
      numericTolerance: 0,
      explanation: "",
      rubric: "",
      maxMarks: 1,
      topicId: "topic-1",
      critical: false
    });
    attempt.questionResults.push({
      questionId,
      answer: "yes",
      marksEarned: 1,
      maxMarks: 1,
      correct: true,
      status: "correct",
      feedback: ""
    });
  }
  attempt.marksEarned = 9;
  attempt.totalMarks = 10;
  attempt.scorePercent = 90;
  data.examinationAttempts = [attempt];
  assert.equal(competencyReadiness(data, "topic-1").level, "Needs Practice");
});

test("reward events and milestone achievements are idempotent", () => {
  const data = createSeedData();
  const event = {
    eventId: "project-completed-test",
    title: "Project milestone completed",
    reason: "Completed a verified project.",
    points: 20,
    earnedAt: "2026-10-19T10:00:00.000Z",
    achievement: { id: "achievement-first-project", title: "First project milestone completed" }
  };
  const first = recordRewardEvent(data, event);
  const second = recordRewardEvent({ ...data, ...first }, event);
  assert.equal(second.rewards.length, 1);
  assert.equal(second.achievements.length, 1);
});

test("schema version one migration preserves submitted attempt history", () => {
  const seed = createSeedData();
  const migrated = migrateApplicationData({
    ...seed,
    schemaVersion: 1,
    examinationAttempts: [{
      id: "legacy-attempt",
      questionId: "sample-question-python-types",
      answer: "int",
      startedAt: "2026-10-01T10:00:00.000Z",
      submittedAt: "2026-10-01T10:05:00.000Z",
      scorePercent: 100
    }]
  });
  assert.equal(migrated.migrated, true);
  assert.equal(migrated.data.examinationAttempts[0].id, "legacy-attempt");
  assert.equal(migrated.data.examinationAttempts[0].answers["sample-question-python-types"], "int");
  assert.equal(migrated.data.examinationAttempts[0].scorePercent, 100);
});

test("schema version two migration adds blank workbook-derived tracking collections without changing records", () => {
  const seed = createSeedData();
  const versionTwo: Record<string, unknown> = { ...seed, schemaVersion: 2 };
  delete versionTwo.experiments;
  delete versionTwo.opportunities;
  const migrated = migrateApplicationData(versionTwo);
  assert.equal(migrated.migrated, true);
  assert.equal(migrated.data.topics.length, seed.topics.length);
  assert.deepEqual(migrated.data.experiments, []);
  assert.deepEqual(migrated.data.opportunities, []);
});

test("schema version six migration adds roadmap subtopics and tasks without inventing learner activity", () => {
  const seed = createSeedData();
  const legacy: Record<string, unknown> = { ...seed, schemaVersion: 6 };
  delete legacy.subtopics;
  delete legacy.learningTasks;
  const migrated = migrateApplicationData(legacy);
  assert.equal(migrated.migrated, true);
  assert.equal(migrated.data.subtopics.length, seed.topics.length * 2);
  assert.equal(migrated.data.learningTasks.length, seed.topics.length * 3);
  assert.equal(migrated.data.learningTasks.some((task) => task.taskType === "practical"), true);
  assert.deepEqual(migrated.data.learningTasks.map((task) => task.status).filter((status) => status === "completed"), []);
  assert.deepEqual(migrated.data.learningSessions, []);
  assert.deepEqual(migrated.data.examinationAttempts, []);
});

test("schema version seven migration defaults session activity without changing durations", () => {
  const seed = createSeedData();
  const session = createSession(seed, "topic-1", 900, "2026-10-19T09:00:00.000Z");
  const versionSevenSession = Object.fromEntries(Object.entries(session).filter(([key]) => key !== "activityType"));
  const migrated = migrateApplicationData({ ...seed, schemaVersion: 7, learningSessions: [versionSevenSession] });
  assert.equal(migrated.data.learningSessions[0].activityType, "learning");
  assert.equal(migrated.data.learningSessions[0].plannedSeconds, 900);
});

test("empty version one workspace receives the workbook catalog during migration", () => {
  const seed = createSeedData();
  const legacy = { ...seed, schemaVersion: 1, topics: [], resources: [] };
  const migrated = migrateApplicationData(legacy);
  assert.equal(migrated.data.topics.length, 48);
  assert.equal(migrated.data.resources.length, seed.resources.length);
  assert.deepEqual(migrated.data.learningSessions, []);
  assert.deepEqual(migrated.data.experiments, []);
});

test("version three migration adds missing curated resources without overwriting saved resources", () => {
  const seed = createSeedData();
  const savedResources = seed.resources.slice(0, 25).map((resource) => ({ ...resource, notes: "My saved annotation" }));
  const legacy = { ...seed, schemaVersion: 3, resources: savedResources };
  const migrated = migrateApplicationData(legacy);
  assert.equal(migrated.migrated, true);
  assert.equal(migrated.data.resources.length, seed.resources.length);
  assert.equal(migrated.data.resources.find(({ id }) => id === savedResources[0].id)?.notes, "My saved annotation");
  assert.equal(migrated.data.resources.filter(({ type }) => type === "slide").length, 2);
});
