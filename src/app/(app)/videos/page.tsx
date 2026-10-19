import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatSeconds } from "@/components/lesson/api";
import { requireUser } from "@/lib/auth/server";
import { listPublishedCourses } from "@/lib/content/store";
import { loadUserData } from "@/lib/storage/user-store";

export const metadata: Metadata = { title: "Video lessons" };

export default async function VideosPage() {
  const { user } = await requireUser();
  const [courses, data] = await Promise.all([listPublishedCourses(), loadUserData(user.id)]);
  const videos = courses.flatMap((course) => course.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.blocks.flatMap((block) =>
    block.type === "video" ? [{ course, lesson, block, progress: data.videoProgress.find((item) => item.lessonId === lesson.id && item.blockId === block.id), noteCount: data.lessonNotes.filter((note) => note.lessonId === lesson.id && note.blockId === block.id).length }] : []
  ))));
  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Learn" title="Video lessons" description="Videos linked from course lessons. They are embedded only where the source allows it. Your watch progress is what you record; the platform cannot see the video provider's history." />
      {videos.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No published lessons contain videos yet.</p> : (
        <ul className="grid gap-4 md:grid-cols-2">
          {videos.map(({ course, lesson, block, progress, noteCount }) => (
            <li key={`${lesson.id}-${block.id}`} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500">{course.title} · {lesson.title}</p>
              <h2 className="mt-1 text-base font-semibold text-slate-900">{block.title}</h2>
              <p className="text-xs text-slate-500">{block.publisher}</p>
              <p className="mt-2 flex items-center gap-1 text-sm text-slate-700">
                {progress?.completed ? <><CheckCircle2 size={15} className="text-emerald-600" aria-hidden="true" />Watched</> : progress ? `Watched up to ${formatSeconds(progress.watchedSeconds)}` : "Not started"}
                {noteCount > 0 && <span className="ml-2 text-xs text-slate-500">· {noteCount} note{noteCount === 1 ? "" : "s"}</span>}
              </p>
              <Link href={`/videos/${course.id}/${lesson.id}/${block.id}`} className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-800"><PlayCircle size={14} aria-hidden="true" />Open player and notes</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
