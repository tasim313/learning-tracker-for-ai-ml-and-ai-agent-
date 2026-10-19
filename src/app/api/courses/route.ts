import { NextResponse } from "next/server";
import { withUser } from "@/lib/auth/http";
import { courseMinutes } from "@/lib/content/schema";
import { listPublishedCourses } from "@/lib/content/store";
import { courseProgress } from "@/lib/services/learning";
import { loadUserData } from "@/lib/storage/user-store";

/** Published course catalogue with the caller's own progress. */
export const GET = withUser(async ({ user }) => {
  const [courses, data] = await Promise.all([listPublishedCourses(), loadUserData(user.id)]);
  return NextResponse.json(courses.map((course) => ({
    id: course.id, title: course.title, description: course.description, difficulty: course.difficulty, tags: course.tags,
    category: course.category, seed: course.seed, version: course.version, language: course.language, translations: course.translations,
    moduleCount: course.modules.length, lessonCount: course.modules.reduce((total, module) => total + module.lessons.length, 0),
    estimatedMinutes: courseMinutes(course), progress: courseProgress(data, course)
  })));
});
