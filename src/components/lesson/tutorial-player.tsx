"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { LessonBlockView } from "@/components/lesson/blocks";
import { learningAction } from "@/components/lesson/api";
import type { LessonViewerProps } from "@/components/lesson/lesson-viewer";

const interactiveTypes = new Set(["quiz", "exercise", "checkpoint", "reflection", "video"]);

/**
 * Step-by-step player: one section at a time. Interactive sections must be
 * attempted (or explicitly skipped) before moving on; the position resumes at the
 * first section not yet completed.
 */
export function TutorialPlayer(props: LessonViewerProps) {
  const { lesson, courseId } = props;
  const [completed, setCompleted] = useState(new Set(props.progress?.completedBlockIds ?? []));
  const [skipped, setSkipped] = useState(new Set<string>());
  const firstOpen = lesson.blocks.findIndex((block) => interactiveTypes.has(block.type) && !completed.has(block.id));
  const [index, setIndex] = useState(firstOpen > 0 ? firstOpen : 0);
  const [finished, setFinished] = useState(Boolean(props.progress?.completedAt));
  const [error, setError] = useState("");
  const diagrams = useMemo(() => new Map(props.diagrams.map((diagram) => [diagram.id, diagram])), [props.diagrams]);
  const block = lesson.blocks[index];
  const needsAttempt = interactiveTypes.has(block.type) && !completed.has(block.id) && !skipped.has(block.id);
  const atEnd = index === lesson.blocks.length - 1;

  useEffect(() => {
    void learningAction({ action: "open", courseId, lessonId: lesson.id }).catch((cause: Error) => setError(cause.message));
  }, [courseId, lesson.id]);

  async function next() {
    if (!interactiveTypes.has(block.type) && !completed.has(block.id)) {
      // Reading sections count as done when the learner moves past them.
      try {
        await learningAction({ action: "complete-block", courseId, lessonId: lesson.id, blockId: block.id });
        setCompleted((current) => new Set(current).add(block.id));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Progress was not saved.");
        return;
      }
    }
    setIndex((value) => Math.min(lesson.blocks.length - 1, value + 1));
    window.scrollTo({ top: 0 });
  }

  async function finish() {
    try {
      await learningAction({ action: "complete-lesson", courseId, lessonId: lesson.id });
      setFinished(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Lesson was not marked complete.");
    }
  }

  const button = "inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 disabled:opacity-50";
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500"><Link href={`/courses/${courseId}`} className="underline">{props.courseTitle}</Link> / <Link href={`/courses/${courseId}/lessons/${lesson.id}`} className="underline">{props.displayTitle}</Link> / Tutorial</nav>
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{props.displayTitle}</h1>
        <p className="mt-1 text-sm text-slate-600" aria-live="polite">Section {index + 1} of {lesson.blocks.length}</p>
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {lesson.blocks.map((item, position) => <span key={item.id} className={`h-1.5 flex-1 rounded-full ${completed.has(item.id) ? "bg-emerald-500" : position === index ? "bg-blue-600" : "bg-slate-200"}`} />)}
        </div>
      </header>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <LessonBlockView key={block.id} block={block} context={{
        courseId, lessonId: lesson.id, completed: completed.has(block.id), diagrams,
        onCompleted: (blockId) => setCompleted((current) => new Set(current).add(blockId)),
        onNoteAdded: () => undefined,
        videoProgress: props.videoProgress.find((item) => item.blockId === block.id)
      }} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className={button} disabled={index === 0} onClick={() => setIndex((value) => value - 1)}><ArrowLeft size={15} aria-hidden="true" />Back</button>
        <div className="flex flex-wrap items-center gap-3">
          {needsAttempt && <button type="button" className="text-sm font-medium text-slate-600 underline" onClick={() => setSkipped((current) => new Set(current).add(block.id))}>Skip for now</button>}
          {!atEnd && <button type="button" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={needsAttempt} onClick={next}>Continue<ArrowRight size={15} aria-hidden="true" /></button>}
          {atEnd && !finished && <button type="button" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={needsAttempt} onClick={finish}><CheckCircle2 size={15} aria-hidden="true" />Finish lesson</button>}
          {atEnd && finished && (props.next
            ? <Link href={`/courses/${courseId}/lessons/${props.next.id}/tutorial`} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white">Next lesson: {props.next.title}<ArrowRight size={15} aria-hidden="true" /></Link>
            : <Link href={`/courses/${courseId}`} className={button}>Back to the course</Link>)}
        </div>
      </div>
      {needsAttempt && <p className="text-xs text-slate-500">Attempt this section to continue, or skip it and come back later.</p>}
    </div>
  );
}
