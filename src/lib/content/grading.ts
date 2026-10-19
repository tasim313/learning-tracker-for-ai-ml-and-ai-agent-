import type { LessonBlock, QuizQuestion } from "@/lib/content/schema";

export function normalizeAnswer(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

/** Parse a learner's numeric answer; accepts decimals, fractions ("1/6") and percentages ("16.7%"). */
export function parseNumber(value: string): number | null {
  const trimmed = value.trim().replace(/,/g, "");
  if (!trimmed) return null;
  const fraction = /^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/.exec(trimmed);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator === 0 ? null : Number(fraction[1]) / denominator;
  }
  const percent = /^(-?\d+(?:\.\d+)?)\s*%$/.exec(trimmed);
  if (percent) return Number(percent[1]) / 100;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}

export function withinTolerance(actual: number, expected: number, tolerance: number): boolean {
  // A tiny epsilon absorbs binary floating-point error such as 0.1 + 0.2.
  return Math.abs(actual - expected) <= tolerance + 1e-9 * Math.max(1, Math.abs(expected));
}

export function gradeQuizQuestion(question: QuizQuestion, response: string[]): boolean {
  const given = response.map(normalizeAnswer).filter(Boolean);
  const expected = question.answer.map(normalizeAnswer);
  switch (question.kind) {
    case "numeric": {
      const actual = parseNumber(response[0] ?? "");
      const target = Number(question.answer[0]);
      return actual !== null && withinTolerance(actual, target, question.tolerance);
    }
    case "multiple":
      return given.length === expected.length && expected.every((answer) => given.includes(answer));
    default:
      return given.length === 1 && expected.includes(given[0]);
  }
}

export type QuizGrade = {
  correct: number;
  total: number;
  questions: { id: string; correct: boolean; expected: string[]; explanation: string }[];
};

export function gradeQuiz(block: Extract<LessonBlock, { type: "quiz" }>, responses: Record<string, string[]>): QuizGrade {
  const questions = block.questions.map((question) => {
    const correct = gradeQuizQuestion(question, responses[question.id] ?? []);
    return { id: question.id, correct, expected: question.answer, explanation: question.explanation };
  });
  return { correct: questions.filter((question) => question.correct).length, total: questions.length, questions };
}

export function checkExercise(block: Extract<LessonBlock, { type: "exercise" }>, answer: string): boolean | null {
  if (!block.check) return null;
  if (block.check.kind === "numeric") {
    const actual = parseNumber(answer);
    return actual !== null && withinTolerance(actual, Number(block.check.answer), block.check.tolerance);
  }
  return normalizeAnswer(answer) === normalizeAnswer(block.check.answer);
}
