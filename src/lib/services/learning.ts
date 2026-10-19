import { randomUUID } from "node:crypto";
import type { ApplicationData, LearningMode, LessonProgress } from "@/lib/model";
import { learningModes } from "@/lib/model";
import type { Course, Lesson } from "@/lib/content/schema";
import { checkExercise, gradeQuiz, type QuizGrade } from "@/lib/content/grading";
import { recordRewardEvent } from "@/lib/services/rewards";

/**
 * Learner course progress. All functions are pure: they take the learner's own
 * data plus published content and return updated data.
 */

type LessonRef = { course: Course; lesson: Lesson };

function findProgress(data: ApplicationData, lessonId: string) {
  return data.lessonProgress.find((item) => item.lessonId === lessonId) ?? null;
}

function upsertProgress(data: ApplicationData, ref: LessonRef, now: string, change: (progress: LessonProgress) => LessonProgress): ApplicationData {
  const existing = findProgress(data, ref.lesson.id);
  const base: LessonProgress = existing ?? {
    id: randomUUID(), courseId: ref.course.id, lessonId: ref.lesson.id, lessonVersion: ref.lesson.version,
    startedAt: now, completedAt: null, completedBlockIds: [], quizResults: [], bookmarked: false, lastMode: "read", updatedAt: now
  };
  const updated = { ...change(base), updatedAt: now };
  return {
    ...data,
    lessonProgress: existing ? data.lessonProgress.map((item) => item.id === existing.id ? updated : item) : [...data.lessonProgress, updated]
  };
}

export function enroll(data: ApplicationData, course: Course, now = new Date().toISOString()): ApplicationData {
  const existing = data.courseEnrollments.find((item) => item.courseId === course.id);
  if (existing?.status === "active") return data;
  if (existing) return { ...data, courseEnrollments: data.courseEnrollments.map((item) => item.id === existing.id ? { ...item, status: "active" } : item) };
  return { ...data, courseEnrollments: [...data.courseEnrollments, { id: randomUUID(), courseId: course.id, enrolledAt: now, status: "active" }] };
}

export function withdraw(data: ApplicationData, courseId: string): ApplicationData {
  if (!data.courseEnrollments.some((item) => item.courseId === courseId)) throw new Error("You are not enrolled in this course.");
  // Progress is kept so re-enrolling continues where the learner stopped.
  return { ...data, courseEnrollments: data.courseEnrollments.map((item) => item.courseId === courseId ? { ...item, status: "withdrawn" } : item) };
}

function blockIds(lesson: Lesson) {
  return new Set(lesson.blocks.map((block) => block.id));
}

export function openLesson(data: ApplicationData, ref: LessonRef, now = new Date().toISOString()): ApplicationData {
  const enrolled = enroll(data, ref.course, now);
  return upsertProgress(enrolled, ref, now, (progress) => progress);
}

export function completeBlock(data: ApplicationData, ref: LessonRef, blockId: string, now = new Date().toISOString()): ApplicationData {
  if (!blockIds(ref.lesson).has(blockId)) throw new Error("That section is not part of this lesson.");
  return upsertProgress(data, ref, now, (progress) => progress.completedBlockIds.includes(blockId)
    ? progress
    : { ...progress, completedBlockIds: [...progress.completedBlockIds, blockId] });
}

export function setLearningMode(data: ApplicationData, ref: LessonRef, mode: unknown, now = new Date().toISOString()): ApplicationData {
  if (!learningModes.includes(mode as LearningMode)) throw new Error("Unknown learning mode.");
  return upsertProgress(data, ref, now, (progress) => ({ ...progress, lastMode: mode as LearningMode }));
}

export function setBookmark(data: ApplicationData, ref: LessonRef, bookmarked: boolean, now = new Date().toISOString()): ApplicationData {
  return upsertProgress(data, ref, now, (progress) => ({ ...progress, bookmarked }));
}

export function submitQuiz(data: ApplicationData, ref: LessonRef, blockId: string, responses: Record<string, string[]>, now = new Date().toISOString()): { data: ApplicationData; grade: QuizGrade } {
  const block = ref.lesson.blocks.find((item) => item.id === blockId);
  if (!block || block.type !== "quiz") throw new Error("Knowledge check was not found in this lesson.");
  const grade = gradeQuiz(block, responses);
  const next = upsertProgress(data, ref, now, (progress) => ({
    ...progress,
    quizResults: [...progress.quizResults, { blockId, phase: block.phase, correct: grade.correct, total: grade.total, attemptedAt: now }],
    completedBlockIds: progress.completedBlockIds.includes(blockId) ? progress.completedBlockIds : [...progress.completedBlockIds, blockId]
  }));
  return { data: next, grade };
}

export function submitExercise(data: ApplicationData, ref: LessonRef, blockId: string, answer: string, now = new Date().toISOString()): { data: ApplicationData; correct: boolean | null } {
  const block = ref.lesson.blocks.find((item) => item.id === blockId);
  if (!block || block.type !== "exercise") throw new Error("Exercise was not found in this lesson.");
  if (typeof answer !== "string" || answer.length > 20_000) throw new Error("Provide your answer as text.");
  const correct = checkExercise(block, answer);
  const attempt = {
    id: randomUUID(), kind: "lesson-quiz" as const, itemId: `${ref.lesson.id}#${blockId}`, variant: 0, answer, work: "",
    score: correct ? 1 : 0, maxScore: 1, correct: correct === true, mistakes: correct === false ? ["Answer did not match the expected result."] : [],
    timed: false, durationSeconds: null, topicId: null, attemptedAt: now
  };
  let next: ApplicationData = { ...data, practiceAttempts: [...data.practiceAttempts, attempt] };
  if (correct) next = completeBlock(next, ref, blockId, now);
  return { data: next, correct };
}

