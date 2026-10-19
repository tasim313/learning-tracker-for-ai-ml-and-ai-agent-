import { randomInt, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { jsonError, readJsonObject, withUser } from "@/lib/auth/http";
import { parseNumber, withinTolerance } from "@/lib/content/grading";
import { getDiagrams } from "@/lib/content/store";
import { diagramQuestions } from "@/lib/diagrams";
import { games, getGame, gradeGame, publicGame } from "@/lib/games/content";
import { generateProblem, getProblem, problems } from "@/lib/math/problems";
import type { ApplicationData, PracticeAttempt } from "@/lib/model";
import { recordRewardEvent } from "@/lib/services/rewards";
import { loadUserData, updateUserData } from "@/lib/storage/user-store";

function attempt(fields: Omit<PracticeAttempt, "id" | "attemptedAt" | "work" | "timed" | "durationSeconds" | "variant" | "mistakes" | "topicId"> & Partial<PracticeAttempt>, data: ApplicationData): PracticeAttempt {
  const topicId = fields.topicId && data.topics.some((topic) => topic.id === fields.topicId) ? fields.topicId : null;
  return { variant: 0, work: "", timed: false, durationSeconds: null, mistakes: [], ...fields, topicId, id: randomUUID(), attemptedAt: new Date().toISOString() };
}

/** GET: practice catalogue (math problems, games) plus the caller's recent attempts. */
export const GET = withUser(async ({ request, user }) => {
  const params = new URL(request.url).searchParams;
  const gameId = params.get("game");
  if (gameId) {
    const game = getGame(gameId);
    if (!game) return jsonError("Game was not found.", 404);
    return NextResponse.json(publicGame(game, randomInt(1_000_000)));
  }
  const problemId = params.get("problem");
  if (problemId) {
    const definition = getProblem(problemId);
    if (!definition) return jsonError("Problem was not found.", 404);
    const variant = randomInt(1_000_000);
    const problem = generateProblem(problemId, variant);
    return NextResponse.json({ problemId, variant, title: definition.title, level: definition.level, prompt: problem.prompt, answerFormat: problem.answerFormat, hints: problem.hints });
  }
  const data = await loadUserData(user.id);
  return NextResponse.json({
    problems: problems.map(({ id, title, concept, level, commonMistakes }) => ({ id, title, concept, level, commonMistakes })),
    games: games.map(({ id, title, objective, rules, level, type }) => ({ id, title, objective, rules, level, type })),
    attempts: data.practiceAttempts.slice(-200)
  });
});

/** POST: grade on the server and record the attempt in the caller's data. */
export const POST = withUser(async ({ request, user }) => {
  const body = await readJsonObject(request);
  if (body.kind === "math") {
    const problemId = String(body.problemId ?? "");
    const definition = getProblem(problemId);
    if (!definition) return jsonError("Problem was not found.", 404);
    const variant = Number(body.variant);
    const problem = generateProblem(problemId, variant);
    const answer = String(body.answer ?? "").slice(0, 200);
    const value = parseNumber(answer);
    const correct = value !== null && withinTolerance(value, problem.answer, problem.tolerance);
    const work = typeof body.work === "string" ? body.work.slice(0, 20_000) : "";
    await updateUserData(user.id, (data) => ({
      data: { ...data, practiceAttempts: [...data.practiceAttempts, attempt({ kind: "math", itemId: problemId, variant, answer, work, score: correct ? 1 : 0, maxScore: 1, correct, topicId: definition.topicId, mistakes: correct ? [] : definition.commonMistakes }, data)] },
      result: null
    }));
    return NextResponse.json({
      correct, expected: problem.answer, exact: problem.exact ?? null, answerFormat: problem.answerFormat, steps: problem.steps,
      commonMistakes: correct ? [] : definition.commonMistakes,
      note: value === null ? "Your answer could not be read as a number." : null
    });
  }
  if (body.kind === "game") {
    const game = getGame(String(body.gameId ?? ""));
    if (!game) return jsonError("Game was not found.", 404);
    const graded = gradeGame(game, body.answer);
    const duration = typeof body.durationSeconds === "number" && Number.isInteger(body.durationSeconds) && body.durationSeconds >= 0 ? body.durationSeconds : null;
    await updateUserData(user.id, (data) => {
      const next = { ...data, practiceAttempts: [...data.practiceAttempts, attempt({ kind: "game", itemId: game.id, answer: JSON.stringify(body.answer).slice(0, 20_000), score: graded.score, maxScore: graded.maxScore, correct: graded.correct, mistakes: graded.mistakes.slice(0, 50), timed: body.timed === true, durationSeconds: duration, topicId: game.topicId }, data)] };
      // Points only for the first perfect result per game, so replaying cannot farm rewards.
      const award = graded.correct ? recordRewardEvent(next, { eventId: `game-perfect-${game.id}`, title: "Challenge completed", reason: `All answers correct in "${game.title}". Game scores are separate from examination results.`, points: 5, earnedAt: new Date().toISOString(), achievement: { id: "achievement-first-challenge", title: "First challenge completed" } }) : {};
      return { data: { ...next, ...award }, result: null };
    });
    return NextResponse.json(graded);
  }
  if (body.kind === "diagram") {
    const diagramId = String(body.diagramId ?? "");
    const data = await loadUserData(user.id);
    const diagram = (await getDiagrams([diagramId]))[0] ?? data.userDiagrams.find((item) => item.id === diagramId);
    if (!diagram) return jsonError("Diagram was not found.", 404);
    const questions = diagramQuestions(diagram);
    const answers = typeof body.answers === "object" && body.answers !== null ? body.answers as Record<string, unknown> : {};
    const feedback = questions.map((question) => ({ id: question.id, correct: answers[question.id] === question.answer, answer: question.answer }));
    const score = feedback.filter((item) => item.correct).length;
    await updateUserData(user.id, (current) => ({
      data: { ...current, practiceAttempts: [...current.practiceAttempts, attempt({ kind: "diagram", itemId: diagram.id, answer: JSON.stringify(answers).slice(0, 20_000), score, maxScore: Math.max(1, questions.length), correct: score === questions.length && questions.length > 0, mistakes: feedback.filter((item) => !item.correct).map((item) => `${questions.find((question) => question.id === item.id)?.prompt} → ${item.answer}`) }, current)] },
      result: null
    }));
    return NextResponse.json({ score, maxScore: questions.length, feedback });
  }
  return jsonError("Unknown practice kind.");
});
