import type { Metadata } from "next";
import { CourseCatalogue } from "@/components/courses/course-catalogue";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/server";
import { localizedTitle } from "@/lib/content/display";
import { courseMinutes } from "@/lib/content/schema";
import { listPublishedCourses } from "@/lib/content/store";
import { courseProgress } from "@/lib/services/learning";
import { loadUserData } from "@/lib/storage/user-store";

export const metadata: Metadata = { title: "Course catalogue" };

export default async function CoursesPage() {
  const { user } = await requireUser();
  const [courses, data] = await Promise.all([listPublishedCourses(), loadUserData(user.id)]);
  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Learn" title="Course catalogue" description="Platform-authored courses with explanations, diagrams, worked examples, practice, and knowledge checks. Third-party videos and readings are linked at their source, not copied." />
      <CourseCatalogue courses={courses.map((course) => ({
        id: course.id, title: course.title, description: course.description, difficulty: course.difficulty, tags: course.tags,
        category: course.category, seed: course.seed, moduleCount: course.modules.length,
        lessonCount: course.modules.reduce((total, module) => total + module.lessons.length, 0), estimatedMinutes: courseMinutes(course),
        displayTitle: localizedTitle(course, user.profile.preferredLanguage), progress: courseProgress(data, course)
      }))} />
    </div>
  );
}