export function completeLesson(data: ApplicationData, ref: LessonRef, now = new Date().toISOString()): ApplicationData {
  const next = upsertProgress(data, ref, now, (progress) => ({ ...progress, completedAt: progress.completedAt ?? now, lessonVersion: ref.lesson.version }));
  const award = recordRewardEvent(next, {
    eventId: `lesson-completed-${ref.lesson.id}`,
    title: "Lesson completed",
    reason: `Completed the lesson "${ref.lesson.title}". Completing a lesson does not by itself establish competency.`,
    points: 3,
    earnedAt: now,
    achievement: { id: "achievement-first-lesson", title: "First lesson completed" }
  });
  const withAward = { ...next, ...award };
  const allDone = ref.course.modules.every((module) => module.lessons.every((lesson) => withAward.lessonProgress.some((item) => item.lessonId === lesson.id && item.completedAt)));
  return allDone
    ? { ...withAward, courseEnrollments: withAward.courseEnrollments.map((item) => item.courseId === ref.course.id ? { ...item, status: "completed" } : item) }
    : withAward;
}

export function reopenLesson(data: ApplicationData, ref: LessonRef, now = new Date().toISOString()): ApplicationData {
  return upsertProgress(data, ref, now, (progress) => ({ ...progress, completedAt: null }));
}

export function recordVideoProgress(data: ApplicationData, ref: LessonRef, blockId: string, watchedSeconds: unknown, completed: unknown, now = new Date().toISOString()): ApplicationData {
  const block = ref.lesson.blocks.find((item) => item.id === blockId);
  if (!block || block.type !== "video") throw new Error("Video was not found in this lesson.");
  if (typeof watchedSeconds !== "number" || !Number.isInteger(watchedSeconds) || watchedSeconds < 0 || watchedSeconds > 86_400) throw new Error("Watched time must be a whole number of seconds.");
  const done = completed === true;
  const existing = data.videoProgress.find((item) => item.lessonId === ref.lesson.id && item.blockId === blockId);
  const record = { id: existing?.id ?? randomUUID(), courseId: ref.course.id, lessonId: ref.lesson.id, blockId, watchedSeconds, completed: done, updatedAt: now };
  let next = { ...data, videoProgress: existing ? data.videoProgress.map((item) => item.id === existing.id ? record : item) : [...data.videoProgress, record] };
  if (done) next = completeBlock(next, ref, blockId, now);
  return next;
}

export function addLessonNote(data: ApplicationData, ref: LessonRef, input: Record<string, unknown>, now = new Date().toISOString()) {
  const blockId = typeof input.blockId === "string" && input.blockId ? input.blockId : null;
  if (blockId && !blockIds(ref.lesson).has(blockId)) throw new Error("That section is not part of this lesson.");
  const body = typeof input.body === "string" ? input.body.trim() : "";
  const quote = typeof input.quote === "string" ? input.quote.trim().slice(0, 2000) : "";
  if (!body && !quote) throw new Error("Write a note before saving.");
  const kind = input.kind === "highlight" || input.kind === "question" ? input.kind : "note";
  const seconds = input.videoSeconds;
  if (seconds !== undefined && seconds !== null && (typeof seconds !== "number" || !Number.isInteger(seconds) || seconds < 0)) throw new Error("Video time must be a whole number of seconds.");
  const note = {
    id: randomUUID(), courseId: ref.course.id, lessonId: ref.lesson.id, blockId, videoSeconds: typeof seconds === "number" ? seconds : null,
    kind, quote, body, createdAt: now, updatedAt: now
  } as ApplicationData["lessonNotes"][number];
  return { data: { ...data, lessonNotes: [...data.lessonNotes, note] }, note };
}

export function updateLessonNote(data: ApplicationData, noteId: string, body: unknown, now = new Date().toISOString()): ApplicationData {
  if (typeof body !== "string" || !body.trim()) throw new Error("Note text is required.");
  if (!data.lessonNotes.some((note) => note.id === noteId)) throw new Error("Note was not found.");
  return { ...data, lessonNotes: data.lessonNotes.map((note) => note.id === noteId ? { ...note, body: body.trim(), updatedAt: now } : note) };
}

export function deleteLessonNote(data: ApplicationData, noteId: string): ApplicationData {
  if (!data.lessonNotes.some((note) => note.id === noteId)) throw new Error("Note was not found.");
  return { ...data, lessonNotes: data.lessonNotes.filter((note) => note.id !== noteId) };
}

export type CourseProgressSummary = {
  courseId: string;
  enrolled: boolean;
  status: "active" | "completed" | "withdrawn" | null;
  completedLessons: number;
  totalLessons: number;
  percent: number;
  nextLessonId: string | null;
};

export function courseProgress(data: ApplicationData, course: Course): CourseProgressSummary {
  const lessons = course.modules.flatMap((module) => module.lessons);
  const completed = new Set(data.lessonProgress.filter((item) => item.courseId === course.id && item.completedAt).map((item) => item.lessonId));
  const enrollment = data.courseEnrollments.find((item) => item.courseId === course.id);
  const completedLessons = lessons.filter((lesson) => completed.has(lesson.id)).length;
  return {
    courseId: course.id,
    enrolled: enrollment?.status === "active" || enrollment?.status === "completed",
    status: enrollment?.status ?? null,
    completedLessons,
    totalLessons: lessons.length,
    percent: lessons.length ? Math.round(completedLessons / lessons.length * 100) : 0,
    nextLessonId: lessons.find((lesson) => !completed.has(lesson.id))?.id ?? null
  };
}
