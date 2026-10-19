import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TutorialPlayer } from "@/components/lesson/tutorial-player";
import { requireUser } from "@/lib/auth/server";
import { loadLessonPage } from "@/lib/content/lesson-page";

export const metadata: Metadata = { title: "Interactive tutorial" };

export default async function TutorialPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId, lessonId } = await params;
  const { user } = await requireUser();
  const page = await loadLessonPage(user, courseId, lessonId);
  if (!page) notFound();
  if (page.closedBook) return <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">Lessons are hidden while a self-declared closed-book examination is in progress.</p>;
  return <TutorialPlayer {...page.props} />;
}
