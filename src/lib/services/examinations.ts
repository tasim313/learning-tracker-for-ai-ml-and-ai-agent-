import { randomUUID } from "node:crypto";
import type { ApplicationData, ExaminationAttempt } from "@/lib/model";

function shuffled<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function startExamination(data: ApplicationData, blueprintId: string, now = new Date().toISOString(), random = Math.random): ExaminationAttempt {
  if (data.examinationAttempts.some((attempt) => attempt.submittedAt === null)) {
    throw new Error("Submit or finish the current examination before starting another.");
  }
  const blueprint = data.examinationBlueprints.find((item) => item.id === blueprintId && item.active);
  if (!blueprint) throw new Error("Active examination blueprint was not found.");
  const previousAttempts = data.examinationAttempts
    .filter((attempt) => attempt.blueprintId === blueprintId && attempt.submittedAt)
    .sort((left, right) => String(right.submittedAt).localeCompare(String(left.submittedAt)));
  const lastAttempt = previousAttempts[0];
  if (
    lastAttempt?.submittedAt &&
    blueprint.retakePolicy === "cooldown" &&
    Date.parse(now) - Date.parse(lastAttempt.submittedAt) < blueprint.retakeCooldownHours * 3600000
  ) {
    throw new Error(`This blueprint allows another attempt after ${blueprint.retakeCooldownHours} hours.`);
  }
  const configured = blueprint.questionIds
    .map((questionId) => data.examinationQuestions.find((question) =>
      question.id === questionId && question.active && blueprint.topicIds.includes(question.topicId)
    ))
    .filter((question) => question !== undefined);
  const pool = (configured.length > 0 ? configured : data.examinationQuestions.filter((question) =>
    question.active && blueprint.topicIds.includes(question.topicId)
  )).filter((question) => blueprint.questionTypes.length === 0 || blueprint.questionTypes.includes(question.questionType));
  if (pool.length === 0) throw new Error("This blueprint has no active questions matching its topic and question-type settings.");
  const distribution = Object.entries(blueprint.difficultyDistribution).filter(([, count]) => count > 0);
  const requested = distribution.length > 0
    ? distribution
    : [[blueprint.difficulty, configured.length || blueprint.questionCount] as [string, number]];
  const previouslyUsed = new Set(previousAttempts.flatMap((attempt) => attempt.questionSnapshots.map(({ questionId }) => questionId)));
  const freshPool = pool.filter((question) => !previouslyUsed.has(question.id));
  const canAvoidRepeats = requested.every(([difficulty, count]) =>
    freshPool.filter((question) => question.difficulty === difficulty).length >= count
  );
  const selectionPool = canAvoidRepeats ? freshPool : pool;
  const selected = requested.flatMap(([difficulty, count]) => {
    const available = selectionPool.filter((question) => question.difficulty === difficulty);
    if (available.length < count) {
      throw new Error(`Blueprint requires ${count} ${difficulty} question(s), but only ${available.length} active question(s) match.`);
    }
    return shuffled(available, random).slice(0, count);
  });
  if (selected.length === 0) throw new Error("This blueprint has no questions in its difficulty distribution.");
  const questionSnapshots = shuffled(selected, random).map((question) => ({
    questionId: question.id,
    version: question.version,
    prompt: question.prompt,
    questionType: question.questionType,
    options: shuffled(question.options, random),
    correctAnswer: Array.isArray(question.correctAnswer) ? [...question.correctAnswer] : question.correctAnswer,
    acceptedAnswers: [...question.acceptedAnswers],
    numericTolerance: question.numericTolerance,
    explanation: question.explanation,
    rubric: question.rubric,
    maxMarks: question.maxMarks,
    topicId: question.topicId,
    critical: question.critical
  }));
  const totalMarks = questionSnapshots.reduce((total, question) => total + question.maxMarks, 0);
  return {
    id: randomUUID(),
    blueprintId: blueprint.id,
    examType: blueprint.examType,
    questionSnapshots,
    answers: {},
    startedAt: now,
    submittedAt: null,
    timeLimitMinutes: blueprint.timeLimitMinutes,
    passingPercent: blueprint.passingPercent,
    scorePercent: null,
    marksEarned: null,
    totalMarks,
    grading: null,
    selfDeclaredClosedBook: blueprint.examType === "closed-book",
    manualGraded: false,
    result: null,
    questionResults: []
  };
}

