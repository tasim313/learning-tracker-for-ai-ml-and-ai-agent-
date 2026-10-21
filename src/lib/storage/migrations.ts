import { z } from "zod";
import { applicationDataSchema, schemaVersion, type ApplicationData } from "@/lib/model";
import { createSeedData } from "@/lib/seed";
import { appendMissingSamples } from "@/lib/seed-questions";
import { addInitialCurriculum } from "@/lib/curriculum";

const objectSchema = z.record(z.string(), z.unknown());

function record(value: unknown): Record<string, unknown> {
  return objectSchema.parse(value);
}

function arrayAt(source: Record<string, unknown>, key: string): unknown[] {
  const value = source[key];
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`Version 1 field "${key}" must be an array.`);
  return value;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function number(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function appendCatalogResources(existing: unknown, catalog: ApplicationData["resources"]): unknown {
  if (!Array.isArray(existing)) return existing;
  const ids = new Set(existing.flatMap((item) =>
    typeof item === "object" && item !== null && "id" in item && typeof item.id === "string" ? [item.id] : []
  ));
  return [...existing, ...catalog.filter((resource) => !ids.has(resource.id))];
}

/**
 * Migrate any supported schema version to the current one. Migrations may add
 * curriculum seed content, but never change a learner's recorded progress or evidence.
 */
export function migrateApplicationData(input: unknown): { data: ApplicationData; migrated: boolean } {
  const result = migrateToCurrent(input);
  if (!result.migrated) return result;
  const parsed = applicationDataSchema.safeParse({
    ...result.data,
    ...appendMissingSamples(result.data),
    ...addInitialCurriculum(result.data)
  });
  if (!parsed.success) throw new Error(`Migration failed validation: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
  return { data: parsed.data, migrated: true };
}

function migrateToCurrent(input: unknown): { data: ApplicationData; migrated: boolean } {
  const root = objectSchema.safeParse(input);
  if (!root.success) throw new Error("Application data must be a JSON object.");
  if (root.data.schemaVersion === schemaVersion) {
    const parsed = applicationDataSchema.safeParse(root.data);
    if (!parsed.success) throw new Error(`Application data failed schema validation: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
    return { data: parsed.data, migrated: false };
  }
  if (root.data.schemaVersion === 5) {
    // v6 added course, practice, and personalization collections; the v7 schema defaults missing curriculum arrays.
    const parsed = applicationDataSchema.safeParse({ ...root.data, schemaVersion });
    if (!parsed.success) throw new Error(`Version 5 migration failed validation: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
    return { data: parsed.data, migrated: true };
  }
  if (root.data.schemaVersion === 6) {
    // v7 adds editable subtopics and learning tasks; v8 adds session activity categories.
    const parsed = applicationDataSchema.safeParse({ ...root.data, schemaVersion });
    if (!parsed.success) throw new Error(`Version 6 migration failed validation: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
    return { data: parsed.data, migrated: true };
  }
  if (root.data.schemaVersion === 7) {
    // v8 classifies focused time by learning, review, debugging, or practical work.
    const parsed = applicationDataSchema.safeParse({ ...root.data, schemaVersion });
    if (!parsed.success) throw new Error(`Version 7 migration failed validation: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
    return { data: parsed.data, migrated: true };
  }
  if (root.data.schemaVersion === 3) {
    const seed = createSeedData();
    const candidate = { ...root.data, schemaVersion, resources: appendCatalogResources(root.data.resources, seed.resources) };
    const parsed = applicationDataSchema.safeParse(candidate);
    if (!parsed.success) throw new Error(`Version 3 migration failed validation: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
    return { data: parsed.data, migrated: true };
  }
  if (root.data.schemaVersion === 4) {
    const seed = createSeedData();
    const candidate = { ...root.data, schemaVersion, resources: appendCatalogResources(root.data.resources, seed.resources) };
    const parsed = applicationDataSchema.safeParse(candidate);
    if (!parsed.success) throw new Error(`Version 4 migration failed validation: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
    return { data: parsed.data, migrated: true };
  }
  if (root.data.schemaVersion === 2) {
    const seed = createSeedData();
    const candidate = {
      ...root.data, schemaVersion, experiments: root.data.experiments ?? [], opportunities: root.data.opportunities ?? [],
      resources: appendCatalogResources(root.data.resources, seed.resources)
    };
    const parsed = applicationDataSchema.safeParse(candidate);
    if (!parsed.success) throw new Error(`Version 2 migration failed validation: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
    return { data: parsed.data, migrated: true };
  }
  if (root.data.schemaVersion !== 1) {
    throw new Error(`Unsupported application schema version: ${String(root.data.schemaVersion)}.`);
  }

  const old = root.data;
  const seed = createSeedData();
  const phases = arrayAt(old, "roadmapPhases").map((item, index) => {
    const phase = record(item);
    return {
      id: text(phase.id, `phase-${index + 1}`),
      order: number(phase.order, index + 1),
      title: text(phase.title, seed.roadmapPhases[index]?.title ?? `Phase ${index + 1}`),
      summary: text(phase.summary, "Learning phase."),
      status: phase.status === "completed" || phase.status === "in-progress" ? phase.status : "not-started",
      estimatedHours: number(phase.estimatedHours, 0)
    };
  });
  const migratedTopics = arrayAt(old, "topics").map((item, index) => {
    const topic = record(item);
    return {
      ...topic,
      id: text(topic.id, `topic-migrated-${index}`),
      phaseId: text(topic.phaseId),
      title: text(topic.title),
      status: topic.status === "completed" || topic.status === "in-progress" ? topic.status : topic.status === "mastered" ? "completed" : "not-started",
      confidence: typeof topic.confidence === "number" ? topic.confidence : null
    };
  });
  const topics = migratedTopics.length ? migratedTopics : seed.topics;
  const migratedResources = arrayAt(old, "resources");
  const migratedQuestions = arrayAt(old, "examinationQuestions").map((item, index) => {
    const question = record(item);
    const options = Array.isArray(question.options) ? question.options.map((option) => text(option)) : [];
    const correctOption = typeof question.correctOption === "number" ? question.correctOption : null;
    return {
      ...question,
      id: text(question.id, `question-migrated-${index}`),
      version: number(question.version, 1),
      topicId: text(question.topicId),
      prompt: text(question.prompt),
      questionType: question.questionType === "multiple-choice" ? "single-choice" : question.questionType,
      difficulty: ["fundamental", "beginner", "intermediate", "advanced"].includes(text(question.difficulty)) ? question.difficulty : "beginner",
      critical: question.critical === true,
      options,
      correctAnswer: correctOption !== null
        ? options[correctOption] ?? null
        : typeof question.correctAnswer === "string" || typeof question.correctAnswer === "number" || Array.isArray(question.correctAnswer)
          ? question.correctAnswer
          : null,
      acceptedAnswers: Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers.map((answer) => text(answer)) : [],
      numericTolerance: number(question.numericTolerance, 0),
      explanation: text(question.explanation),
      rubric: text(question.rubric),
      sample: question.sample === true
    };
  });
  const questions = migratedQuestions.length ? migratedQuestions : seed.examinationQuestions;
  const questionsById = new Map(questions.map((question) => [String(question.id), question]));
  const migratedBlueprints = arrayAt(old, "examinationBlueprints").map((item, index) => {
    const blueprint = record(item);
    const questionIds = Array.isArray(blueprint.questionIds) ? blueprint.questionIds.map((value) => text(value)).filter(Boolean) : [];
    return {
      ...blueprint,
      id: text(blueprint.id, `blueprint-migrated-${index + 1}`),
      title: text(blueprint.title, `Migrated blueprint ${index + 1}`),
      examType: blueprint.examType ?? "topic",
      topicIds: Array.isArray(blueprint.topicIds) ? blueprint.topicIds.map((value) => text(value)).filter(Boolean) : [],
      questionIds,
      questionCount: number(blueprint.questionCount, questionIds.length || 10),
      learningObjectives: Array.isArray(blueprint.learningObjectives) ? blueprint.learningObjectives.map((value) => text(value)) : [],
      difficultyDistribution: typeof blueprint.difficultyDistribution === "object" && blueprint.difficultyDistribution !== null
        ? blueprint.difficultyDistribution
        : {},
      questionTypes: Array.isArray(blueprint.questionTypes) ? blueprint.questionTypes : [],
      retakePolicy: blueprint.retakePolicy === "cooldown" ? "cooldown" : "unrestricted",
      retakeCooldownHours: number(blueprint.retakeCooldownHours, 24),
      timeLimitMinutes: number(blueprint.timeLimitMinutes, 60),
      passingPercent: number(blueprint.passingPercent, 80),
      difficulty: ["fundamental", "beginner", "intermediate", "advanced"].includes(text(blueprint.difficulty)) ? blueprint.difficulty : "beginner",
      allowedMaterials: text(blueprint.allowedMaterials),
      practicalRequirements: text(blueprint.practicalRequirements),
      active: blueprint.active !== false
    };
  });
  const oldAttempts = arrayAt(old, "examinationAttempts");
  const blueprints: Record<string, unknown>[] = [];
  const attempts = oldAttempts.map((item, index) => {
    const attempt = record(item);
    const questionId = text(attempt.questionId);
    const question = questionsById.get(questionId);
    if (!question) throw new Error(`Cannot migrate examination attempt "${text(attempt.id)}": its question is missing.`);
    const blueprintId = `attempt-blueprint-migrated-${index + 1}`;
    blueprints.push({
      id: blueprintId,
      title: `Migrated examination ${index + 1}`,
      examType: "topic",
      topicIds: [question.topicId],
      questionIds: [questionId],
      timeLimitMinutes: 60,
      passingPercent: 80,
      difficulty: question.difficulty,
      active: false
    });
    const answer = text(attempt.answer);
    const score = typeof attempt.scorePercent === "number" ? attempt.scorePercent : null;
    return {
      id: text(attempt.id, `attempt-migrated-${index + 1}`),
      blueprintId,
      examType: "topic",
      questionSnapshots: [{
        questionId,
        version: question.version,
        prompt: question.prompt,
        questionType: question.questionType,
        options: question.options,
        correctAnswer: question.correctAnswer,
        acceptedAnswers: question.acceptedAnswers,
        numericTolerance: question.numericTolerance,
        explanation: question.explanation,
        rubric: text(question.rubric),
        maxMarks: 1,
        topicId: question.topicId,
        critical: question.critical
      }],
      answers: { [questionId]: answer },
      startedAt: text(attempt.startedAt, new Date(0).toISOString()),
      submittedAt: typeof attempt.submittedAt === "string" ? attempt.submittedAt : null,
      timeLimitMinutes: 60,
      passingPercent: 80,
      scorePercent: score,
      marksEarned: score === null ? null : score / 100,
      totalMarks: 1,
      grading: score === null ? null : "automatic",
      selfDeclaredClosedBook: false,
      result: score === null ? null : score >= 80 ? "pass" : "not-yet-passed",
      questionResults: score === null ? [] : [{
        questionId,
        answer,
        marksEarned: score / 100,
        maxMarks: 1,
        correct: score === 100,
        feedback: "Migrated result; original grading detail was not stored."
      }]
    };
  });

  const candidate = {
    ...seed,
    ...old,
    schemaVersion,
    roadmapPhases: phases.length ? phases : seed.roadmapPhases,
    topics,
    resources: appendCatalogResources(migratedResources.length ? migratedResources : migratedTopics.length ? [] : seed.resources, seed.resources) as ApplicationData["resources"],
    learningSessions: arrayAt(old, "learningSessions").map((item) => {
      const session = record(item);
      const states = ["running", "paused", "break", "completed", "cancelled"];
      return {
        ...session,
        state: states.includes(text(session.state)) ? session.state : session.endedAt ? "completed" : "paused",
        stateChangedAt: typeof session.stateChangedAt === "string" ? session.stateChangedAt : null,
        pausedSeconds: number(session.pausedSeconds, 0),
        breakSeconds: number(session.breakSeconds, 0),
        plannedSeconds: number(session.plannedSeconds, number(session.plannedMinutes, 0) * 60),
        notes: text(session.notes),
        accomplishments: text(session.accomplishments),
        problems: text(session.problems),
        distractions: text(session.distractions),
        manualAdjustmentNote: text(session.manualAdjustmentNote),
        rating: typeof session.rating === "number" ? session.rating : null,
        manuallyAdjusted: session.manuallyAdjusted === true
      };
    }),
    studyPlans: arrayAt(old, "studyPlans"),
    assessments: arrayAt(old, "assessments"),
    examinationQuestions: questions,
    examinationBlueprints: [...migratedBlueprints, ...blueprints].length
      ? [...migratedBlueprints, ...blueprints]
      : (migratedQuestions.length ? [] : seed.examinationBlueprints),
    examinationAttempts: attempts,
    competencies: arrayAt(old, "competencies"),
    revisionSchedules: arrayAt(old, "revisionSchedules"),
    notes: arrayAt(old, "notes"),
    projects: arrayAt(old, "projects").length ? arrayAt(old, "projects") : seed.projects,
    goals: arrayAt(old, "goals"),
    achievements: arrayAt(old, "achievements"),
    rewards: arrayAt(old, "rewards"),
    dailyReviews: arrayAt(old, "dailyReviews"),
    weeklyReviews: arrayAt(old, "weeklyReviews"),
    settings: typeof old.settings === "object" && old.settings !== null ? old.settings : {}
  };
  const parsed = applicationDataSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error(`Version 1 migration failed validation: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
  }
  return { data: parsed.data, migrated: true };
}
