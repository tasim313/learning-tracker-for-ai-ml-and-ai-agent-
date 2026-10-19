import { z } from "zod";

export const schemaVersion = 6;

const id = z.string().min(1);
const timestamp = z.string().datetime();
const percent = z.number().min(0).max(100);

export const roadmapPhaseSchema = z.object({
  id,
  order: z.number().int().positive(),
  title: z.string().min(1),
  summary: z.string().min(1),
  status: z.enum(["not-started", "in-progress", "completed"]),
  estimatedHours: z.number().nonnegative()
});

export const topicSchema = z.object({
  id,
  phaseId: id,
  subject: z.string().min(1).default("General"),
  title: z.string().min(1),
  description: z.string().default(""),
  objectives: z.array(z.string()).default([]),
  prerequisites: z.array(id).default([]),
  difficulty: z.enum(["fundamental", "beginner", "intermediate", "advanced"]).default("beginner"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  estimatedMinutes: z.number().int().nonnegative().default(60),
  practicalExercise: z.string().default(""),
  deliverable: z.string().default(""),
  completionCriteria: z.string().default(""),
  practicalRequired: z.boolean().default(false),
  status: z.enum(["backlog", "not-started", "ready-to-learn", "in-progress", "needs-practice", "needs-revision", "blocked", "completed"]),
  confidence: z.number().int().min(1).max(5).nullable()
});

export const resourceSchema = z.object({
  id,
  title: z.string().min(1),
  url: z.string().url(),
  type: z.enum(["documentation", "course", "paper", "tutorial", "book", "video", "audio", "slide", "practice", "repository", "dataset", "article", "api"]),
  phaseId: id,
  topicIds: z.array(id).default([]),
  difficulty: z.enum(["fundamental", "beginner", "intermediate", "advanced"]).default("beginner"),
  estimatedMinutes: z.number().int().nonnegative().default(0),
  status: z.enum(["to-study", "in-progress", "completed", "reference"]).default("to-study"),
  rating: z.number().int().min(1).max(5).nullable().default(null),
  notes: z.string().default(""),
  takeaways: z.string().default("")
});

export const learningSessionSchema = z.object({
  id,
  topicId: id,
  plannedStartAt: timestamp.nullable().default(null),
  startedAt: timestamp,
  endedAt: timestamp.nullable(),
  stateChangedAt: timestamp.nullable().default(null),
  state: z.enum(["running", "paused", "break", "completed", "cancelled"]).default("completed"),
  focusedSeconds: z.number().int().nonnegative(),
  pausedSeconds: z.number().int().nonnegative().default(0),
  breakSeconds: z.number().int().nonnegative().default(0),
  plannedSeconds: z.number().int().nonnegative().default(0),
  notes: z.string().default(""),
  accomplishments: z.string().default(""),
  problems: z.string().default(""),
  distractions: z.string().default(""),
  manualAdjustmentNote: z.string().default(""),
  rating: z.number().int().min(1).max(5).nullable().default(null),
  manuallyAdjusted: z.boolean().default(false)
});

export const studyPlanSchema = z.object({
  id,
  title: z.string().min(1),
  date: z.string().date(),
  topicIds: z.array(id),
  plannedMinutes: z.number().int().positive(),
  completed: z.boolean(),
  restDay: z.boolean().default(false)
});

export const assessmentSchema = z.object({
  id,
  topicId: id,
  assessedAt: timestamp,
  dimensions: z.object({
    conceptual: z.number().int().min(1).max(5),
    recall: z.number().int().min(1).max(5),
    implementation: z.number().int().min(1).max(5),
    problemSolving: z.number().int().min(1).max(5),
    debugging: z.number().int().min(1).max(5),
    retention: z.number().int().min(1).max(5),
    application: z.number().int().min(1).max(5),
    teaching: z.number().int().min(1).max(5)
  }).default({
    conceptual: 3, recall: 3, implementation: 3, problemSolving: 3,
    debugging: 3, retention: 3, application: 3, teaching: 3
  }),
  confidence: z.number().int().min(1).max(5),
  scorePercent: percent.nullable().default(null),
  evidence: z.string(),
  recommendation: z.string().default("")
});

export const examinationQuestionSchema = z.object({
  id,
  version: z.number().int().positive(),
  topicId: id,
  prompt: z.string().min(1),
  questionType: z.enum(["single-choice", "multiple-select", "true-false", "fill-blank", "short-answer", "long-answer", "practical", "code-reading", "debugging", "calculation", "case-study"]),
  difficulty: z.enum(["fundamental", "beginner", "intermediate", "advanced"]),
  critical: z.boolean().default(false),
  objective: z.string().default(""),
  options: z.array(z.string()).default([]),
  correctAnswer: z.union([z.string(), z.array(z.string()), z.number()]).nullable(),
  acceptedAnswers: z.array(z.string()).default([]),
  numericTolerance: z.number().nonnegative().default(0),
  explanation: z.string(),
  misconceptions: z.array(z.string()).default([]),
  rubric: z.string().default(""),
  maxMarks: z.number().positive().default(1),
  suggestedMinutes: z.number().int().positive().default(2),
  source: z.string().default(""),
  sample: z.boolean(),
  active: z.boolean().default(true),
  createdAt: timestamp.default("2026-01-01T00:00:00.000Z"),
  updatedAt: timestamp.default("2026-01-01T00:00:00.000Z")
});

export const examBlueprintSchema = z.object({
  id,
  title: z.string().min(1),
  examType: z.enum(["diagnostic", "topic", "practical", "closed-book", "open-book", "cumulative", "retention", "comprehensive"]),
  topicIds: z.array(id),
  questionIds: z.array(id),
  questionCount: z.number().int().positive().default(10),
  learningObjectives: z.array(z.string()).default([]),
  difficultyDistribution: z.record(z.string(), z.number().int().nonnegative()).default({}),
  questionTypes: z.array(examinationQuestionSchema.shape.questionType).default([]),
  retakePolicy: z.enum(["unrestricted", "cooldown"]).default("unrestricted"),
  retakeCooldownHours: z.number().int().positive().default(24),
  timeLimitMinutes: z.number().int().positive(),
  passingPercent: percent.default(80),
  difficulty: z.enum(["fundamental", "beginner", "intermediate", "advanced"]),
  allowedMaterials: z.string().default(""),
  practicalRequirements: z.string().default(""),
  active: z.boolean().default(true)
});

export const examinationAttemptSchema = z.object({
  id,
  blueprintId: id,
  examType: examBlueprintSchema.shape.examType,
  questionSnapshots: z.array(z.object({
    questionId: id,
    version: z.number().int().positive(),
    prompt: z.string(),
    questionType: examinationQuestionSchema.shape.questionType,
    options: z.array(z.string()),
    correctAnswer: z.union([z.string(), z.array(z.string()), z.number()]).nullable(),
    acceptedAnswers: z.array(z.string()),
    numericTolerance: z.number().nonnegative().default(0),
    explanation: z.string(),
    rubric: z.string().default(""),
    maxMarks: z.number().positive(),
    topicId: id,
    critical: z.boolean().default(false)
  })),
  answers: z.record(z.string(), z.string()),
  startedAt: timestamp,
  submittedAt: timestamp.nullable(),
  timeLimitMinutes: z.number().int().positive(),
  passingPercent: percent,
  scorePercent: percent.nullable(),
  marksEarned: z.number().nonnegative().nullable(),
  totalMarks: z.number().nonnegative(),
  grading: z.enum(["automatic", "manual", "ai-assisted"]).nullable(),
  selfDeclaredClosedBook: z.boolean(),
  manualGraded: z.boolean().default(false),
  result: z.enum(["pass", "not-yet-passed"]).nullable(),
  questionResults: z.array(z.object({
    questionId: id,
    answer: z.string(),
    marksEarned: z.number().nonnegative(),
    maxMarks: z.number().positive(),
    correct: z.boolean().nullable(),
    status: z.enum(["correct", "partial", "incorrect", "unanswered", "manual"]).default("incorrect"),
    feedback: z.string()
  })).default([])
});

export const competencySchema = z.object({
  id,
  topicId: id,
  level: z.enum(["Not Assessed", "Needs Practice", "Developing", "Competent", "Proficient", "Mastered"]),
  evidence: z.array(z.string()),
  updatedAt: timestamp
});

export const revisionScheduleSchema = z.object({
  id,
  topicId: id,
  dueAt: timestamp,
  intervalDays: z.number().int().positive(),
  lastScorePercent: percent.nullable(),
  sourceAttemptId: id.nullable().default(null)
});

export const noteSchema = z.object({
  id,
  title: z.string().min(1),
  body: z.string(),
  topicId: id.nullable(),
  tags: z.array(z.string()).default([]),
  updatedAt: timestamp
});

export const projectSchema = z.object({
  id,
  title: z.string().min(1),
  description: z.string(),
  status: z.enum(["planned", "in-progress", "completed", "blocked"]),
  evidenceUrl: z.string().url().or(z.literal("")),
  updatedAt: timestamp,
  targetUsers: z.string().default(""),
  topicIds: z.array(id).default([]),
  technologies: z.array(z.string()).default([]),
  testResults: z.string().default(""),
  plannedHours: z.number().nonnegative().default(0),
  actualHours: z.number().nonnegative().default(0),
  demoUrl: z.string().url().or(z.literal("")).default(""),
  documentationUrl: z.string().url().or(z.literal("")).default(""),
  knownLimitations: z.string().default(""),
  portfolioReady: z.boolean().default(false),
  tasks: z.array(z.object({ id, title: z.string(), completed: z.boolean() })).default([])
});

export const goalSchema = z.object({
  id,
  title: z.string().min(1),
  targetDate: z.string().date().nullable(),
  completed: z.boolean()
});

export const achievementSchema = z.object({
  id,
  title: z.string().min(1),
  unlockedAt: timestamp,
  source: z.string().min(1)
});

export const rewardSchema = z.object({
  id,
  title: z.string().min(1),
  earnedAt: timestamp,
  reason: z.string().min(1),
  points: z.number().int().nonnegative().default(0),
  eventId: id.default("legacy")
});

export const dailyReviewSchema = z.object({
  id,
  date: z.string().date(),
  reflection: z.string(),
  nextAction: z.string()
});

export const weeklyReviewSchema = z.object({
  id,
  weekStarting: z.string().date(),
  reflection: z.string(),
  nextWeekFocus: z.string(),
  plannedLearning: z.string().default(""),
  actuallyCompleted: z.string().default(""),
  struggles: z.string().default(""),
  independentSkills: z.string().default(""),
  assessmentImprovements: z.string().default(""),
  practiceNeeds: z.string().default(""),
  summary: z.record(z.string(), z.unknown()).default({})
});

export const experimentSchema = z.object({
  id, title: z.string().min(1), status: z.enum(["planned", "conducted"]),
  conductedAt: z.string().date().nullable(), hypothesis: z.string().min(1),
  modelProvider: z.string().default(""), modelVersion: z.string().default(""),
  dataset: z.string().default(""), configuration: z.string().default(""),
  evaluationBenchmark: z.string().default(""), primaryMetric: z.string().default(""),
  latencyMs: z.number().nonnegative().nullable().default(null),
  costPerRun: z.number().nonnegative().nullable().default(null), compute: z.string().default(""),
  failureCases: z.string().default(""), baseline: z.string().default(""),
  conclusion: z.string().default(""), nextExperiment: z.string().default("")
}).superRefine((record, context) => {
  if (record.status === "conducted" && !record.conductedAt) context.addIssue({ code: "custom", path: ["conductedAt"], message: "A conducted experiment needs a date." });
});

export const opportunitySchema = z.object({
  id, title: z.string().min(1), targetIndustry: z.string().default(""), customerSegment: z.string().default(""),
  coreProblem: z.string().default(""), currentWorkflow: z.string().default(""), currentCost: z.string().default(""),
  proposedSolution: z.string().default(""), interviewDate: z.string().date().nullable().default(null),
  customerFeedback: z.string().default(""), willingnessToPay: z.string().default(""),
  competitors: z.string().default(""), technicalFeasibility: z.enum(["unknown", "low", "medium", "high"]).default("unknown"),
  integrationRequirements: z.string().default(""), estimatedOperatingCost: z.string().default(""),
  expectedBusinessRoi: z.string().default(""),
  validationStatus: z.enum(["idea", "problem-confirmed", "customer-interviewed", "solution-validated", "pilot"]).default("idea"),
  nextAction: z.string().default("")
});

// ---- Learner-owned records for courses, practice, and personalization (schema v6) ----

export const courseEnrollmentSchema = z.object({
  id,
  courseId: id,
  enrolledAt: timestamp,
  status: z.enum(["active", "completed", "withdrawn"]).default("active")
});

export const learningModes = ["read", "watch", "visualize", "practice", "challenge", "exam", "review", "build"] as const;

export const lessonProgressSchema = z.object({
  id,
  courseId: id,
  lessonId: id,
  /** Version of the lesson content the learner was studying. */
  lessonVersion: z.number().int().positive(),
  startedAt: timestamp,
  completedAt: timestamp.nullable().default(null),
  completedBlockIds: z.array(z.string()).default([]),
  quizResults: z.array(z.object({
    blockId: z.string(),
    phase: z.enum(["before", "after", "check"]).default("check"),
    correct: z.number().int().nonnegative(),
    total: z.number().int().positive(),
    attemptedAt: timestamp
  })).default([]),
  bookmarked: z.boolean().default(false),
  lastMode: z.enum(learningModes).default("read"),
  updatedAt: timestamp
});

export const lessonNoteSchema = z.object({
  id,
  courseId: id,
  lessonId: id,
  blockId: z.string().nullable().default(null),
  /** Position in a video, in seconds, when the note is about a moment in a video. */
  videoSeconds: z.number().int().nonnegative().nullable().default(null),
  kind: z.enum(["note", "highlight", "question"]).default("note"),
  quote: z.string().max(2000).default(""),
  body: z.string().max(20000),
  createdAt: timestamp,
  updatedAt: timestamp
});

export const videoProgressSchema = z.object({
  id,
  courseId: id,
  lessonId: id,
  blockId: z.string(),
  /** Self-reported by the learner; external providers' watch history is not available. */
  watchedSeconds: z.number().int().nonnegative(),
  completed: z.boolean(),
  updatedAt: timestamp
});

export const flashcardSchema = z.object({
  id,
  front: z.string().min(1).max(2000),
  back: z.string().min(1).max(5000),
  topicId: id.nullable().default(null),
  source: z.string().max(200).default("Created by learner"),
  /** Spaced-repetition stage; each stage maps to a configured interval in days. */
  stage: z.number().int().nonnegative().default(0),
  dueAt: timestamp,
  createdAt: timestamp,
  suspended: z.boolean().default(false),
  reviews: z.array(z.object({
    reviewedAt: timestamp,
    grade: z.enum(["again", "hard", "good", "easy"]),
    intervalDays: z.number().nonnegative()
  })).default([])
});

export const practiceAttemptSchema = z.object({
  id,
  kind: z.enum(["math", "game", "diagram", "lesson-quiz"]),
  itemId: z.string().min(1).max(200),
  /** Seed for generated problems so the exact problem can be reproduced and re-checked. */
  variant: z.number().int().nonnegative().default(0),
  answer: z.string().max(20000),
  work: z.string().max(20000).default(""),
  score: z.number().nonnegative(),
  maxScore: z.number().positive(),
  correct: z.boolean(),
  mistakes: z.array(z.string()).default([]),
  timed: z.boolean().default(false),
  durationSeconds: z.number().int().nonnegative().nullable().default(null),
  topicId: id.nullable().default(null),
  attemptedAt: timestamp
});

export const diagramNodeSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(300),
  detail: z.string().max(2000).default(""),
  x: z.number().finite(),
  y: z.number().finite(),
  shape: z.enum(["process", "decision", "start", "data", "actor", "note"]).default("process"),
  step: z.number().int().nonnegative().default(0)
});

