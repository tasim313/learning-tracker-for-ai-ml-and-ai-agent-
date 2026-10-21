import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { EnrolButton } from "@/components/courses/enrol-button";
import { Markdown } from "@/components/markdown";
import { requireUser } from "@/lib/auth/server";
import { localizedContent, localizedTitle } from "@/lib/content/display";
import { courseMinutes } from "@/lib/content/schema";
import { getPublishedCourse } from "@/lib/content/store";
import { courseProgress } from "@/lib/services/learning";
import { loadUserData } from "@/lib/storage/user-store";

export const metadata: Metadata = { title: "Course details" };

export default async function CourseDetailsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const { user } = await requireUser();
  const sourceCourse = await getPublishedCourse(courseId);
  if (!sourceCourse) notFound();
  const language = user.profile.preferredLanguage ?? "en";
  const course = localizedContent(sourceCourse, language);
  const data = await loadUserData(user.id);
  const progress = courseProgress(data, course);
  const done = new Set(data.lessonProgress.filter((item) => item.courseId === course.id && item.completedAt).map((item) => item.lessonId));
  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500"><Link href="/courses" className="underline">Courses</Link> / {course.title}</nav>
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded bg-slate-100 px-2 py-0.5">{course.category}</span>
          <span className="rounded bg-slate-100 px-2 py-0.5">{course.difficulty}</span>
          <span className="rounded bg-slate-100 px-2 py-0.5">Version {course.version}</span>
          <span className="rounded bg-slate-100 px-2 py-0.5">Platform-authored</span>
          {course.seed && <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-800">Introductory seed course — not comprehensive</span>}
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">{localizedTitle(course, language)}</h1>
        {language === "bn" && <p className="mt-1 text-xs text-slate-500">বাংলা অনুবাদ যেখানে আছে সেখানে দেখানো হচ্ছে; অনুবাদ না থাকা অংশ ইংরেজিতে থাকবে।</p>}
        <Markdown className="mt-2 max-w-3xl">{course.description}</Markdown>
        <p className="mt-3 text-sm text-slate-600">{course.modules.length} modules · {progress.totalLessons} lessons · about {Math.round(courseMinutes(course) / 6) / 10} hours</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <EnrolButton courseId={course.id} enrolled={progress.enrolled} />
          {progress.nextLessonId && <Link href={`/courses/${course.id}/lessons/${progress.nextLessonId}`} className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800">{progress.completedLessons ? "Continue with the next lesson" : "Start the first lesson"}</Link>}
          {progress.enrolled && <span className="text-sm text-slate-600">{progress.completedLessons} of {progress.totalLessons} lessons complete ({progress.percent}%)</span>}
        </div>
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        {course.objectives.length > 0 && <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-base font-semibold text-slate-900">What you will be able to do</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{course.objectives.map((item) => <li key={item}>{item}</li>)}</ul></section>}
        {course.prerequisites.length > 0 && <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-base font-semibold text-slate-900">Prerequisites</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{course.prerequisites.map((item) => <li key={item}>{item}</li>)}</ul></section>}
      </div>
      {course.modules.map((module, moduleIndex) => (
        <section key={module.id} className="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby={`module-${module.id}`}>
          <h2 id={`module-${module.id}`} className="text-lg font-semibold text-slate-900">Module {moduleIndex + 1}: {module.title}</h2>
          {module.description && <p className="mt-1 text-sm text-slate-600">{module.description}</p>}
          <ol className="mt-3 divide-y divide-slate-100">
            {module.lessons.map((lesson) => (
              <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-start gap-2">
                  {done.has(lesson.id) ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" aria-label="Completed" /> : <Circle size={18} className="mt-0.5 shrink-0 text-slate-300" aria-label="Not completed" />}
                  <div className="min-w-0"><Link href={`/courses/${course.id}/lessons/${lesson.id}`} className="font-medium text-slate-900 underline-offset-2 focus-visible:underline">{localizedTitle(lesson, language)}</Link><p className="text-xs text-slate-500">{lesson.difficulty} · {lesson.estimatedMinutes} min · {lesson.blocks.length} sections</p></div>
                </div>
                <Link href={`/courses/${course.id}/lessons/${lesson.id}/tutorial`} className="text-xs font-medium text-blue-800 underline">Tutorial mode</Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
