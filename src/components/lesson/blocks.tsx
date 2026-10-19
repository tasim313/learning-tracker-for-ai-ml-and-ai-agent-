"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Info, Lightbulb, XCircle } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { DiagramViewer } from "@/components/diagram-viewer";
import { formatSeconds, learningAction, parseTimestamp } from "@/components/lesson/api";
import type { LessonBlock } from "@/lib/content/schema";
import type { DiagramDefinition } from "@/lib/model";

export type BlockContext = {
  courseId: string;
  lessonId: string;
  completed: boolean;
  onCompleted: (blockId: string) => void;
  onNoteAdded: (note: Record<string, unknown>) => void;
  diagrams: Map<string, DiagramDefinition>;
  videoProgress?: { watchedSeconds: number; completed: boolean };
  /** Overrides the server call; used by the authoring preview to grade locally without saving. */
  action?: (body: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

function act<T>(context: BlockContext, body: Record<string, unknown>): Promise<T> {
  return (context.action ? context.action(body) : learningAction(body)) as Promise<T>;
}

const button = "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 disabled:opacity-50";
const primary = "inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-blue-700 px-3 text-xs font-semibold text-white disabled:opacity-50";
const input = "mt-1 block min-h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm";

function Card({ label, children, done }: { label: string; children: ReactNode; done?: boolean }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5" aria-label={label}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        {done && <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 size={14} aria-hidden="true" />Done</span>}
      </div>
      {children}
    </section>
  );
}

function ErrorText({ message }: { message: string }) {
  return message ? <p role="alert" className="mt-2 text-sm text-red-700">{message}</p> : null;
}

function QuizBlock({ block, context }: { block: Extract<LessonBlock, { type: "quiz" }>; context: BlockContext }) {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<{ correct: number; total: number; questions: { id: string; correct: boolean; expected: string[]; explanation: string }[] } | null>(null);
  const [hints, setHints] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function setSingle(id: string, value: string) { setAnswers((current) => ({ ...current, [id]: [value] })); }
  function toggle(id: string, value: string) {
    setAnswers((current) => {
      const selected = new Set(current[id] ?? []);
      if (selected.has(value)) selected.delete(value); else selected.add(value);
      return { ...current, [id]: [...selected] };
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await act<{ grade: NonNullable<typeof result> }>(context, { action: "quiz", courseId: context.courseId, lessonId: context.lessonId, blockId: block.id, answers });
      setResult(response.grade);
      context.onCompleted(block.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Answers were not checked.");
    } finally {
      setPending(false);
    }
  }

  const phaseLabel = block.phase === "before" ? "Knowledge check · before the lesson" : block.phase === "after" ? "Knowledge check · after the lesson" : "Knowledge check";
  return (
    <Card label={phaseLabel} done={context.completed}>
      <h3 className="text-base font-semibold text-slate-900">{block.title}</h3>
      <form onSubmit={submit} className="mt-3 space-y-5">
        {block.questions.map((question, index) => {
          const graded = result?.questions.find((item) => item.id === question.id);
          return (
            <fieldset key={question.id} className="space-y-2">
              <legend className="text-sm font-medium text-slate-900"><span className="mr-1 text-slate-500">{index + 1}.</span><Markdown className="inline [&_p]:inline">{question.prompt}</Markdown></legend>
              {(question.kind === "single" || question.kind === "true-false") && (
                <div className="space-y-1">
                  {(question.kind === "true-false" ? ["true", "false"] : question.options).map((option) => (
                    <label key={option} className="flex items-center gap-2 text-sm text-slate-800">
                      <input type="radio" name={`${block.id}-${question.id}`} value={option} checked={(answers[question.id] ?? [])[0] === option} onChange={() => setSingle(question.id, option)} disabled={Boolean(result)} />
                      {question.kind === "true-false" ? (option === "true" ? "True" : "False") : option}
                    </label>
                  ))}
                </div>
              )}
              {question.kind === "multiple" && (
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Select all that apply.</p>
                  {question.options.map((option) => (
                    <label key={option} className="flex items-center gap-2 text-sm text-slate-800">
                      <input type="checkbox" checked={(answers[question.id] ?? []).includes(option)} onChange={() => toggle(question.id, option)} disabled={Boolean(result)} />{option}
                    </label>
                  ))}
                </div>
              )}
              {(question.kind === "numeric" || question.kind === "short") && (
                <input aria-label={`Answer to question ${index + 1}`} className={`${input} max-w-xs`} inputMode={question.kind === "numeric" ? "decimal" : "text"} value={(answers[question.id] ?? [""])[0]} onChange={(event) => setSingle(question.id, event.target.value)} disabled={Boolean(result)} />
              )}
              {question.hint && !result && (hints.has(question.id)
                ? <p className="text-xs text-slate-600"><Lightbulb size={12} className="mr-1 inline" aria-hidden="true" />{question.hint}</p>
                : <button type="button" className="text-xs font-medium text-blue-800 underline" onClick={() => setHints((current) => new Set(current).add(question.id))}>Show a hint</button>)}
              {graded && (
                <div className={`rounded-lg border px-3 py-2 text-sm ${graded.correct ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                  <p className="flex items-center gap-1 font-semibold">{graded.correct ? <><CheckCircle2 size={14} aria-hidden="true" />Correct</> : <><XCircle size={14} aria-hidden="true" />Not yet — expected: {graded.expected.join(", ")}</>}</p>
                  {graded.explanation && <Markdown className="mt-1">{graded.explanation}</Markdown>}
                </div>
              )}
            </fieldset>
          );
        })}
        {result
          ? <div className="flex flex-wrap items-center gap-3"><p className="text-sm font-semibold text-slate-900" role="status">{result.correct} of {result.total} correct</p><button type="button" className={button} onClick={() => { setResult(null); setAnswers({}); }}>Try again</button></div>
          : <button type="submit" className={primary} disabled={pending}>{pending ? "Checking…" : "Check answers"}</button>}
        <ErrorText message={error} />
      </form>
      <p className="mt-3 text-xs text-slate-500">Lesson knowledge checks are practice. They are recorded separately from formal examinations and do not change competency status.</p>
    </Card>
  );
}

function ExerciseBlock({ block, context }: { block: Extract<LessonBlock, { type: "exercise" }>; context: BlockContext }) {
  const [revealedSteps, setRevealedSteps] = useState(block.kind === "guided" ? 1 : 0);
  const [hintCount, setHintCount] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  async function check(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const response = await act<{ correct: boolean | null }>(context, { action: "exercise", courseId: context.courseId, lessonId: context.lessonId, blockId: block.id, answer });
      setResult(response.correct);
      if (response.correct) context.onCompleted(block.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Answer was not checked.");
    }
  }

  async function markDone() {
    try {
      await act(context, { action: "complete-block", courseId: context.courseId, lessonId: context.lessonId, blockId: block.id });
      context.onCompleted(block.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Not saved.");
    }
  }

  const label = block.kind === "guided" ? "Guided exercise" : block.kind === "practical" ? "Practical assignment" : "Independent exercise";
  return (
    <Card label={label} done={context.completed}>
      <h3 className="text-base font-semibold text-slate-900">{block.title}</h3>
      <Markdown className="mt-2">{block.prompt}</Markdown>
      {block.steps.length > 0 && (
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-800">
          {block.steps.slice(0, revealedSteps).map((step, index) => <li key={index}><Markdown className="[&_p]:my-0">{step}</Markdown></li>)}
        </ol>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {revealedSteps < block.steps.length && <button type="button" className={button} onClick={() => setRevealedSteps((value) => value + 1)}>{revealedSteps === 0 ? "Show the first step" : "Show next step"}</button>}
        {hintCount < block.hints.length && <button type="button" className={button} onClick={() => setHintCount((value) => value + 1)}><Lightbulb size={14} aria-hidden="true" />Hint</button>}
        {block.solution && <button type="button" className={button} onClick={() => setShowSolution((value) => !value)} aria-expanded={showSolution}>{showSolution ? "Hide worked solution" : "Compare with worked solution"}</button>}
      </div>
      {block.hints.slice(0, hintCount).map((hint, index) => <p key={index} className="mt-2 text-sm text-slate-700"><Lightbulb size={13} className="mr-1 inline text-amber-600" aria-hidden="true" /><Markdown className="inline [&_p]:inline">{hint}</Markdown></p>)}
      {block.check && (
        <form onSubmit={check} className="mt-4 flex flex-wrap items-end gap-2">
          <label className="text-sm font-medium text-slate-800">Your answer<input className={`${input} w-56`} value={answer} onChange={(event) => setAnswer(event.target.value)} required /></label>
          <button type="submit" className={primary}>Check</button>
          {result !== null && <p role="status" className={`w-full text-sm font-medium ${result ? "text-emerald-700" : "text-amber-800"}`}>{result ? "Correct." : "Not yet. Review the steps or compare your work with the solution."}</p>}
        </form>
      )}
      {!block.check && !context.completed && <button type="button" className={`${button} mt-4`} onClick={markDone}>{block.kind === "practical" ? "I completed this assignment" : "I attempted this exercise"}</button>}
      {block.kind === "practical" && <p className="mt-2 text-xs text-slate-500">Record your repository or demo as evidence on the related topic or in <Link href="/projects" className="underline">Projects</Link>. Practical work is reviewed against a rubric; code is not executed by the platform.</p>}
      {showSolution && <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase text-slate-500">Worked solution</p><Markdown>{block.solution}</Markdown></div>}
      <ErrorText message={error} />
    </Card>
  );
}

export function VideoBlock({ block, context, initialStart = 0 }: { block: Extract<LessonBlock, { type: "video" }>; context: BlockContext; initialStart?: number }) {
  const [start, setStart] = useState(initialStart);
  const [watched, setWatched] = useState(context.videoProgress ? formatSeconds(context.videoProgress.watchedSeconds) : "");
  const [noteAt, setNoteAt] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const embed = block.embedAllowed && block.provider === "youtube" && block.youtubeId;

  async function saveProgress(completed: boolean) {
    setError("");
    const seconds = parseTimestamp(watched || "0");
    if (seconds === null) { setError("Enter the time as m:ss or seconds."); return; }
    try {
      await act(context, { action: "video-progress", courseId: context.courseId, lessonId: context.lessonId, blockId: block.id, watchedSeconds: seconds, completed });
      setMessage(completed ? "Marked as watched." : "Progress saved.");
      if (completed) context.onCompleted(block.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Progress was not saved.");
    }
  }

  async function addNote(event: FormEvent) {
    event.preventDefault();
    setError("");
    const seconds = noteAt ? parseTimestamp(noteAt) : null;
    if (noteAt && seconds === null) { setError("Enter the note time as m:ss or seconds."); return; }
    try {
      const response = await act<{ note: Record<string, unknown> }>(context, { action: "add-note", courseId: context.courseId, lessonId: context.lessonId, blockId: block.id, body: note, videoSeconds: seconds });
      context.onNoteAdded(response.note);
      setNote("");
      setNoteAt("");
      setMessage("Note saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Note was not saved.");
    }
  }

  return (
    <Card label="Video" done={context.completed}>
      <h3 className="text-base font-semibold text-slate-900">{block.title}</h3>
      <p className="text-xs text-slate-500">{block.publisher}{block.publisher && " · "}{block.license}</p>
      {embed ? (
        <div className="mt-3 aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
          <iframe
            key={start}
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${block.youtubeId}?rel=0&start=${start}`}
            title={block.title}
            allow="encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
          />
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">This video is not embedded because embedding is not confirmed as permitted. Open it at the source.</p>
      )}
      <p className="mt-2 text-xs text-slate-500">If the embedded player does not load, the uploader may have disabled embedding. <a href={block.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-blue-800 underline">Open at source<ExternalLink size={12} aria-hidden="true" /></a></p>
      {block.chapters.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-700">Chapters</p>
          <ul className="mt-1 flex flex-wrap gap-2">{block.chapters.map((chapter) => <li key={chapter.seconds}><button type="button" className={button} onClick={() => setStart(chapter.seconds)}>{formatSeconds(chapter.seconds)} · {chapter.label}</button></li>)}</ul>
        </div>
      )}
      {block.keyConcepts.length > 0 && <div className="mt-3"><p className="text-xs font-semibold text-slate-700">Key concepts</p><ul className="mt-1 list-disc pl-5 text-sm">{block.keyConcepts.map((concept) => <li key={concept}>{concept}</li>)}</ul></div>}
      {block.followUpQuestions.length > 0 && <div className="mt-3"><p className="text-xs font-semibold text-slate-700">After watching, answer for yourself</p><ul className="mt-1 list-disc pl-5 text-sm">{block.followUpQuestions.map((question) => <li key={question}>{question}</li>)}</ul></div>}
      {block.transcriptUrl && <p className="mt-2 text-sm"><a href={block.transcriptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-800 underline">Transcript or captions (external)</a></p>}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-slate-700">Your watch progress</p>
          <p className="text-xs text-slate-500">Recorded by you; the platform cannot read the provider’s watch history.</p>
          <div className="mt-1 flex flex-wrap items-end gap-2">
            <label className="text-xs text-slate-700">Watched up to (m:ss)<input className={`${input} w-28`} value={watched} onChange={(event) => setWatched(event.target.value)} placeholder="12:30" /></label>
            <button type="button" className={button} onClick={() => saveProgress(false)}>Save position</button>
            <button type="button" className={primary} onClick={() => saveProgress(true)}>Mark as watched</button>
          </div>
        </div>
        <form onSubmit={addNote}>
          <p className="text-xs font-semibold text-slate-700">Note at a timestamp</p>
          <div className="mt-1 flex flex-wrap items-end gap-2">
            <label className="text-xs text-slate-700">Time<input className={`${input} w-24`} value={noteAt} onChange={(event) => setNoteAt(event.target.value)} placeholder="3:15" /></label>
            <label className="min-w-0 flex-1 text-xs text-slate-700">Note<input className={input} value={note} onChange={(event) => setNote(event.target.value)} required /></label>
            <button type="submit" className={button}>Add note</button>
          </div>
        </form>
      </div>
      {message && <p role="status" className="mt-2 text-sm text-emerald-800">{message}</p>}
      <ErrorText message={error} />
    </Card>
  );
}

function SimpleCompletion({ label, body, blockId, context, actionLabel }: { label: string; body: string; blockId: string; context: BlockContext; actionLabel: string }) {
  const [error, setError] = useState("");
  async function done() {
    try {
      await act(context, { action: "complete-block", courseId: context.courseId, lessonId: context.lessonId, blockId });
      context.onCompleted(blockId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Not saved.");
    }
  }
  return (
    <Card label={label} done={context.completed}>
      <Markdown>{body}</Markdown>
      {!context.completed && <button type="button" className={`${button} mt-3`} onClick={done}>{actionLabel}</button>}
      <ErrorText message={error} />
    </Card>
  );
}

function ReflectionBlock({ block, context }: { block: Extract<LessonBlock, { type: "reflection" }>; context: BlockContext }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const response = await act<{ note: Record<string, unknown> }>(context, { action: "add-note", courseId: context.courseId, lessonId: context.lessonId, blockId: block.id, body: text });
      await act(context, { action: "complete-block", courseId: context.courseId, lessonId: context.lessonId, blockId: block.id });
      context.onNoteAdded(response.note);
      context.onCompleted(block.id);
      setSaved(true);
      setText("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Reflection was not saved.");
    }
  }
  return (
    <Card label="Reflection" done={context.completed}>
      <Markdown>{block.prompt}</Markdown>
      <form onSubmit={save} className="mt-2">
        <label className="sr-only" htmlFor={`reflection-${block.id}`}>Your reflection</label>
        <textarea id={`reflection-${block.id}`} rows={3} className={`${input} py-2`} value={text} onChange={(event) => setText(event.target.value)} required />
        <button type="submit" className={`${button} mt-2`}>Save reflection to my notes</button>
        {saved && <p role="status" className="mt-2 text-sm text-emerald-800">Saved to your lesson notes.</p>}
        <ErrorText message={error} />
      </form>
    </Card>
  );
}

const calloutStyles = {
  info: { icon: Info, className: "border-blue-200 bg-blue-50 text-blue-950", label: "Note" },
  tip: { icon: Lightbulb, className: "border-emerald-200 bg-emerald-50 text-emerald-950", label: "Tip" },
  warning: { icon: AlertTriangle, className: "border-amber-200 bg-amber-50 text-amber-950", label: "Caution" },
  misconception: { icon: AlertTriangle, className: "border-rose-200 bg-rose-50 text-rose-950", label: "Common mistake" }
} as const;

export function LessonBlockView({ block, context }: { block: LessonBlock; context: BlockContext }) {
  switch (block.type) {
    case "text":
      return <section className="rounded-xl border border-slate-200 bg-white p-5">{block.title && <h2 className="text-lg font-semibold text-slate-900">{block.title}</h2>}<Markdown>{block.body}</Markdown></section>;
    case "callout": {
      const style = calloutStyles[block.tone];
      const Icon = style.icon;
      return <aside className={`rounded-xl border p-4 ${style.className}`} aria-label={style.label}><p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"><Icon size={14} aria-hidden="true" />{style.label}</p><Markdown className="text-inherit">{block.body}</Markdown></aside>;
    }
    case "code":
      return (
        <figure className="rounded-xl border border-slate-200 bg-white p-5">
          {block.caption && <figcaption className="mb-2 text-sm font-medium text-slate-800">{block.caption}</figcaption>}
          <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm"><code className="font-mono text-slate-800" data-language={block.language}>{block.code}</code></pre>
          <button type="button" className={`${button} mt-2`} onClick={() => void navigator.clipboard?.writeText(block.code)}>Copy code</button>
        </figure>
      );
    case "image":
      return <figure className="rounded-xl border border-slate-200 bg-white p-5">{/* External images are https-only (validated by the content schema). */}<img src={block.url} alt={block.alt} loading="lazy" className="max-w-full rounded-lg" /><figcaption className="mt-2 text-sm text-slate-600">{block.caption}{block.attribution && <span className="block text-xs text-slate-500">{block.attribution}</span>}</figcaption></figure>;
    case "video":
      return <VideoBlock block={block} context={context} />;
    case "diagram": {
      const diagram = context.diagrams.get(block.diagramId);
      return (
        <section className="space-y-2">
          {diagram ? <DiagramViewer diagram={diagram} /> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">This diagram is unavailable.</p>}
          {block.prompt && <p className="text-sm text-slate-700"><span className="font-semibold">Think about it: </span>{block.prompt}</p>}
          {diagram && <Link href={`/diagrams?diagram=${encodeURIComponent(diagram.id)}`} className="text-xs font-medium text-blue-800 underline">Answer questions about this diagram in the Diagram Learning Studio</Link>}
        </section>
      );
    }
    case "quiz":
      return <QuizBlock block={block} context={context} />;
    case "exercise":
      return <ExerciseBlock block={block} context={context} />;
    case "checkpoint":
      return <SimpleCompletion label="Pause and practise" body={block.prompt} blockId={block.id} context={context} actionLabel="I've worked through this" />;
    case "reflection":
      return <ReflectionBlock block={block} context={context} />;
    case "reading":
      return (
        <Card label="Further reading">
          <h3 className="text-base font-semibold text-slate-900">{block.title}</h3>
          <ul className="mt-2 space-y-3">
            {block.items.map((item) => (
              <li key={item.url} className="text-sm">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-blue-800 underline">{item.title}<ExternalLink size={12} aria-hidden="true" /></a>
                <p className="text-xs text-slate-500">{[item.publisher, item.kind, `Licence: ${item.license}`].filter(Boolean).join(" · ")}</p>
                {item.note && <p className="text-xs text-slate-600">{item.note}</p>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">Third-party material. Links open at the source and their availability has not been checked by the platform.</p>
        </Card>
      );
    case "download":
      return <Card label="Learning material"><a href={block.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-blue-800 underline">{block.title}<ExternalLink size={12} aria-hidden="true" /></a><p className="text-xs text-slate-500">{block.note} · Licence: {block.license}</p></Card>;
  }
}