export const diagramEdgeSchema = z.object({
  id: z.string().min(1).max(80),
  source: z.string().min(1).max(80),
  target: z.string().min(1).max(80),
  label: z.string().max(200).default(""),
  step: z.number().int().nonnegative().default(0)
});

export const diagramKinds = [
  "flowchart", "workflow", "activity", "sequence", "state", "decision-tree", "mind-map", "concept-map",
  "data-flow", "architecture", "uml-class", "entity-relationship", "network", "neural-network",
  "transformer", "ml-pipeline", "evaluation-workflow"
] as const;

export const diagramDefinitionSchema = z.object({
  id,
  title: z.string().min(1).max(200),
  kind: z.enum(diagramKinds),
  purpose: z.string().max(2000).default(""),
  altText: z.string().min(1).max(4000),
  explanationSteps: z.array(z.string().max(2000)).default([]),
  nodes: z.array(diagramNodeSchema).max(200),
  edges: z.array(diagramEdgeSchema).max(400),
  updatedAt: timestamp
}).superRefine((diagram, context) => {
  const nodeIds = new Set<string>();
  diagram.nodes.forEach((node, index) => {
    if (nodeIds.has(node.id)) context.addIssue({ code: "custom", path: ["nodes", index, "id"], message: `Duplicate node id: ${node.id}` });
    nodeIds.add(node.id);
  });
  diagram.edges.forEach((edge, index) => {
    if (!nodeIds.has(edge.source)) context.addIssue({ code: "custom", path: ["edges", index, "source"], message: `Edge source "${edge.source}" is not a node.` });
    if (!nodeIds.has(edge.target)) context.addIssue({ code: "custom", path: ["edges", index, "target"], message: `Edge target "${edge.target}" is not a node.` });
  });
});

