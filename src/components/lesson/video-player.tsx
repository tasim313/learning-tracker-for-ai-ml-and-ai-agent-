"use client";

import Link from "next/link";
import { useState } from "react";
import { VideoBlock } from "@/components/lesson/blocks";
import { formatSeconds } from "@/components/lesson/api";
import type { LessonBlock } from "@/lib/content/schema";

type Note = { id: string; videoSeconds: number | null; body: string; kind: string };

export function VideoPlayer({ courseId, lessonId, block, notes: initialNotes, progress, initialStart }: {
  courseId: string; lessonId: string; block: Extract<LessonBlock, { type: "video" }>; notes: Note[];
  progress?: { watchedSeconds: number; completed: boolean }; initialStart: number;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [completed, setCompleted] = useState(progress?.completed ?? false);
  const sorted = [...notes].sort((left, right) => (left.videoSeconds ?? -1) - (right.videoSeconds ?? -1));
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <VideoBlock block={block} initialStart={initialStart} context={{
        courseId, lessonId, completed, diagrams: new Map(), videoProgress: progress,
        onCompleted: () => setCompleted(true), onNoteAdded: (note) => setNotes((current) => [...current, note as unknown as Note])
      }} />
      <aside className="rounded-xl border border-slate-200 bg-white p-4" aria-label="Video notes">
        <h2 className="text-sm font-semibold text-slate-900">Notes for this video</h2>
        {sorted.length === 0 ? <p className="mt-2 text-xs text-slate-500">No notes yet. Add one with a timestamp below the video.</p> : (
          <ul className="mt-2 space-y-2">
            {sorted.map((note) => (
              <li key={note.id} className="rounded-lg bg-slate-50 p-2 text-sm">
                {note.videoSeconds !== null
                  ? <Link href={`?t=${note.videoSeconds}`} className="text-xs font-semibold text-blue-800 underline">Play from {formatSeconds(note.videoSeconds)}</Link>
                  : <span className="text-xs text-slate-500">No timestamp</span>}
                <p className="text-slate-800">{note.body}</p>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