function normalize(answer: string) {
  return answer.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

type AutoMark = Pick<ExaminationAttempt["questionResults"][number], "correct" | "status" | "marksEarned">;

function isManual(question: ExaminationAttempt["questionSnapshots"][number]) {
  return ["long-answer", "practical", "debugging", "case-study"].includes(question.questionType)
    || question.correctAnswer === null;
}

function autoMark(question: ExaminationAttempt["questionSnapshots"][number], answer: string): AutoMark {
  if (isManual(question)) return { correct: null, status: "manual" as const, marksEarned: 0 };
  if (!answer.trim()) return { correct: false, status: "unanswered" as const, marksEarned: 0 };
  if (question.questionType === "calculation" && typeof question.correctAnswer === "number") {
    const actualNumber = Number(answer);
    const correct = Number.isFinite(actualNumber) && Math.abs(actualNumber - question.correctAnswer) <= question.numericTolerance;
    return { correct, status: correct ? "correct" as const : "incorrect" as const, marksEarned: correct ? question.maxMarks : 0 };
  }
  if (question.questionType === "multiple-select") {
    const actual = new Set(answer.split("\n").map(normalize).filter(Boolean));
    const expectedValues = Array.isArray(question.correctAnswer)
      ? question.correctAnswer
      : String(question.correctAnswer ?? "").split("\n");
    const expected = new Set(expectedValues.map(normalize).filter(Boolean));
    const matched = [...expected].filter((item) => actual.has(item)).length;
    const incorrectSelections = [...actual].filter((item) => !expected.has(item)).length;
    const fraction = expected.size ? Math.max(0, (matched - incorrectSelections) / expected.size) : 0;
    const correct = fraction === 1 && actual.size === expected.size;
    return {
      correct,
      status: correct ? "correct" as const : fraction > 0 ? "partial" as const : "incorrect" as const,
      marksEarned: question.maxMarks * fraction
    };
  }
  const actual = normalize(answer);
  const expected = normalize(String(question.correctAnswer ?? ""));
  const correct = [expected, ...question.acceptedAnswers.map(normalize)].includes(actual);
  return { correct, status: correct ? "correct" as const : "incorrect" as const, marksEarned: correct ? question.maxMarks : 0 };
}

export function submitExamination(attempt: ExaminationAttempt, now = new Date().toISOString()): ExaminationAttempt {
  if (attempt.submittedAt) throw new Error("Submitted examinations cannot be changed.");
  const questionResults = attempt.questionSnapshots.map((question) => {
    const answer = attempt.answers[question.questionId] ?? "";
    const mark = autoMark(question, answer);
    return {
      questionId: question.questionId,
      answer,
      marksEarned: mark.marksEarned,
      maxMarks: question.maxMarks,
      correct: mark.correct,
      status: mark.status,
      feedback: mark.correct === null
        ? "Manual review is required using the saved rubric."
        : mark.correct
          ? question.explanation
          : `Expected answer: ${String(question.correctAnswer ?? "See rubric")}. ${question.explanation}`
    };
  });
  const totalMarks = questionResults.reduce((total, result) => total + result.maxMarks, 0);
  const hasManual = questionResults.some((result) => result.correct === null);
  const marksEarned = questionResults.reduce((total, result) => total + result.marksEarned, 0);
  const scorePercent = hasManual ? null : (totalMarks > 0 ? marksEarned / totalMarks * 100 : null);
  const criticalFailure = attempt.questionSnapshots.some((question) =>
    question.critical && questionResults.some((result) => result.questionId === question.questionId && result.correct !== true)
  );
  return {
    ...attempt,
    submittedAt: now,
    totalMarks,
    marksEarned: hasManual ? null : marksEarned,
    scorePercent,
    grading: hasManual ? "manual" : "automatic",
    result: scorePercent === null ? null : scorePercent >= attempt.passingPercent && !criticalFailure ? "pass" : "not-yet-passed",
    questionResults
  };
}

export function gradeManualQuestions(
  attempt: ExaminationAttempt,
  grades: Record<string, { marksEarned: number; feedback: string }>
): ExaminationAttempt {
  if (!attempt.submittedAt) throw new Error("Submit an examination before manual grading.");
  if (attempt.grading !== "manual") throw new Error("This attempt does not require manual grading or is already graded.");
  if (attempt.manualGraded) throw new Error("Manual examination grades are finalized and immutable.");
  const questionResults = attempt.questionResults.map((result) => {
    if (result.correct !== null) return result;
    const grade = grades[result.questionId];
    if (!grade) return result;
    if (!Number.isFinite(grade.marksEarned) || grade.marksEarned < 0 || grade.marksEarned > result.maxMarks) {
      throw new Error(`Marks for question ${result.questionId} must be between 0 and ${result.maxMarks}.`);
    }
    if (typeof grade.feedback !== "string" || !grade.feedback.trim()) {
      throw new Error(`Provide evidence-based feedback for question ${result.questionId}.`);
    }
    return {
      ...result,
      marksEarned: grade.marksEarned,
      correct: grade.marksEarned === result.maxMarks,
      status: grade.marksEarned === result.maxMarks ? "correct" : grade.marksEarned > 0 ? "partial" : "incorrect",
      feedback: grade.feedback.trim()
    };
  });
  const allGraded = questionResults.every((result) => result.correct !== null);
  if (!allGraded) throw new Error("Grade every written or practical response before finalizing.");
  const marksEarned = questionResults.reduce((total, result) => total + result.marksEarned, 0);
  const scorePercent = attempt.totalMarks > 0 ? marksEarned / attempt.totalMarks * 100 : null;
  const criticalFailure = attempt.questionSnapshots.some((question) =>
    question.critical && questionResults.some((result) => result.questionId === question.questionId && result.correct !== true)
  );
  const grading = attempt.questionResults.map((result) => {
    if (result.correct !== null) return result;
    const grade = grades[result.questionId]!;
    const status: ExaminationAttempt["questionResults"][number]["status"] =
      grade.marksEarned === result.maxMarks ? "correct" : grade.marksEarned > 0 ? "partial" : "incorrect";
    return { ...result, marksEarned: grade.marksEarned, correct: status === "correct", status, feedback: grade.feedback.trim() };
  });
  return {
    ...attempt,
    questionResults: grading,
    marksEarned,
    scorePercent,
    grading: "manual",
    manualGraded: true,
    result: scorePercent === null ? null : scorePercent >= attempt.passingPercent && !criticalFailure ? "pass" : "not-yet-passed"
  };
}
