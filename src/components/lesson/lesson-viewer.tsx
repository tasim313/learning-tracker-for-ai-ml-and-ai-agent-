"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, CheckCircle2, PlayCircle } from "lucide-react";
import { LessonBlockView } from "@/components/lesson/blocks";
import { formatSeconds, learningAction } from "@/components/lesson/api";
import { Markdown } from "@/components/markdown";
import { defaultRole, type Lesson, type LessonBlock, type blockRoles } from "@/lib/content/schema";
import type { DiagramDefinition, LearningMode } from "@/lib/model";

type Role = (typeof blockRoles)[number];
type Note = { id: string; blockId: string | null; videoSeconds: number | null; kind: string; quote: string; body: string; updatedAt: string };
export type LessonViewerProps = {
  courseId: string;
  courseTitle: string;
  moduleTitle: string;
  lesson: Lesson;
  previous: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
  diagrams: DiagramDefinition[];
  progress: { completedBlockIds: string[]; completedAt: string | null; bookmarked: boolean; lastMode: LearningMode; quizResults: { blockId: string; correct: number; total: number }[] } | null;
  notes: Note[];
  videoProgress: { blockId: string; watchedSeconds: number; completed: boolean }[];
  topicTitles: Record<string, string>;
  prerequisiteTitles: Record<string, string>;
  displayTitle: string;
};

export const modes: { id: LearningMode; label: string; roles: Role[] | "all"; description: string }[] = [
  { id: "read", label: "Read and study", roles: "all", description: "Every section in order." },
  { id: "watch", label: "Watch and take notes", roles: ["media", "knowledge-check", "reflection"], description: "Videos with timestamped notes, then a knowledge check." },
  { id: "visualize", label: "Visualize", roles: ["visual", "explanation", "worked-example"], description: "Diagrams with the explanations and worked examples they illustrate." },
  { id: "practice", label: "Practise step by step", roles: ["guided-exercise", "independent-exercise", "knowledge-check"], description: "Guided steps first, then independent work and checks." },
  { id: "challenge", label: "Challenge", roles: ["independent-exercise", "knowledge-check"], description: "Unassisted exercises. Timed games are in the Game and Challenge Centre." },
  { id: "exam", label: "Exam mode", roles: ["knowledge-check"], description: "Knowledge checks only. Formal examinations are in the Examination dashboard." },
  { id: "review", label: "Review mistakes", roles: ["worked-example", "knowledge-check"], description: "Your notes, missed knowledge checks, and worked examples." },
  { id: "build", label: "Build a project", roles: ["practical", "independent-exercise"], description: "Practical assignments that produce evidence." }
];

const interactiveTypes = new Set<LessonBlock["type"]>(["quiz", "exercise", "checkpoint", "reflection", "video"]);

