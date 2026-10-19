import { NextResponse } from "next/server";
import { jsonError, withUser } from "@/lib/auth/http";
import { getDiagrams, getPublishedCourse, redactCourseForLearner } from "@/lib/content/store";
import { courseProgress } from "@/lib/services/learning";
import { loadUserData } from "@/lib/storage/user-store";

export const GET = withUser<{ courseId: string }>(async ({ user, params }) => {
  const course = await getPublishedCourse(params.courseId);
  if (!course) return jsonError("Course was not found or is not published.", 404);
  const data = await loadUserData(user.id);
  if (data.examinationAttempts.some((attempt) => attempt.submittedAt === null && attempt.selfDeclaredClosedBook)) {
    return jsonError("Course content is hidden during a self-declared closed-book examination.", 423);
  }
  const diagramIds = course.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.blocks.flatMap((block) => block.type === "diagram" ? [block.diagramId] : [])));
  return NextResponse.json({
    course: redactCourseForLearner(course),
    diagrams: await getDiagrams(diagramIds),
    progress: courseProgress(data, course),
    lessonProgress: data.lessonProgress.filter((item) => item.courseId === course.id),
    notes: data.lessonNotes.filter((item) => item.courseId === course.id),
    videoProgress: data.videoProgress.filter((item) => item.courseId === course.id)
  });
});
