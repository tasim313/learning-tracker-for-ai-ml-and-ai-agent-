import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonViewer } from "@/components/lesson/lesson-viewer";
import { requireUser } from "@/lib/auth/server";
import { loadLessonPage } from "@/lib/content/lesson-page";

export const metadata: Metadata = { title: "Lesson" };

export default async function LessonPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId, lessonId } = await params;
  const { user } = await requireUser();
  const page = await loadLessonPage(user, courseId, lessonId);
  if (!page) notFound();
  if (page.closedBook) return <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">Lessons are hidden while you have a self-declared closed-book examination in progress. Submit the examination to continue studying.</p>;
  return <LessonViewer {...page.props} />;
}