export const recommendationOverrideSchema = z.object({
  id,
  recommendationKey: z.string().min(1).max(200),
  action: z.enum(["dismissed", "snoozed", "pinned"]),
  until: timestamp.nullable().default(null),
  reason: z.string().max(1000).default(""),
  createdAt: timestamp
});

export const applicationDataSchema = z.object({
  schemaVersion: z.literal(schemaVersion),
  roadmapPhases: z.array(roadmapPhaseSchema),
  topics: z.array(topicSchema),
  resources: z.array(resourceSchema),
  learningSessions: z.array(learningSessionSchema),
  studyPlans: z.array(studyPlanSchema),
  assessments: z.array(assessmentSchema),
  examinationQuestions: z.array(examinationQuestionSchema),
  examinationBlueprints: z.array(examBlueprintSchema).default([]),
  examinationAttempts: z.array(examinationAttemptSchema),
  competencies: z.array(competencySchema),
  revisionSchedules: z.array(revisionScheduleSchema),
  notes: z.array(noteSchema),
  projects: z.array(projectSchema),
  goals: z.array(goalSchema),
  achievements: z.array(achievementSchema),
  rewards: z.array(rewardSchema),
  dailyReviews: z.array(dailyReviewSchema),
  weeklyReviews: z.array(weeklyReviewSchema),
  experiments: z.array(experimentSchema).default([]),
  opportunities: z.array(opportunitySchema).default([]),
  courseEnrollments: z.array(courseEnrollmentSchema).default([]),
  lessonProgress: z.array(lessonProgressSchema).default([]),
  lessonNotes: z.array(lessonNoteSchema).default([]),
  videoProgress: z.array(videoProgressSchema).default([]),
  flashcards: z.array(flashcardSchema).default([]),
  practiceAttempts: z.array(practiceAttemptSchema).default([]),
  userDiagrams: z.array(diagramDefinitionSchema).default([]),
  recommendationOverrides: z.array(recommendationOverrideSchema).default([]),
  settings: z.record(z.string(), z.unknown())
}).superRefine((data, context) => {
  if (typeof data.settings.timezone === "string") {
    try {
      new Intl.DateTimeFormat("en", { timeZone: data.settings.timezone });
    } catch {
      context.addIssue({ code: "custom", path: ["settings", "timezone"], message: "Timezone must be a valid IANA timezone." });
    }
  }
  for (const key of ["topicPassingPercent", "practicalPassingPercent", "retentionPassingPercent"]) {
    const value = data.settings[key];
    if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100)) {
      context.addIssue({ code: "custom", path: ["settings", key], message: "Competency threshold must be a percentage from 0 to 100." });
    }
  }
  if (data.settings.weeklyHours !== undefined && (
    typeof data.settings.weeklyHours !== "number" || !Number.isFinite(data.settings.weeklyHours) || data.settings.weeklyHours < 0 || data.settings.weeklyHours > 168
  )) {
    context.addIssue({ code: "custom", path: ["settings", "weeklyHours"], message: "Weekly target must be between 0 and 168 hours." });
  }
  const phaseIds = new Set(data.roadmapPhases.map(({ id: value }) => value));
  const topicIds = new Set(data.topics.map(({ id: value }) => value));
  const questionIds = new Set(data.examinationQuestions.map(({ id: value }) => value));
  const blueprintIds = new Set(data.examinationBlueprints.map(({ id: value }) => value));
  const checkUnique = (ids: string[], field: string) => {
    const seen = new Set<string>();
    ids.forEach((value, index) => {
      if (seen.has(value)) context.addIssue({ code: "custom", path: [field, index, "id"], message: `Duplicate id: ${value}` });
      seen.add(value);
    });
  };
  const checkTopic = (topicId: string, path: (string | number)[]) => {
    if (!topicIds.has(topicId)) context.addIssue({ code: "custom", path, message: `Unknown topic id: ${topicId}` });
  };
  checkUnique(data.roadmapPhases.map(({ id: value }) => value), "roadmapPhases");
  checkUnique(data.topics.map(({ id: value }) => value), "topics");
  checkUnique(data.resources.map(({ id: value }) => value), "resources");
  checkUnique(data.learningSessions.map(({ id: value }) => value), "learningSessions");
  checkUnique(data.examinationQuestions.map(({ id: value }) => value), "examinationQuestions");
  checkUnique(data.examinationBlueprints.map(({ id: value }) => value), "examinationBlueprints");
  checkUnique(data.experiments.map(({ id: value }) => value), "experiments");
  checkUnique(data.opportunities.map(({ id: value }) => value), "opportunities");
  for (const field of ["courseEnrollments", "lessonProgress", "lessonNotes", "videoProgress", "flashcards", "practiceAttempts", "userDiagrams", "recommendationOverrides"] as const) {
    checkUnique(data[field].map(({ id: value }) => value), field);
  }
  data.flashcards.forEach((record, index) => { if (record.topicId) checkTopic(record.topicId, ["flashcards", index, "topicId"]); });
  data.practiceAttempts.forEach((record, index) => { if (record.topicId) checkTopic(record.topicId, ["practiceAttempts", index, "topicId"]); });

  data.topics.forEach((topic, index) => {
    if (!phaseIds.has(topic.phaseId)) context.addIssue({ code: "custom", path: ["topics", index, "phaseId"], message: `Unknown phase id: ${topic.phaseId}` });
    topic.prerequisites.forEach((ref, refIndex) => checkTopic(ref, ["topics", index, "prerequisites", refIndex]));
  });
  data.resources.forEach((resource, index) => {
    if (!phaseIds.has(resource.phaseId)) context.addIssue({ code: "custom", path: ["resources", index, "phaseId"], message: `Unknown phase id: ${resource.phaseId}` });
    resource.topicIds.forEach((ref, refIndex) => checkTopic(ref, ["resources", index, "topicIds", refIndex]));
  });
  data.learningSessions.forEach((record, index) => checkTopic(record.topicId, ["learningSessions", index, "topicId"]));
  data.studyPlans.forEach((record, index) => record.topicIds.forEach((ref, refIndex) => checkTopic(ref, ["studyPlans", index, "topicIds", refIndex])));
  data.assessments.forEach((record, index) => checkTopic(record.topicId, ["assessments", index, "topicId"]));
  data.examinationQuestions.forEach((record, index) => checkTopic(record.topicId, ["examinationQuestions", index, "topicId"]));
  data.competencies.forEach((record, index) => checkTopic(record.topicId, ["competencies", index, "topicId"]));
  data.revisionSchedules.forEach((record, index) => checkTopic(record.topicId, ["revisionSchedules", index, "topicId"]));
  data.notes.forEach((record, index) => { if (record.topicId) checkTopic(record.topicId, ["notes", index, "topicId"]); });
  data.projects.forEach((record, index) => record.topicIds.forEach((ref, refIndex) => checkTopic(ref, ["projects", index, "topicIds", refIndex])));
  data.examinationBlueprints.forEach((record, index) => {
    record.topicIds.forEach((ref, refIndex) => checkTopic(ref, ["examinationBlueprints", index, "topicIds", refIndex]));
    record.questionIds.forEach((ref, refIndex) => {
      if (!questionIds.has(ref)) context.addIssue({ code: "custom", path: ["examinationBlueprints", index, "questionIds", refIndex], message: `Unknown question id: ${ref}` });
    });
  });
  data.examinationAttempts.forEach((record, index) => {
    if (!blueprintIds.has(record.blueprintId)) context.addIssue({ code: "custom", path: ["examinationAttempts", index, "blueprintId"], message: `Unknown blueprint id: ${record.blueprintId}` });
    record.questionSnapshots.forEach((question, questionIndex) => checkTopic(question.topicId, ["examinationAttempts", index, "questionSnapshots", questionIndex, "topicId"]));
  });
  data.revisionSchedules.forEach((record, index) => {
    if (record.sourceAttemptId && !data.examinationAttempts.some(({ id: attemptId }) => attemptId === record.sourceAttemptId)) {
      context.addIssue({ code: "custom", path: ["revisionSchedules", index, "sourceAttemptId"], message: "Unknown source examination attempt." });
    }
  });
});

export type ApplicationData = z.infer<typeof applicationDataSchema>;
export type RoadmapPhase = z.infer<typeof roadmapPhaseSchema>;
export type LearningSession = z.infer<typeof learningSessionSchema>;
export type ExaminationAttempt = z.infer<typeof examinationAttemptSchema>;
export type LessonProgress = z.infer<typeof lessonProgressSchema>;
export type Flashcard = z.infer<typeof flashcardSchema>;
export type PracticeAttempt = z.infer<typeof practiceAttemptSchema>;
export type DiagramDefinition = z.infer<typeof diagramDefinitionSchema>;
export type LearningMode = (typeof learningModes)[number];
