import assert from "node:assert/strict";
import test from "node:test";
import { createSeedData } from "../src/lib/seed";
import { applicationDataSchema } from "../src/lib/model";
import { catalogDocumentSchema, lessonBlockSchema, quizQuestionSchema } from "../src/lib/content/schema";
import { createSeedCatalog, findLesson, redactCourseForLearner, versionLessons } from "../src/lib/content/store";
import { checkExercise, gradeQuizQuestion } from "../src/lib/content/grading";
import {
  addLessonNote, completeLesson, courseProgress, enroll, openLesson, recordVideoProgress, submitExercise, submitQuiz, withdraw
} from "../src/lib/services/learning";
import { cardsFromLesson, createCard, dueCards, retentionRate, scheduleReview } from "../src/lib/services/flashcards";
import { diagramQuestions, nodeOrder } from "../src/lib/diagrams";
import { games, getGame, gradeGame, publicGame } from "../src/lib/games/content";
import { seedDiagrams } from "../src/lib/content/seed-diagrams";
import { diagramDefinitionSchema } from "../src/lib/model";

const catalog = createSeedCatalog();
const course = catalog.published["ai-engineering-foundations"];
const lessonRef = (id: string) => ({ course, lesson: findLesson(course, id)!.lesson });

test("seed catalogue validates, is published, labelled as seed, and every diagram reference resolves", () => {
  assert.equal(catalogDocumentSchema.safeParse(catalog).success, true);
  assert.equal(course.seed, true);
  assert.match(course.description, /not a comprehensive curriculum/);
  assert.equal(course.modules.flatMap((module) => module.lessons).length, 8);
  for (const diagram of seedDiagrams) assert.equal(diagramDefinitionSchema.safeParse(diagram).success, true, diagram.id);
});

test("seed lessons contain the full learning sequence", () => {
  for (const lesson of course.modules.flatMap((module) => module.lessons)) {
    const types = new Set(lesson.blocks.map((block) => block.type));
    assert.ok(types.has("text"), `${lesson.id} has explanations`);
    assert.ok(types.has("quiz"), `${lesson.id} has a knowledge check`);
    assert.ok(types.has("exercise") || types.has("checkpoint"), `${lesson.id} has practice`);
    assert.ok(types.has("reading"), `${lesson.id} links further reading`);
  }
});

test("seed worked-example exercises are correct according to their own checks", () => {
  const expected: Record<string, string> = {
    "vectors-and-dot-products#guided": "0.7071", "derivatives-and-gradient-descent#guided": "1.536",
    "probability-and-bayes#guided": "0.714", "classification-metrics#guided": "0.75", "attention-intuition#independent": "0.7870"
  };
  for (const [key, answer] of Object.entries(expected)) {
    const [lessonId, blockId] = key.split("#");
    const block = findLesson(course, lessonId)!.lesson.blocks.find((item) => item.id === blockId);
    assert.ok(block?.type === "exercise");
    assert.equal(checkExercise(block, answer), true, key);
  }
  // Independent recomputation of the attention example.
  const weight = Math.exp(2) / (Math.exp(2) + 2);
  assert.ok(Math.abs(weight - 0.787) < 0.0005);
});

test("content schema rejects invalid blocks and quiz keys", () => {
  assert.equal(lessonBlockSchema.safeParse({ id: "x", type: "image", url: "http://insecure.example/a.png", alt: "a" }).success, false, "https only");
  assert.equal(lessonBlockSchema.safeParse({ id: "Bad Id", type: "text", body: "" }).success, false);
  assert.equal(quizQuestionSchema.safeParse({ id: "q", prompt: "?", kind: "single", options: ["a", "b"], answer: ["c"] }).success, false);
  assert.equal(quizQuestionSchema.safeParse({ id: "q", prompt: "?", kind: "numeric", answer: ["NaN"] }).success, false);
  const broken = structuredClone(catalog);
  broken.courses[0].modules[0].lessons[0].blocks.push({ id: "missing-diagram", type: "diagram", diagramId: "does-not-exist", prompt: "" });
  assert.equal(catalogDocumentSchema.safeParse(broken).success, false);
  const duplicate = structuredClone(catalog);
  duplicate.courses[0].modules[1].lessons.push(structuredClone(duplicate.courses[0].modules[0].lessons[0]));
  assert.equal(catalogDocumentSchema.safeParse(duplicate).success, false, "lesson ids are unique across the catalogue");
});

test("learners never receive quiz answers or exercise check answers", () => {
  const redacted = redactCourseForLearner(course);
  const serialized = JSON.stringify(redacted);
  const quiz = findLesson(redacted, "vectors-and-dot-products")!.lesson.blocks.find((block) => block.type === "quiz");
  assert.ok(quiz?.type === "quiz");
  assert.deepEqual(quiz.questions[0].answer, ["hidden"]);
  assert.equal(quiz.questions[0].explanation, "");
  assert.ok(!serialized.includes('"answer":"0.7071"'));
  assert.equal(redacted.modules.flatMap((module) => module.lessons).length, 8, "structure is preserved");
});