export function LessonViewer(props: LessonViewerProps) {
  const { courseId, lesson } = props;
  const [completed, setCompleted] = useState(new Set(props.progress?.completedBlockIds ?? []));
  const [lessonDone, setLessonDone] = useState(Boolean(props.progress?.completedAt));
  const [bookmarked, setBookmarked] = useState(props.progress?.bookmarked ?? false);
  const [mode, setMode] = useState<LearningMode>(props.progress?.lastMode ?? "read");
  const [notes, setNotes] = useState<Note[]>(props.notes);
  const [error, setError] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteKind, setNoteKind] = useState<"note" | "question" | "highlight">("note");
  const [quote, setQuote] = useState("");
  const diagrams = useMemo(() => new Map(props.diagrams.map((diagram) => [diagram.id, diagram])), [props.diagrams]);

  useEffect(() => {
    void learningAction({ action: "open", courseId, lessonId: lesson.id }).catch((cause: Error) => setError(cause.message));
  }, [courseId, lesson.id]);

  const interactive = lesson.blocks.filter((block) => interactiveTypes.has(block.type));
  const doneCount = interactive.filter((block) => completed.has(block.id)).length;
  const modeDefinition = modes.find((item) => item.id === mode) ?? modes[0];
  const missedQuizzes = new Set((props.progress?.quizResults ?? []).filter((result) => result.correct < result.total).map((result) => result.blockId));
  const visibleBlocks = lesson.blocks.filter((block) => {
    if (modeDefinition.roles === "all") return true;
    if (mode === "review" && block.type === "quiz") return missedQuizzes.has(block.id) || !completed.has(block.id);
    return modeDefinition.roles.includes(defaultRole(block));
  });

  async function changeMode(next: LearningMode) {
    setMode(next);
    try { await learningAction({ action: "mode", courseId, lessonId: lesson.id, mode: next }); } catch (cause) { setError(cause instanceof Error ? cause.message : "Mode was not saved."); }
  }
  async function toggleBookmark() {
    try {
      await learningAction({ action: "bookmark", courseId, lessonId: lesson.id, bookmarked: !bookmarked });
      setBookmarked(!bookmarked);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Bookmark was not saved."); }
  }
  async function toggleComplete() {
    try {
      await learningAction({ action: lessonDone ? "reopen-lesson" : "complete-lesson", courseId, lessonId: lesson.id });
      setLessonDone(!lessonDone);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Lesson status was not saved."); }
  }
  async function addNote(event: FormEvent) {
    event.preventDefault();
    try {
      const response = await learningAction<{ note: Note }>({ action: "add-note", courseId, lessonId: lesson.id, body: noteText, kind: noteKind, quote });
      setNotes((current) => [...current, response.note]);
      setNoteText("");
      setQuote("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Note was not saved."); }
  }
  async function deleteNote(id: string) {
    if (!window.confirm("Delete this note?")) return;
    try {
      await learningAction({ action: "delete-note", courseId, noteId: id });
      setNotes((current) => current.filter((note) => note.id !== id));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Note was not deleted."); }
  }

  const button = "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800";
  const blockTitle = (blockId: string | null) => {
    const block = lesson.blocks.find((item) => item.id === blockId);
    if (!block) return "Lesson";
    return "title" in block && block.title ? block.title : block.type;
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-5">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500"><Link href="/courses" className="underline">Courses</Link> / <Link href={`/courses/${courseId}`} className="underline">{props.courseTitle}</Link> / {props.moduleTitle}</nav>
        <header className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-slate-900">{props.displayTitle}</h1>
              <p className="mt-1 text-sm text-slate-600">{lesson.summary}</p>
              <p className="mt-2 text-xs text-slate-500">{lesson.difficulty} · about {lesson.estimatedMinutes} min · content version {lesson.version}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={button} onClick={toggleBookmark} aria-pressed={bookmarked}>{bookmarked ? <BookmarkCheck size={14} aria-hidden="true" /> : <Bookmark size={14} aria-hidden="true" />}{bookmarked ? "Bookmarked" : "Bookmark"}</button>
              <Link href={`/courses/${courseId}/lessons/${lesson.id}/tutorial`} className={button}><PlayCircle size={14} aria-hidden="true" />Interactive tutorial</Link>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-600"><span>Interactive sections completed</span><span>{doneCount} of {interactive.length}</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={interactive.length} aria-valuenow={doneCount} aria-label="Lesson progress"><div className="h-full bg-blue-600" style={{ width: `${interactive.length ? doneCount / interactive.length * 100 : 0}%` }} /></div>
          </div>
          <fieldset className="mt-4">
            <legend className="text-xs font-semibold text-slate-700">Learning mode (your progress is kept when you switch)</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {modes.map((item) => (
                <button key={item.id} type="button" onClick={() => changeMode(item.id)} aria-pressed={mode === item.id}
                  className={`min-h-9 rounded-lg border px-3 text-xs font-semibold ${mode === item.id ? "border-blue-700 bg-blue-50 text-blue-900" : "border-slate-300 bg-white text-slate-700"}`}>{item.label}</button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-600">{modeDefinition.description}{" "}
              {mode === "challenge" && <Link href="/games" className="underline">Open the Game and Challenge Centre</Link>}
              {mode === "exam" && <Link href="/exams" className="underline">Open the Examination dashboard</Link>}
              {mode === "build" && <Link href="/projects" className="underline">Record evidence in Projects</Link>}
              {mode === "review" && <Link href="/flashcards" className="underline">Review flashcards</Link>}
            </p>
          </fieldset>
        </header>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        {mode === "review" && notes.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-base font-semibold text-slate-900">Your notes for this lesson</h2><ul className="mt-2 space-y-2 text-sm">{notes.map((note) => <li key={note.id}><span className="text-xs text-slate-500">{note.kind}{note.videoSeconds !== null ? ` at ${formatSeconds(note.videoSeconds)}` : ""} · {blockTitle(note.blockId)}: </span>{note.quote && <q className="italic">{note.quote}</q>} {note.body}</li>)}</ul></section>
        )}
        {visibleBlocks.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">This lesson has no sections for this mode. Choose another mode.</p>}
        {visibleBlocks.map((block) => (
          <LessonBlockView key={block.id} block={block} context={{
            courseId, lessonId: lesson.id, completed: completed.has(block.id), diagrams,
            onCompleted: (blockId) => setCompleted((current) => new Set(current).add(blockId)),
            onNoteAdded: (note) => setNotes((current) => [...current, note as unknown as Note]),
            videoProgress: props.videoProgress.find((item) => item.blockId === block.id)
          }} />
        ))}
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <p className="text-sm font-semibold text-slate-900">{lessonDone ? "You marked this lesson complete." : "Finished studying?"}</p>
            <p className="text-xs text-slate-500">Completing a lesson records learning progress. Competency is shown separately and needs assessment evidence.</p>
          </div>
          <button type="button" onClick={toggleComplete} className={lessonDone ? button : "inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white"}>
            <CheckCircle2 size={15} aria-hidden="true" />{lessonDone ? "Mark as not complete" : "Mark lesson complete"}
          </button>
        </section>
        <nav aria-label="Lesson navigation" className="flex flex-wrap justify-between gap-3">
          {props.previous ? <Link href={`/courses/${courseId}/lessons/${props.previous.id}`} className={button}><ArrowLeft size={14} aria-hidden="true" />{props.previous.title}</Link> : <span />}
          {props.next && <Link href={`/courses/${courseId}/lessons/${props.next.id}`} className={button}>{props.next.title}<ArrowRight size={14} aria-hidden="true" /></Link>}
        </nav>
      </div>

      <aside className="space-y-4" aria-label="Lesson details and notes">
        {lesson.objectives.length > 0 && <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-sm font-semibold text-slate-900">Objectives</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{lesson.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul></section>}
        {lesson.prerequisites.length > 0 && <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-sm font-semibold text-slate-900">Prerequisites</h2><ul className="mt-2 space-y-1 text-sm">{lesson.prerequisites.map((id) => <li key={id}><Link href={`/courses/${courseId}/lessons/${id}`} className="text-blue-800 underline">{props.prerequisiteTitles[id] ?? id}</Link></li>)}</ul></section>}
        {lesson.relatedTopicIds.length > 0 && <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-sm font-semibold text-slate-900">Related roadmap topics</h2><ul className="mt-2 space-y-1 text-sm">{lesson.relatedTopicIds.map((id) => <li key={id}><Link href={`/topics?topic=${encodeURIComponent(id)}`} className="text-blue-800 underline">{props.topicTitles[id] ?? id}</Link></li>)}</ul></section>}
        {lesson.glossary.length > 0 && <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-sm font-semibold text-slate-900">Glossary</h2><dl className="mt-2 space-y-2 text-sm">{lesson.glossary.map((entry) => <div key={entry.term}><dt className="font-medium text-slate-900">{entry.term}</dt><dd className="text-slate-700">{entry.definition}</dd></div>)}</dl></section>}
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">My notes, highlights, and questions</h2>
          <form onSubmit={addNote} className="mt-2 space-y-2">
            <label className="block text-xs text-slate-700">Type
              <select value={noteKind} onChange={(event) => setNoteKind(event.target.value as typeof noteKind)} className="mt-1 block min-h-9 w-full rounded-lg border border-slate-300 px-2 text-sm">
                <option value="note">Note</option><option value="highlight">Highlight (quote a passage)</option><option value="question">Question to follow up</option>
              </select>
            </label>
            {noteKind === "highlight" && <label className="block text-xs text-slate-700">Passage<textarea rows={2} value={quote} onChange={(event) => setQuote(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-1 text-sm" /></label>}
            <label className="block text-xs text-slate-700">Text<textarea rows={3} value={noteText} onChange={(event) => setNoteText(event.target.value)} required={noteKind !== "highlight"} className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-1 text-sm" /></label>
            <button type="submit" className={button}>Save</button>
          </form>
          {notes.length === 0 ? <p className="mt-3 text-xs text-slate-500">No notes yet.</p> : (
            <ul className="mt-3 space-y-2">
              {notes.map((note) => (
                <li key={note.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-sm">
                  <p className="text-xs text-slate-500">{note.kind}{note.videoSeconds !== null ? ` · ${formatSeconds(note.videoSeconds)}` : ""} · {blockTitle(note.blockId)}</p>
                  {note.quote && <q className="block italic text-slate-700">{note.quote}</q>}
                  {note.body && <Markdown className="[&_p]:my-0">{note.body}</Markdown>}
                  <button type="button" onClick={() => deleteNote(note.id)} className="mt-1 text-xs text-red-700 underline">Delete</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}
