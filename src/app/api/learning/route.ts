import { NextResponse } from "next/server";
import { jsonError, readJsonObject, withUser } from "@/lib/auth/http";
import { findLesson, getPublishedCourse } from "@/lib/content/store";
import {
  addLessonNote, completeBlock, completeLesson, deleteLessonNote, enroll, openLesson, recordVideoProgress, reopenLesson,
  setBookmark, setLearningMode, submitExercise, submitQuiz, updateLessonNote, withdraw
} from "@/lib/services/learning";
import { updateUserData } from "@/lib/storage/user-store";

function stringRecord(value: unknown): Record<string, string[]> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Answers must be an object.");
  return Object.fromEntries(Object.entries(value).map(([key, answer]) => [key, Array.isArray(answer) ? answer.map(String).slice(0, 20) : [String(answer ?? "")]]));
}

/** Learner course actions. Content always comes from the published catalogue, progress from the caller's own data. */
export const POST = withUser(async ({ request, user }) => {
  const body = await readJsonObject(request);
  const action = String(body.action ?? "");
  if (typeof body.courseId !== "string") return jsonError("Course id is required.");
  const course = await getPublishedCourse(body.courseId);
  if (!course) return jsonError("Course was not found or is not published.", 404);

  if (action === "enroll" || action === "withdraw") {
    await updateUserData(user.id, (data) => ({ data: action === "enroll" ? enroll(data, course) : withdraw(data, course.id), result: null }));
    return NextResponse.json({ ok: true });
  }
  if (action === "update-note" || action === "delete-note") {
    if (typeof body.noteId !== "string") return jsonError("Note id is required.");
    await updateUserData(user.id, (data) => ({ data: action === "update-note" ? updateLessonNote(data, body.noteId as string, body.body) : deleteLessonNote(data, body.noteId as string), result: null }));
    return NextResponse.json({ ok: true });
  }

  const found = typeof body.lessonId === "string" ? findLesson(course, body.lessonId) : null;
  if (!found) return jsonError("Lesson was not found in this course.", 404);
  const ref = { course, lesson: found.lesson };
  const blockId = typeof body.blockId === "string" ? body.blockId : "";

  const result = await updateUserData<Record<string, unknown>>(user.id, (data) => {
    if (data.examinationAttempts.some((attempt) => attempt.submittedAt === null && attempt.selfDeclaredClosedBook)) {
      throw new Error("Lessons are unavailable during a self-declared closed-book examination.");
    }
    switch (action) {
      case "open": return { data: openLesson(data, ref), result: {} };
      case "complete-block": return { data: completeBlock(data, ref, blockId), result: {} };
      case "mode": return { data: setLearningMode(data, ref, body.mode), result: {} };
      case "bookmark": return { data: setBookmark(data, ref, body.bookmarked === true), result: {} };
      case "complete-lesson": return { data: completeLesson(data, ref), result: {} };
      case "reopen-lesson": return { data: reopenLesson(data, ref), result: {} };
      case "video-progress": return { data: recordVideoProgress(data, ref, blockId, body.watchedSeconds, body.completed), result: {} };
      case "quiz": {
        const graded = submitQuiz(data, ref, blockId, stringRecord(body.answers));
        return { data: graded.data, result: { grade: graded.grade } };
      }
      case "exercise": {
        const checked = submitExercise(data, ref, blockId, typeof body.answer === "string" ? body.answer : "");
        return { data: checked.data, result: { correct: checked.correct } };
      }
      case "add-note": {
        const added = addLessonNote(data, ref, body);
        return { data: added.data, result: { note: added.note } };
      }
      default: throw new Error("Unknown learning action.");
    }
  });
  return NextResponse.json(result);
});
