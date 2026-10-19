import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VideoPlayer } from "@/components/lesson/video-player";
import { requireUser } from "@/lib/auth/server";
import { findLesson, getPublishedCourse } from "@/lib/content/store";
import { loadUserData } from "@/lib/storage/user-store";

export const metadata: Metadata = { title: "Video lesson" };

export default async function VideoLessonPage({ params, searchParams }: { params: Promise<{ courseId: string; lessonId: string; blockId: string }>; searchParams: Promise<{ t?: string }> }) {
  const { courseId, lessonId, blockId } = await params;
  const { t } = await searchParams;
  const { user } = await requireUser();
  const course = await getPublishedCourse(courseId);
  const found = course ? findLesson(course, lessonId) : null;
  const block = found?.lesson.blocks.find((item) => item.id === blockId);
  if (!course || !found || !block || block.type !== "video") notFound();
  const data = await loadUserData(user.id);
  const start = Number.parseInt(t ?? "0", 10);
  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500"><Link href="/videos" className="underline">Video lessons</Link> / <Link href={`/courses/${courseId}/lessons/${lessonId}`} className="underline">{found.lesson.title}</Link></nav>
      <VideoPlayer
        courseId={courseId} lessonId={lessonId} block={block}
        initialStart={Number.isInteger(start) && start >= 0 ? start : 0}
        notes={data.lessonNotes.filter((note) => note.lessonId === lessonId && note.blockId === blockId)}
        progress={data.videoProgress.find((item) => item.lessonId === lessonId && item.blockId === blockId)}
      />
    </div>
  );
}
