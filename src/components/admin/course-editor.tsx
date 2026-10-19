"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { blockTemplates, contentRequest, newId, type ContentOverview } from "@/components/admin/content-api";
import { LessonBlockView } from "@/components/lesson/blocks";
import { checkExercise, gradeQuiz } from "@/lib/content/grading";
import { blockRoles, courseSchema, lessonBlockSchema, type Course, type Lesson, type LessonBlock } from "@/lib/content/schema";
import type { DiagramDefinition } from "@/lib/model";

const input = "mt-1 block min-h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm";
const small = "inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800 disabled:opacity-40";

function move<T>(items: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= items.length) return items;
  const copy = [...items];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

const lines = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean);
const commas = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

function BlockEditor({ block, onChange }: { block: LessonBlock; onChange: (block: LessonBlock) => void }) {
  const markdownField = block.type === "text" || block.type === "callout" ? "body" : block.type === "checkpoint" || block.type === "reflection" ? "prompt" : null;
  const [json, setJson] = useState(() => JSON.stringify(block, null, 2));
  const [jsonError, setJsonError] = useState("");
  useEffect(() => { setJson(JSON.stringify(block, null, 2)); }, [block]);

  function applyJson(value: string) {
    setJson(value);
    try {
      const parsed = lessonBlockSchema.safeParse(JSON.parse(value));
      if (!parsed.success) { setJsonError(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")); return; }
      setJsonError("");
      onChange(parsed.data);
    } catch {
      setJsonError("Not valid JSON yet.");
    }
  }

  if (markdownField) {
    const record = block as Record<string, unknown>;
    return (
      <div className="space-y-2">
        {block.type === "text" && <label className="block text-xs font-medium text-slate-700">Heading<input className={input} value={block.title} onChange={(event) => onChange({ ...block, title: event.target.value })} /></label>}
        {block.type === "callout" && (
          <label className="block text-xs font-medium text-slate-700">Tone
            <select className={input} value={block.tone} onChange={(event) => onChange({ ...block, tone: event.target.value as typeof block.tone })}>
              <option value="info">Note</option><option value="tip">Tip</option><option value="warning">Caution</option><option value="misconception">Common mistake</option>
            </select>
          </label>
        )}
        <label className="block text-xs font-medium text-slate-700">Markdown (tables, code, and $maths$ supported; raw HTML is not rendered)
          <textarea rows={8} className={`${input} py-2 font-mono`} value={String(record[markdownField] ?? "")} onChange={(event) => onChange({ ...block, [markdownField]: event.target.value } as LessonBlock)} />
        </label>
      </div>
    );
  }
  return (
    <label className="block text-xs font-medium text-slate-700">Block definition (JSON, validated as you type)
      <textarea rows={12} className={`${input} py-2 font-mono text-xs`} value={json} onChange={(event) => applyJson(event.target.value)} spellCheck={false} />
      {jsonError ? <span role="alert" className="mt-1 block text-xs text-red-700">{jsonError}</span> : <span className="mt-1 block text-xs text-emerald-700">Valid</span>}
    </label>
  );
}

function previewAction(lesson: Lesson) {
  return async (body: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const block = lesson.blocks.find((item) => item.id === body.blockId);
    if (body.action === "quiz" && block?.type === "quiz") return { grade: gradeQuiz(block, body.answers as Record<string, string[]>) };
    if (body.action === "exercise" && block?.type === "exercise") return { correct: checkExercise(block, String(body.answer ?? "")) };
    if (body.action === "add-note") return { note: { id: newId("preview-note"), body: body.body, kind: "note", blockId: body.blockId ?? null, videoSeconds: body.videoSeconds ?? null } };
    return {};
  };
}

export function CourseEditor({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [diagrams, setDiagrams] = useState<DiagramDefinition[]>([]);
  const [publishedVersion, setPublishedVersion] = useState<number | null>(null);
  const [selected, setSelected] = useState<{ module: number; lesson: number } | null>(null);
  const [preview, setPreview] = useState(false);
  const [newBlockType, setNewBlockType] = useState<LessonBlock["type"]>("text");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    contentRequest<ContentOverview>().then((overview) => {
      const found = overview.courses.find((item) => item.id === courseId);
      if (!found) { setError("Course was not found."); return; }
      setCourse(found);
      setDiagrams(overview.diagrams);
      setPublishedVersion(overview.published[courseId]?.version ?? null);
      if (found.modules[0]?.lessons[0]) setSelected({ module: 0, lesson: 0 });
    }).catch((cause: Error) => setError(cause.message));
  }, [courseId]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const validation = useMemo(() => course ? courseSchema.safeParse(course) : null, [course]);
  const diagramMap = useMemo(() => new Map(diagrams.map((diagram) => [diagram.id, diagram])), [diagrams]);

  if (!course) return error ? <p role="alert" className="text-sm text-red-700">{error}</p> : <p className="text-sm text-slate-600">Loading course…</p>;

  function update(change: (current: Course) => Course) {
    setCourse((current) => current && change(current));
    setDirty(true);
    setNotice("");
  }
  const lesson = selected ? course.modules[selected.module]?.lessons[selected.lesson] : undefined;
  function updateLesson(change: (current: Lesson) => Lesson) {
    if (!selected) return;
    update((current) => ({
      ...current,
      modules: current.modules.map((module, moduleIndex) => moduleIndex !== selected.module ? module : {
        ...module, lessons: module.lessons.map((item, lessonIndex) => lessonIndex === selected.lesson ? change(item) : item)
      })
    }));
  }

  async function save() {
    setError("");
    if (!validation?.success) { setError(`Fix these problems before saving: ${validation?.error.issues.slice(0, 5).map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`); return; }
    try {
      const saved = await contentRequest<Course>({ action: "save-course", course });
      setCourse(saved);
      setDirty(false);
      setNotice("Draft saved. Learners still see the published version until you publish.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Draft was not saved.");
    }
  }

  async function publish() {
    if (dirty) { setError("Save the draft before publishing."); return; }
    if (!window.confirm("Publish this draft to learners? The previous version stays in history, and completed examination attempts are not affected.")) return;
    try {
      const result = await contentRequest<{ version: number }>({ action: "publish", id: course!.id });
      setPublishedVersion(result.version);
      setNotice(`Published version ${result.version}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Publishing failed.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <p className="text-xs text-slate-500"><Link href="/admin/content" className="underline">Content management</Link> / {course.id}</p>
          <p className="text-sm font-semibold text-slate-900">{course.title} · {publishedVersion ? `published v${publishedVersion}` : "not published"}{dirty ? " · unsaved changes" : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={small} onClick={() => setPreview((value) => !value)} aria-pressed={preview}>{preview ? <><Pencil size={13} aria-hidden="true" />Edit</> : <><Eye size={13} aria-hidden="true" />Preview lesson</>}</button>
          <button type="button" className="inline-flex min-h-8 items-center rounded-md border border-blue-700 bg-white px-3 text-xs font-semibold text-blue-800" onClick={save}>Save draft</button>
          <button type="button" className="inline-flex min-h-8 items-center rounded-md bg-blue-700 px-3 text-xs font-semibold text-white" onClick={publish}>Publish</button>
        </div>
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{notice}</p>}
      {validation && !validation.success && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">Validation: {validation.error.issues.slice(0, 3).map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}</p>}

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-4">
          <details className="rounded-xl border border-slate-200 bg-white p-4" open>
            <summary className="cursor-pointer text-sm font-semibold text-slate-900">Course details</summary>
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-medium text-slate-700">Title<input className={input} value={course.title} onChange={(event) => update((current) => ({ ...current, title: event.target.value }))} /></label>
              <label className="block text-xs font-medium text-slate-700">Description (Markdown)<textarea rows={4} className={`${input} py-2`} value={course.description} onChange={(event) => update((current) => ({ ...current, description: event.target.value }))} /></label>
              <label className="block text-xs font-medium text-slate-700">Objectives (one per line)<textarea rows={3} className={`${input} py-2`} value={course.objectives.join("\n")} onChange={(event) => update((current) => ({ ...current, objectives: lines(event.target.value) }))} /></label>
              <label className="block text-xs font-medium text-slate-700">Prerequisites (one per line)<textarea rows={2} className={`${input} py-2`} value={course.prerequisites.join("\n")} onChange={(event) => update((current) => ({ ...current, prerequisites: lines(event.target.value) }))} /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs font-medium text-slate-700">Difficulty<select className={input} value={course.difficulty} onChange={(event) => update((current) => ({ ...current, difficulty: event.target.value as Course["difficulty"] }))}><option value="fundamental">Fundamental</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
                <label className="block text-xs font-medium text-slate-700">Category<input className={input} value={course.category} onChange={(event) => update((current) => ({ ...current, category: event.target.value }))} /></label>
              </div>
              <label className="block text-xs font-medium text-slate-700">Tags (comma-separated)<input className={input} value={course.tags.join(", ")} onChange={(event) => update((current) => ({ ...current, tags: commas(event.target.value) }))} /></label>
              <label className="block text-xs font-medium text-slate-700">Bangla title (optional)<input className={input} value={course.translations.bn?.title ?? ""} onChange={(event) => update((current) => ({ ...current, translations: { bn: { title: event.target.value, summary: current.translations.bn?.summary ?? "" } } }))} /></label>
            </div>
          </details>
          <section className="rounded-xl border border-slate-200 bg-white p-4" aria-label="Modules and lessons">
            <h2 className="text-sm font-semibold text-slate-900">Modules and lessons</h2>
            <ol className="mt-3 space-y-4">
              {course.modules.map((module, moduleIndex) => (
                <li key={module.id} className="rounded-lg border border-slate-100 p-3">
                  <input aria-label={`Module ${moduleIndex + 1} title`} className={`${input} font-semibold`} value={module.title} onChange={(event) => update((current) => ({ ...current, modules: current.modules.map((item, index) => index === moduleIndex ? { ...item, title: event.target.value } : item) }))} />
                  <div className="mt-2 flex flex-wrap gap-1">
                    <button type="button" className={small} disabled={moduleIndex === 0} onClick={() => { update((current) => ({ ...current, modules: move(current.modules, moduleIndex, -1) })); setSelected(null); }} aria-label="Move module up"><ArrowUp size={12} /></button>
                    <button type="button" className={small} disabled={moduleIndex === course.modules.length - 1} onClick={() => { update((current) => ({ ...current, modules: move(current.modules, moduleIndex, 1) })); setSelected(null); }} aria-label="Move module down"><ArrowDown size={12} /></button>
                    <button type="button" className={small} onClick={() => {
                      const id = newId("lesson");
                      update((current) => ({ ...current, modules: current.modules.map((item, index) => index !== moduleIndex ? item : { ...item, lessons: [...item.lessons, { id, title: "New lesson", summary: "", objectives: [], prerequisites: [], difficulty: "beginner", tags: [], estimatedMinutes: 30, version: 1, relatedTopicIds: [], glossary: [], translations: {}, blocks: [blockTemplates.text() as LessonBlock] }] }) }));
                      setSelected({ module: moduleIndex, lesson: module.lessons.length });
                    }}><Plus size={12} aria-hidden="true" />Lesson</button>
                    <button type="button" className={small} onClick={() => { if (window.confirm(`Delete module "${module.title}" and its lessons from the draft?`)) { update((current) => ({ ...current, modules: current.modules.filter((_, index) => index !== moduleIndex) })); setSelected(null); } }}><Trash2 size={12} aria-hidden="true" />Module</button>
                  </div>
                  <ol className="mt-2 space-y-1">
                    {module.lessons.map((item, lessonIndex) => (
                      <li key={item.id} className="flex items-center gap-1">
                        <button type="button" onClick={() => setSelected({ module: moduleIndex, lesson: lessonIndex })} aria-current={selected?.module === moduleIndex && selected.lesson === lessonIndex}
                          className={`min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-xs ${selected?.module === moduleIndex && selected.lesson === lessonIndex ? "bg-blue-50 font-semibold text-blue-900" : "text-slate-700"}`}>{item.title}</button>
                        <button type="button" className={small} disabled={lessonIndex === 0} onClick={() => { update((current) => ({ ...current, modules: current.modules.map((m, index) => index === moduleIndex ? { ...m, lessons: move(m.lessons, lessonIndex, -1) } : m) })); setSelected(null); }} aria-label={`Move ${item.title} up`}><ArrowUp size={12} /></button>
                        <button type="button" className={small} disabled={lessonIndex === module.lessons.length - 1} onClick={() => { update((current) => ({ ...current, modules: current.modules.map((m, index) => index === moduleIndex ? { ...m, lessons: move(m.lessons, lessonIndex, 1) } : m) })); setSelected(null); }} aria-label={`Move ${item.title} down`}><ArrowDown size={12} /></button>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
            <button type="button" className={`${small} mt-3`} onClick={() => update((current) => ({ ...current, modules: [...current.modules, { id: newId("module"), title: "New module", description: "", lessons: [] }] }))}><Plus size={12} aria-hidden="true" />Add module</button>
          </section>
        </div>

        <div className="min-w-0 space-y-4">
          {!lesson ? <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">Select or add a lesson to edit it.</p> : preview ? (
            <div className="space-y-4">
              <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">Preview: knowledge checks are graded locally and nothing is saved.</p>
              <h2 className="text-2xl font-semibold text-slate-900">{lesson.title}</h2>
              {lesson.blocks.map((block) => {
                const parsed = lessonBlockSchema.safeParse(block);
                return parsed.success
                  ? <LessonBlockView key={block.id} block={parsed.data} context={{ courseId: course.id, lessonId: lesson.id, completed: false, diagrams: diagramMap, onCompleted: () => undefined, onNoteAdded: () => undefined, action: previewAction(lesson) }} />
                  : <p key={block.id} className="text-sm text-red-700">Block {block.id} is invalid and cannot be previewed.</p>;
              })}
            </div>
          ) : (
            <>
              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-slate-900">Lesson details</h2>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="block text-xs font-medium text-slate-700">Title<input className={input} value={lesson.title} onChange={(event) => updateLesson((current) => ({ ...current, title: event.target.value }))} /></label>
                  <label className="block text-xs font-medium text-slate-700">Lesson id<input className={`${input} font-mono`} value={lesson.id} onChange={(event) => updateLesson((current) => ({ ...current, id: event.target.value }))} /></label>
                  <label className="block text-xs font-medium text-slate-700 md:col-span-2">Summary<textarea rows={2} className={`${input} py-2`} value={lesson.summary} onChange={(event) => updateLesson((current) => ({ ...current, summary: event.target.value }))} /></label>
                  <label className="block text-xs font-medium text-slate-700">Objectives (one per line)<textarea rows={3} className={`${input} py-2`} value={lesson.objectives.join("\n")} onChange={(event) => updateLesson((current) => ({ ...current, objectives: lines(event.target.value) }))} /></label>
                  <label className="block text-xs font-medium text-slate-700">Glossary (one “term: definition” per line)<textarea rows={3} className={`${input} py-2`} value={lesson.glossary.map((entry) => `${entry.term}: ${entry.definition}`).join("\n")} onChange={(event) => updateLesson((current) => ({ ...current, glossary: lines(event.target.value).flatMap((line) => { const at = line.indexOf(":"); return at > 0 && line.slice(at + 1).trim() ? [{ term: line.slice(0, at).trim(), definition: line.slice(at + 1).trim() }] : []; }) }))} /></label>
                  <label className="block text-xs font-medium text-slate-700">Difficulty<select className={input} value={lesson.difficulty} onChange={(event) => updateLesson((current) => ({ ...current, difficulty: event.target.value as Lesson["difficulty"] }))}><option value="fundamental">Fundamental</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
                  <label className="block text-xs font-medium text-slate-700">Estimated minutes<input type="number" min={1} max={1000} className={input} value={lesson.estimatedMinutes} onChange={(event) => updateLesson((current) => ({ ...current, estimatedMinutes: Number(event.target.value) || 1 }))} /></label>
                  <label className="block text-xs font-medium text-slate-700">Prerequisite lesson ids (comma-separated)<input className={input} value={lesson.prerequisites.join(", ")} onChange={(event) => updateLesson((current) => ({ ...current, prerequisites: commas(event.target.value) }))} /></label>
                  <label className="block text-xs font-medium text-slate-700">Related roadmap topic ids (comma-separated)<input className={input} value={lesson.relatedTopicIds.join(", ")} onChange={(event) => updateLesson((current) => ({ ...current, relatedTopicIds: commas(event.target.value) }))} /></label>
                  <label className="block text-xs font-medium text-slate-700">Tags (comma-separated)<input className={input} value={lesson.tags.join(", ")} onChange={(event) => updateLesson((current) => ({ ...current, tags: commas(event.target.value) }))} /></label>
                  <label className="block text-xs font-medium text-slate-700">Bangla title (optional)<input className={input} value={lesson.translations.bn?.title ?? ""} onChange={(event) => updateLesson((current) => ({ ...current, translations: { bn: { title: event.target.value, summary: current.translations.bn?.summary ?? "" } } }))} /></label>
                </div>
                <button type="button" className={`${small} mt-3 border-red-300 text-red-800`} onClick={() => {
                  if (!selected || !window.confirm(`Remove "${lesson.title}" from the draft?`)) return;
                  update((current) => ({ ...current, modules: current.modules.map((module, index) => index === selected.module ? { ...module, lessons: module.lessons.filter((_, lessonIndex) => lessonIndex !== selected.lesson) } : module) }));
                  setSelected(null);
                }}><Trash2 size={12} aria-hidden="true" />Remove lesson</button>
              </section>
              <section className="space-y-3" aria-label="Lesson sections">
                {lesson.blocks.map((block, blockIndex) => (
                  <article key={block.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{blockIndex + 1}. {block.type} <span className="font-mono normal-case text-slate-400">#{block.id}</span></p>
                      <div className="flex flex-wrap items-center gap-1">
                        <label className="text-xs text-slate-600">Role <select className="ml-1 min-h-8 rounded-md border border-slate-300 px-1 text-xs" value={block.role ?? ""} onChange={(event) => updateLesson((current) => ({ ...current, blocks: current.blocks.map((item, index) => index === blockIndex ? { ...item, role: (event.target.value || undefined) as LessonBlock["role"] } : item) }))}><option value="">Default</option>{blockRoles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
                        <button type="button" className={small} disabled={blockIndex === 0} onClick={() => updateLesson((current) => ({ ...current, blocks: move(current.blocks, blockIndex, -1) }))} aria-label="Move section up"><ArrowUp size={12} /></button>
                        <button type="button" className={small} disabled={blockIndex === lesson.blocks.length - 1} onClick={() => updateLesson((current) => ({ ...current, blocks: move(current.blocks, blockIndex, 1) }))} aria-label="Move section down"><ArrowDown size={12} /></button>
                        <button type="button" className={small} onClick={() => { if (window.confirm("Delete this section?")) updateLesson((current) => ({ ...current, blocks: current.blocks.filter((_, index) => index !== blockIndex) })); }} aria-label="Delete section"><Trash2 size={12} /></button>
                      </div>
                    </div>
                    <BlockEditor block={block} onChange={(next) => updateLesson((current) => ({ ...current, blocks: current.blocks.map((item, index) => index === blockIndex ? next : item) }))} />
                  </article>
                ))}
                <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-4">
                  <label className="text-xs font-medium text-slate-700">Add a section
                    <select className="mt-1 block min-h-9 rounded-lg border border-slate-300 px-2 text-sm" value={newBlockType} onChange={(event) => setNewBlockType(event.target.value as LessonBlock["type"])}>
                      {Object.keys(blockTemplates).map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </label>
                  <button type="button" className={small} onClick={() => updateLesson((current) => ({ ...current, blocks: [...current.blocks, blockTemplates[newBlockType]() as LessonBlock] }))}><Plus size={12} aria-hidden="true" />Add</button>
                  <p className="w-full text-xs text-slate-500">Available diagrams: {diagrams.map((diagram) => diagram.id).join(", ")}</p>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
