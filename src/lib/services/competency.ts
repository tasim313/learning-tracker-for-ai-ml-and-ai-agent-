import type { ApplicationData } from "@/lib/model";

const defaultThresholds = { topic: 80, practical: 80, retention: 70 };

function topicScore(data: ApplicationData, attemptId: string, topicId: string): number | null {
  const attempt = data.examinationAttempts.find(({ id }) => id === attemptId);
  if (!attempt?.submittedAt || attempt.scorePercent === null) return null;
  const questionIds = new Set(attempt.questionSnapshots.filter((question) => question.topicId === topicId).map(({ questionId }) => questionId));
  const rows = attempt.questionResults.filter((result) => questionIds.has(result.questionId));
  if (!rows.length || rows.some((row) => row.correct === null)) return null;
  const marks = rows.reduce((sum, row) => sum + row.marksEarned, 0);
  const max = rows.reduce((sum, row) => sum + row.maxMarks, 0);
  return max > 0 ? marks / max * 100 : null;
}

function hasCriticalFailure(data: ApplicationData, attemptId: string, topicId: string): boolean {
  const attempt = data.examinationAttempts.find(({ id }) => id === attemptId);
  if (!attempt) return true;
  return attempt.questionSnapshots
    .filter((question) => question.topicId === topicId && question.critical)
    .some((question) => attempt.questionResults.find((result) => result.questionId === question.questionId)?.correct !== true);
}

export function competencyReadiness(data: ApplicationData, topicId: string) {
  const topic = data.topics.find((item) => item.id === topicId);
  if (!topic) return { level: "Not Assessed" as const, requirements: ["Topic not found."], evidence: [] as string[] };
  const thresholds = {
    topic: typeof data.settings.topicPassingPercent === "number" ? data.settings.topicPassingPercent : defaultThresholds.topic,
    practical: typeof data.settings.practicalPassingPercent === "number" ? data.settings.practicalPassingPercent : defaultThresholds.practical,
    retention: typeof data.settings.retentionPassingPercent === "number" ? data.settings.retentionPassingPercent : defaultThresholds.retention
  };
  const graded = data.examinationAttempts.filter((attempt) => attempt.scorePercent !== null && attempt.submittedAt);
  const theory = graded.filter((attempt) => !["retention", "practical"].includes(attempt.examType))
    .map((attempt) => ({ id: attempt.id, score: topicScore(data, attempt.id, topicId) }))
    .filter((result): result is { id: string; score: number } => result.score !== null);
  const practical = graded.filter((attempt) =>
    attempt.manualGraded && attempt.questionSnapshots.some((question) => question.topicId === topicId && question.questionType === "practical")
  ).map((attempt) => ({ id: attempt.id, score: topicScore(data, attempt.id, topicId) }))
    .filter((result): result is { id: string; score: number } => result.score !== null);
  const retention = graded.filter((attempt) => attempt.examType === "retention")
    .map((attempt) => ({ id: attempt.id, score: topicScore(data, attempt.id, topicId) }))
    .filter((result): result is { id: string; score: number } => result.score !== null);
  const theoryPasses = theory.filter((attempt) =>
    attempt.score >= thresholds.topic && !hasCriticalFailure(data, attempt.id, topicId)
  );
  const practicalPasses = practical.filter((attempt) =>
    attempt.score >= thresholds.practical && !hasCriticalFailure(data, attempt.id, topicId)
  );
  const retentionPasses = retention.filter((attempt) =>
    attempt.score >= thresholds.retention && !hasCriticalFailure(data, attempt.id, topicId)
  );
  const requirements: string[] = [];
  if (theoryPasses.length === 0) requirements.push(`Pass a topic exam at ${thresholds.topic}% or higher.`);
  if (topic.practicalRequired && practicalPasses.length === 0) requirements.push(`Provide practical evidence and pass at ${thresholds.practical}% or higher.`);
  if (theoryPasses.length && (!topic.practicalRequired || practicalPasses.length)) {
    if (retentionPasses.length === 0) requirements.push(`Pass a delayed retention exam at ${thresholds.retention}% or higher.`);
    if (retentionPasses.length < 2) requirements.push("Pass a second delayed retention exam on a separate attempt before mastery.");
  }
  let level: "Not Assessed" | "Needs Practice" | "Developing" | "Competent" | "Proficient" | "Mastered" = "Not Assessed";
  if (graded.some((attempt) => topicScore(data, attempt.id, topicId) !== null)) level = "Needs Practice";
  if (theoryPasses.length > 0) level = topic.practicalRequired ? "Developing" : "Competent";
  if (theoryPasses.length > 0 && (!topic.practicalRequired || practicalPasses.length > 0)) level = "Competent";
  if (level === "Competent" && retentionPasses.length > 0) level = "Proficient";
  if (level === "Proficient" && retentionPasses.length >= 2) level = "Mastered";
  if (level === "Mastered") requirements.length = 0;
  const evidence = [
    ...theoryPasses.map((attempt) => `Topic assessment ${attempt.id}: ${attempt.score.toFixed(1)}%`),
    ...practicalPasses.map((attempt) => `Practical evidence ${attempt.id}: ${attempt.score.toFixed(1)}%`),
    ...retentionPasses.map((attempt) => `Retention assessment ${attempt.id}: ${attempt.score.toFixed(1)}%`)
  ];
  return { level, requirements, evidence };
}

export function updateCompetencyRecords(data: ApplicationData, topicIds: string[], updatedAt: string) {
  let competencies = [...data.competencies];
  for (const topicId of new Set(topicIds)) {
    const readiness = competencyReadiness(data, topicId);
    if (readiness.level === "Not Assessed") continue;
    const existing = competencies.find((record) => record.topicId === topicId);
    const record = {
      id: existing?.id ?? `competency-${topicId}`,
      topicId,
      level: readiness.level,
      evidence: [...readiness.evidence, ...readiness.requirements.map((requirement) => `Outstanding: ${requirement}`)],
      updatedAt
    };
    competencies = existing
      ? competencies.map((item) => item.id === existing.id ? record : item)
      : [...competencies, record];
  }
  return competencies;
}