test("publishing bumps only changed lessons' versions", () => {
  const edited = structuredClone(course);
  const lesson = edited.modules[0].lessons[0];
  lesson.summary = "Changed summary";
  const versioned = versionLessons(edited, course);
  assert.equal(versioned.modules[0].lessons[0].version, 2);
  assert.equal(versioned.modules[0].lessons[1].version, 1, "unchanged lessons keep their version");
  const added = structuredClone(course);
  added.modules[0].lessons.push({ ...structuredClone(lesson), id: "new-lesson" });
  assert.equal(versionLessons(added, course).modules[0].lessons.at(-1)!.version, 1);
});

test("quiz grading covers every question kind", () => {
  const question = (kind: "single" | "multiple" | "true-false" | "numeric" | "short", answer: string[], options: string[] = []) =>
    quizQuestionSchema.parse({ id: "q", prompt: "?", kind, options, answer, tolerance: kind === "numeric" ? 0.01 : 0 });
  assert.ok(gradeQuizQuestion(question("single", ["B"], ["A", "B"]), [" b "]));
  assert.ok(!gradeQuizQuestion(question("single", ["B"], ["A", "B"]), ["A"]));
  assert.ok(gradeQuizQuestion(question("multiple", ["A", "C"], ["A", "B", "C"]), ["C", "A"]));
  assert.ok(!gradeQuizQuestion(question("multiple", ["A", "C"], ["A", "B", "C"]), ["A"]), "partial selection is not correct");
  assert.ok(!gradeQuizQuestion(question("multiple", ["A", "C"], ["A", "B", "C"]), ["A", "B", "C"]), "extra selection is not correct");
  assert.ok(gradeQuizQuestion(question("true-false", ["false"]), ["False"]));
  assert.ok(gradeQuizQuestion(question("numeric", ["0.3"]), ["0.305"]));
  assert.ok(gradeQuizQuestion(question("numeric", ["0.3"]), ["3/10"]));
  assert.ok(!gradeQuizQuestion(question("numeric", ["0.3"]), ["0.32"]));
  assert.ok(!gradeQuizQuestion(question("numeric", ["0.3"]), []));
  assert.ok(gradeQuizQuestion(question("short", ["overfitting", "over-fitting"]), ["Over-fitting"]));
});

test("lesson progress: enrolment, quizzes, exercises, notes, video, and completion", () => {
  let data = createSeedData();
  data = openLesson(data, lessonRef("vectors-and-dot-products"), "2026-10-19T10:00:00.000Z");
  assert.equal(data.courseEnrollments.length, 1, "opening a lesson enrols");
  assert.equal(courseProgress(data, course).enrolled, true);

  const quiz = submitQuiz(data, lessonRef("vectors-and-dot-products"), "after-check", { q1: ["1"], q2: ["90°"], q3: ["true"] });
  assert.equal(quiz.grade.correct, 2);
  assert.equal(quiz.grade.total, 3);
  data = quiz.data;
  assert.throws(() => submitQuiz(data, lessonRef("vectors-and-dot-products"), "reading", {}), /not found/);

  const exercise = submitExercise(data, lessonRef("vectors-and-dot-products"), "guided", "0.7071");
  assert.equal(exercise.correct, true);
  data = exercise.data;
  assert.equal(data.practiceAttempts.at(-1)?.kind, "lesson-quiz");

  data = addLessonNote(data, lessonRef("vectors-and-dot-products"), { body: "Cosine ignores length", blockId: "video", videoSeconds: 75 }).data;
  assert.equal(data.lessonNotes[0].videoSeconds, 75);
  assert.throws(() => addLessonNote(data, lessonRef("vectors-and-dot-products"), { body: "x", blockId: "not-a-block" }));
  assert.throws(() => addLessonNote(data, lessonRef("vectors-and-dot-products"), { body: "  " }));

  data = recordVideoProgress(data, lessonRef("vectors-and-dot-products"), "video", 300, true);
  assert.equal(data.videoProgress[0].completed, true);
  assert.throws(() => recordVideoProgress(data, lessonRef("vectors-and-dot-products"), "video", -5, false));
  assert.throws(() => recordVideoProgress(data, lessonRef("vectors-and-dot-products"), "guided", 5, false), /Video was not found/);

  data = completeLesson(data, lessonRef("vectors-and-dot-products"));
  data = completeLesson(data, lessonRef("vectors-and-dot-products"));
  assert.equal(data.rewards.filter((reward) => reward.eventId === "reward-lesson" || reward.eventId === "lesson-completed-vectors-and-dot-products").length, 1, "lesson reward is awarded once");
  assert.equal(courseProgress(data, course).completedLessons, 1);
  assert.equal(data.competencies.length, 0, "lesson completion never creates competency records");
  assert.equal(applicationDataSchema.safeParse(data).success, true);

  data = withdraw(data, course.id);
  assert.equal(courseProgress(data, course).enrolled, false);
  data = enroll(data, course);
  assert.equal(courseProgress(data, course).completedLessons, 1, "progress is kept across re-enrolment");
});

test("flashcards follow the configured spaced-repetition stages", () => {
  const data = createSeedData();
  const now = new Date("2026-10-19T00:00:00.000Z");
  let card = createCard({ front: "Recall", back: "TP/(TP+FN)" }, data, now);
  assert.throws(() => createCard({ front: "recall", back: "dup" }, { ...data, flashcards: [card] }, now), /already exists/);
  assert.throws(() => createCard({ front: "", back: "x" }, data, now));
  const intervals = [1, 3, 7, 14, 30];
  card = scheduleReview(card, "good", intervals, now);
  assert.equal(card.stage, 1);
  assert.equal(card.dueAt, "2026-10-22T00:00:00.000Z");
  card = scheduleReview(card, "easy", intervals, now);
  assert.equal(card.stage, 3);
  card = scheduleReview(card, "easy", intervals, now);
  assert.equal(card.stage, 4, "stage is capped at the last interval");
  card = scheduleReview(card, "hard", intervals, now);
  assert.equal(card.stage, 4);
  card = scheduleReview(card, "again", intervals, now);
  assert.equal(card.stage, 0);
  assert.equal(card.dueAt, "2026-10-19T00:10:00.000Z");
  assert.equal(card.reviews.length, 5);
  assert.equal(retentionRate([card]), 60);
  assert.equal(retentionRate([]), null);
  assert.deepEqual(dueCards({ ...data, flashcards: [card] }, new Date("2026-10-19T00:05:00.000Z")), []);
  assert.equal(dueCards({ ...data, flashcards: [card] }, new Date("2026-10-19T00:10:00.000Z")).length, 1);

  const lesson = findLesson(course, "classification-metrics")!.lesson;
  const fromLesson = cardsFromLesson(data, lesson, now);
  assert.equal(fromLesson.length, lesson.glossary.length);
  assert.equal(cardsFromLesson({ ...data, flashcards: fromLesson }, lesson, now).length, 0, "no duplicates");
});

test("diagram questions are generated from structure and ordering is deterministic", () => {
  const diagram = seedDiagrams.find((item) => item.id === "gradient-descent-loop")!;
  const questions = diagramQuestions(diagram);
  assert.ok(questions.length >= 3);
  const afterLoss = questions.find((question) => question.id === "next-loss")!;
  assert.equal(afterLoss.answer, "Compute gradient ∇L(θ)");
  assert.ok(afterLoss.options.includes(afterLoss.answer));
  assert.equal(new Set(afterLoss.options).size, afterLoss.options.length);
  assert.deepEqual(diagramQuestions(diagram), questions, "same questions every time");
  assert.equal(questions.find((question) => question.id === "decision")?.answer, "Converged?");
  assert.equal(nodeOrder(diagram)[0], "init");
});

test("games: answers are hidden from players and graded on the server", () => {
  for (const game of games) {
    const shown = JSON.stringify(publicGame(game, 3));
    if (game.type === "code-output") for (const puzzle of game.puzzles) assert.ok(!shown.includes(puzzle.explanation));
    if (game.type === "bug-hunt") assert.ok(!shown.includes("bugLine"));
    if (game.type === "scenario") assert.ok(!shown.includes("explanation"));
  }
  const matching = getGame("match-ml-evaluation")!;
  assert.ok(matching.type === "matching");
  const perfect = gradeGame(matching, { matches: Object.fromEntries(matching.pairs.map((pair) => [pair.term, pair.definition])) });
  assert.equal(perfect.correct, true);
  const partial = gradeGame(matching, { matches: { Precision: matching.pairs[0].definition } });
  assert.equal(partial.score, 1);
  assert.equal(partial.mistakes.length, 4);

  const ordering = getGame("order-safe-quote")!;
  assert.ok(ordering.type === "ordering");
  assert.equal(gradeGame(ordering, { order: ordering.steps }).correct, true);
  const swapped = [...ordering.steps];
  [swapped[3], swapped[4]] = [swapped[4], swapped[3]];
  const result = gradeGame(ordering, { order: swapped });
  assert.equal(result.score, ordering.steps.length - 2);
  assert.throws(() => gradeGame(ordering, { order: ordering.steps.slice(1) }), /every step/);
  const shuffled = publicGame(ordering, 5) as { steps: string[] };
  assert.notDeepEqual(shuffled.steps, ordering.steps, "the presented order is never already solved");

  const bugs = getGame("bug-hunt-ml")!;
  assert.ok(bugs.type === "bug-hunt");
  assert.equal(gradeGame(bugs, { answers: Object.fromEntries(bugs.puzzles.map((puzzle) => [puzzle.id, String(puzzle.bugLine)])) }).correct, true);

  const code = getGame("code-output-python")!;
  assert.ok(code.type === "code-output");
  assert.equal(gradeGame(code, { answers: { "zip-columns": "[5,7,9]" } }).feedback.find((item) => item.id === "zip-columns")?.correct, true, "whitespace-insensitive");

  const sprint = getGame("math-sprint")!;
  const round = publicGame(sprint, 11) as { items: { problemId: string; variant: number }[] };
  assert.ok(!JSON.stringify(round).includes("steps"));
  assert.throws(() => gradeGame(sprint, { items: [] }), /Submit all/);
});
