"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Brain, CheckCircle2, Clock3, Code2 } from "lucide-react";
import { SettingsForm } from "@/components/settings-form";
import { ActiveExam } from "@/components/exams/active-exam";
import { PracticalExam } from "@/components/exams/practical-exam";
import { Markdown } from "@/components/markdown";
import { ResourceAvailability } from "@/components/resource-availability";
import { DisciplinePanel, ExamResultsPanel, GapReport, RewardsPanel } from "@/components/analytics/panels";
import { type FeaturePageDefinition, type FieldDefinition } from "@/lib/feature-pages";
import { elapsedSessionSeconds, timeEstimationAccuracy } from "@/lib/calculations/time";
import type { LearningSession } from "@/lib/model";

type DataRecord = Record<string, unknown> & { id: string };

export function FeatureManager({ section, definition }: { section: string; definition: FeaturePageDefinition }) {
  const [items, setItems] = useState<DataRecord[]>([]);
  const [topics, setTopics] = useState<DataRecord[]>([]);
  const [phases, setPhases] = useState<DataRecord[]>([]);
  const [editing, setEditing] = useState<DataRecord | null>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (definition.collection === "settings") {
        const response = await fetch("/api/settings", { cache: "no-store" });
        if (!response.ok) throw new Error(await responseMessage(response));
        const settings = await response.json() as Record<string, unknown>;
        setItems(Object.entries(settings).map(([key, value]) => ({ id: key, key, value })));
      } else {
        const response = await fetch(`/api/collections/${definition.collection}`, { cache: "no-store" });
        if (!response.ok) throw new Error(await responseMessage(response));
        const result = await response.json() as DataRecord[];
        setItems(result);
      }
      const [topicResponse, phaseResponse] = await Promise.all([
        fetch("/api/collections/topics", { cache: "no-store" }),
        fetch("/api/collections/roadmapPhases", { cache: "no-store" })
      ]);
      if (topicResponse.ok) setTopics(await topicResponse.json() as DataRecord[]);
      if (phaseResponse.ok) setPhases(await phaseResponse.json() as DataRecord[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load saved records.");
    } finally {
      setLoading(false);
    }
  }, [definition.collection]);

  useEffect(() => { void load(); }, [load]);

  const visibleItems = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    return items.filter((item) => !normalized || JSON.stringify(item).toLowerCase().includes(normalized));
  }, [items, query]);

  async function submit(formData: FormData) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = formPayload(definition.fields, formData, editing, topics, phases);
      if (section === "knowledge") payload.updatedAt = new Date().toISOString();
      if (section === "projects") payload.updatedAt = new Date().toISOString();
      const response = await fetch(`/api/collections/${definition.collection}`, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { ...editing, ...payload, id: editing.id } : payload)
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      setEditing(null);
      setMessage(editing ? "Changes saved." : "Record added.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save record.");
    } finally {
      setSaving(false);
    }
  }

  async function updateTopicStatus(item: DataRecord, status: string) {
    setError(""); setMessage("");
    try {
      const response = await fetch(`/api/collections/${definition.collection}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...item, status }) });
      if (!response.ok) throw new Error(await responseMessage(response));
      setMessage(`“${String(item.title)}” marked ${status.replaceAll("-", " ")}.`);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update learning progress."); }
  }

  async function remove(item: DataRecord) {
    if (!window.confirm("Delete this record? Related records may prevent deletion. This cannot be undone.")) return;
    setError("");
    try {
      const response = await fetch(`/api/collections/${definition.collection}?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await responseMessage(response));
      setMessage("Record deleted.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete record.");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
      {definition.fields.length > 0 && !definition.readOnly && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">{editing ? "Edit record" : "Add a record"}</h2>
          <form action={submit} className="mt-4 grid gap-4">
            {definition.fields.map((field) => (
              <FieldInput key={field.name} field={field} value={editing?.[field.name]} topics={topics} phases={phases} />
            ))}
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="submit" disabled={saving} className="min-h-10 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                {saving ? "Saving…" : editing ? "Save changes" : "Add record"}
              </button>
              {editing && <button type="button" onClick={() => setEditing(null)} className="min-h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-700">Cancel edit</button>}
            </div>
          </form>
        </section>
      )}

      {section === "resources" ? <ResourceLibrary items={visibleItems} topics={topics} phases={phases} /> : section === "topics" ? <TopicExplorer items={visibleItems} topics={topics} phases={phases} onEdit={setEditing} onStatusChange={updateTopicStatus} /> : !["exam-results", "answer-review", "exam-history", "exam-analytics", "exams", "active-exam", "practical-exam", "gaps", "competency", "discipline", "settings", "backup", "timer"].includes(section) && <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Saved records</h2>
            <p className="mt-1 text-xs text-slate-500">{items.length} stored · derived only from your records</p>
          </div>
          <label className="text-xs font-medium text-slate-600">
            Search
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="mt-1 block min-h-9 w-full rounded-md border border-slate-300 px-3 text-sm sm:w-56" placeholder="Filter records" />
          </label>
        </div>
        {loading ? <p className="mt-5 text-sm text-slate-500">Loading saved data…</p> : visibleItems.length === 0 ? (
          <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            {items.length === 0 ? "No records yet. Add your first item to begin." : "No records match your search."}
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {visibleItems.map((item) => (
              <article key={item.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-sm font-semibold text-slate-900">{recordTitle(item, topics, phases)}</h3>
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">{recordSummary(item, section)}</p>
                  </div>
                  {!definition.readOnly && definition.collection !== "assessments" && (
                    <div className="flex shrink-0 gap-2">
                      {definition.fields.length > 0 && <button type="button" onClick={() => setEditing(item)} className="min-h-8 rounded border border-slate-300 px-2.5 text-xs font-medium text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-700">Edit</button>}
                      <button type="button" onClick={() => void remove(item)} className="min-h-8 rounded border border-rose-200 px-2.5 text-xs font-medium text-rose-800 focus-visible:outline-2 focus-visible:outline-rose-700">Delete</button>
                    </div>
                  )}
                </div>
                {section === "knowledge" && (
                  <div className="mt-2">
                    {Array.isArray(item.tags) && item.tags.length > 0 && <ul className="flex flex-wrap gap-1" aria-label="Tags">{(item.tags as string[]).map((tag) => <li key={tag}><button type="button" onClick={() => setQuery(tag)} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">#{tag}</button></li>)}</ul>}
                    <details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-blue-800">Read note</summary><Markdown className="mt-2">{String(item.body ?? "")}</Markdown></details>
                  </div>
                )}
                {isHistorical(section) && <RecordDetails item={item} />}
              </article>
            ))}
          </div>
        )}
      </section>}
      {(message || error) && <div aria-live="polite" className={`xl:col-span-2 rounded-lg p-3 text-sm ${error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{error || message}</div>}
      {section === "settings" && <SettingsForm />}
      {section === "backup" && <BackupPanel />}
      {section === "reports" && <ReportPanel topics={topics} />}
      {section === "exams" && <ExamDashboard blueprints={items} />}
      {section === "active-exam" && <ActiveExam />}
      {section === "practical-exam" && <PracticalExam />}
      {section === "exam-analytics" && <ExamAnalytics attempts={items} topics={topics} />}
      {section === "exam-history" && <ExamHistory attempts={items} />}
      {section === "answer-review" && <AnswerReview attempts={items} />}
      {section === "discipline" && <DisciplinePanel />}
      {section === "rewards" && <RewardsPanel />}
      {section === "sales-agent" && <SalesAgentPlan projects={items} />}
      {section === "timer" && <TimerPanel topics={topics} />}
      {section === "exam-results" && <><ManualGrader attempts={items} reload={load} /><ExamResultsPanel attempts={items} /></>}
      {section === "planner" && <ReviewPlanner plans={items} />}
      {section === "competency" && <CompetencySummary topics={topics} />}
      {section === "gaps" && <GapReport />}
    </div>
  );
}

function TopicExplorer({ items, topics, phases, onEdit, onStatusChange }: { items: DataRecord[]; topics: DataRecord[]; phases: DataRecord[]; onEdit: (item: DataRecord) => void; onStatusChange: (item: DataRecord, status: string) => void }) {
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const phaseNames = new Map(phases.map((phase) => [String(phase.id), `${String(phase.order)}. ${String(phase.title)}`]));
  const filtered = items.filter((topic) => (phaseFilter === "all" || topic.phaseId === phaseFilter) && (statusFilter === "all" || topic.status === statusFilter));
  const completed = topics.filter((topic) => topic.status === "completed").length;
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Your lessons</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Learn one clear step at a time</h2><p className="mt-1 text-sm text-slate-600">Start a topic, try its exercise, then mark it complete when you’re ready.</p></div><div className="flex items-center gap-3"><div className="w-36"><div className="flex justify-between text-[11px] text-slate-500"><span>Path progress</span><span>{completed}/{topics.length}</span></div><div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500" style={{width:`${topics.length ? completed/topics.length*100 : 0}%`}}/></div></div><select aria-label="Filter by phase" value={phaseFilter} onChange={(event)=>setPhaseFilter(event.target.value)} className="min-h-9 max-w-44 rounded-lg border border-slate-300 px-2 text-xs"><option value="all">All stages</option>{phases.map((phase)=><option key={String(phase.id)} value={String(phase.id)}>{String(phase.order)}. {String(phase.title)}</option>)}</select></div></div><div className="mt-5 flex flex-wrap gap-2">{[["all","All"],["not-started","To learn"],["in-progress","In progress"],["needs-practice","Practice"],["needs-revision","Review"],["completed","Completed"]].map(([value,label])=><button key={value} type="button" onClick={()=>setStatusFilter(value)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${statusFilter===value?"bg-blue-700 text-white":"bg-slate-100 text-slate-600"}`}>{label}</button>)}</div><div className="mt-4 grid gap-3 lg:grid-cols-2">{filtered.map((topic)=>{const status=String(topic.status);return <article key={topic.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-medium text-blue-700">{phaseNames.get(String(topic.phaseId)) ?? "Learning path"}</p><h3 className="mt-1 font-semibold text-slate-950"><Link href={`/topics/${encodeURIComponent(String(topic.id))}`} className="underline-offset-2 focus-visible:underline">{String(topic.title)}</Link></h3></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status === "completed" ? "bg-emerald-50 text-emerald-800" : status === "in-progress" ? "bg-blue-50 text-blue-800" : "bg-slate-100 text-slate-600"}`}>{humanize(status)}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{String(topic.description || "Build a foundation in this topic, then practice what you learned.")}</p><p className="mt-3 text-xs text-slate-500">{String(topic.estimatedMinutes)} min · {humanize(String(topic.difficulty))}</p>{typeof topic.practicalExercise === "string" && topic.practicalExercise && <details className="mt-3 rounded-lg bg-slate-50 p-3"><summary className="cursor-pointer text-xs font-semibold text-slate-700">Practice this lesson</summary><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{topic.practicalExercise}</p>{typeof topic.deliverable === "string" && topic.deliverable && <p className="mt-2 text-xs text-slate-600"><strong>Make:</strong> {topic.deliverable}</p>}</details>}<div className="mt-4 flex flex-wrap gap-2">{status !== "in-progress" && status !== "completed" && <button type="button" onClick={()=>onStatusChange(topic,"in-progress")} className="min-h-9 rounded-lg bg-blue-700 px-3 text-xs font-semibold text-white">Start learning</button>}{status !== "completed" && <button type="button" onClick={()=>onStatusChange(topic,"completed")} className="min-h-9 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800">Mark complete</button>}{status === "completed" && <button type="button" onClick={()=>onStatusChange(topic,"in-progress")} className="min-h-9 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700">Study again</button>}<button type="button" onClick={()=>onEdit(topic)} className="min-h-9 rounded-lg px-3 text-xs font-semibold text-slate-500">Edit lesson</button></div></article>})}</div>{filtered.length===0&&<p className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">No lessons match this filter. Choose another phase or status.</p>}</section>;
}

function ResourceLibrary({ items, topics, phases }: { items: DataRecord[]; topics: DataRecord[]; phases: DataRecord[] }) {
  const [view, setView] = useState<"materials" | "practice">("materials");
  const [kind, setKind] = useState("all");
  const phaseNames = new Map(phases.map((phase) => [String(phase.id), String(phase.title)]));
  const resources = items.filter((item) => view === "practice" ? item.type === "practice" : item.type !== "practice");
  const filtered = resources.filter((item) => kind === "all" || item.type === kind);
  return <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 sm:p-6 xl:col-span-1">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-base font-semibold text-slate-900">Learning library</h2><p className="mt-1 text-xs text-slate-500">{resources.length} curated resources · {topics.length} topics with hands-on exercises</p></div>
      <select aria-label="Filter by format" value={kind} onChange={(event) => setKind(event.target.value)} className="min-h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="all">All formats</option>{[...new Set(resources.map((item) => String(item.type)))].map((type) => <option key={type} value={type}>{humanize(type)}</option>)}</select>
    </div>
    <div className="mt-4 flex gap-2 border-b border-slate-200 pb-3"><button onClick={() => { setView("materials"); setKind("all"); }} className={`rounded-md px-3 py-2 text-sm font-medium ${view === "materials" ? "bg-blue-50 text-blue-800" : "text-slate-600"}`}>Materials</button><button onClick={() => { setView("practice"); setKind("all"); }} className={`rounded-md px-3 py-2 text-sm font-medium ${view === "practice" ? "bg-blue-50 text-blue-800" : "text-slate-600"}`}>Practice</button></div>
    {view === "practice" && <div className="mt-4 grid gap-3 sm:grid-cols-2">{topics.filter((topic) => topic.practicalExercise).map((topic) => <article key={topic.id} className="rounded-lg border border-slate-200 p-4"><p className="text-xs font-semibold text-blue-800">{String(topic.title)}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{String(topic.practicalExercise)}</p><p className="mt-2 text-xs text-slate-500">Deliverable: {String(topic.deliverable || "Complete the exercise and save your work.")}</p></article>)}{filtered.map((item) => <article key={item.id} className="flex flex-col rounded-lg border border-slate-200 p-4"><div className="flex items-start justify-between gap-2"><h3 className="text-sm font-semibold leading-5 text-slate-900">{String(item.title)}</h3><span className="rounded-full bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-700">Guided practice</span></div><p className="mt-2 text-xs text-slate-500">{phaseNames.get(String(item.phaseId)) ?? "Learning resource"} · {String(item.estimatedMinutes ?? "")} min</p><p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{String(item.notes || "Complete the linked practice material.")}</p><a href={String(item.url)} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white">Open practice</a></article>)}</div>}
    {view === "materials" && <div className="mt-4 grid gap-3 sm:grid-cols-2">{filtered.map((item) => <article key={item.id} className="flex flex-col rounded-lg border border-slate-200 p-4"><div className="flex items-start justify-between gap-2"><h3 className="text-sm font-semibold leading-5 text-slate-900">{String(item.title)}</h3><span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">{humanize(String(item.type))}</span></div><p className="mt-2 text-xs text-slate-500">{phaseNames.get(String(item.phaseId)) ?? "Learning resource"} · {String(item.estimatedMinutes ?? "") } min · {humanize(String(item.status))}</p><p className="mt-2 flex-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{String(item.notes || "Open this resource and add your own study notes.")}</p><ResourceAvailability id={String(item.id)} availability={String(item.availability ?? "unchecked")} lastCheckedAt={typeof item.lastCheckedAt === "string" ? item.lastCheckedAt : null} license={String(item.license ?? "Unknown")} publisher={String(item.publisher ?? "")} /><a href={String(item.url)} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Open {humanize(String(item.type))}</a></article>)}</div>}
  </section>;
}

function FieldInput({ field, value, topics, phases }: { field: FieldDefinition; value: unknown; topics: DataRecord[]; phases: DataRecord[] }) {
  const base = "mt-1 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-2 focus:outline-blue-700";
  if (field.type === "checkbox") {
    return <label className="flex items-center gap-2 text-sm text-slate-700"><input name={field.name} type="checkbox" defaultChecked={value === true} className="h-4 w-4 accent-blue-700" />{field.label}</label>;
  }
  if (field.type === "textarea") {
    const display = field.name === "tasks" && Array.isArray(value)
      ? value.map((task) => typeof task === "object" && task !== null && "title" in task ? `[${"completed" in task && task.completed === true ? "x" : " "}] ${String(task.title)}` : "").filter(Boolean).join("\n")
      : field.name === "difficultyDistribution" && typeof value === "object" && value !== null
      ? Object.entries(value).map(([difficulty, count]) => `${difficulty}=${String(count)}`).join("\n")
      : Array.isArray(value) ? value.join("\n") : typeof value === "string" ? value : "";
    return <label className="block text-xs font-medium text-slate-700">{field.label}<textarea name={field.name} required={field.required} defaultValue={display} rows={3} className={base} /></label>;
  }
  if (field.type === "phase" || (field.name === "phaseId" && phases.length > 0)) {
    return <label className="block text-xs font-medium text-slate-700">{field.label}<select name={field.name} required={field.required} defaultValue={typeof value === "string" ? value : ""} className={base}><option value="">Select a phase</option>{phases.map((phase) => <option key={String(phase.id)} value={String(phase.id)}>{String(phase.order)}. {String(phase.title)}</option>)}</select></label>;
  }
  if (field.type === "topic") {
    return <label className="block text-xs font-medium text-slate-700">{field.label}<select name={field.name} required={field.required} defaultValue={typeof value === "string" ? value : ""} className={base}><option value="">Select a topic</option>{topics.map((topic) => <option key={String(topic.id)} value={String(topic.id)}>{String(topic.title)}</option>)}</select></label>;
  }
  if (field.type === "topics") {
    const selected = field.name === "prerequisites" ? (Array.isArray(value) ? value.map(String).join(", ") : "") : (Array.isArray(value) ? value.map(String).join(", ") : "");
    return <label className="block text-xs font-medium text-slate-700">{field.label}<input name={field.name} type="text" defaultValue={selected} className={base} placeholder="Separate IDs with commas" /></label>;
  }
  if (field.type === "select") {
    const dynamic = field.name === "phaseId" ? phases.map((phase) => ({ value: String(phase.id), label: `${String(phase.order)}. ${String(phase.title)}` })) : (field.name === "topicId" ? topics.map((topic) => ({ value: String(topic.id), label: String(topic.title) })) : (field.options ?? []).map((option) => ({ value: option, label: humanize(option) })));
    const selected = value === null || value === undefined ? "" : String(value);
    return <label className="block text-xs font-medium text-slate-700">{field.label}<select name={field.name} required={field.required} defaultValue={selected} className={base}><option value="">Select…</option>{dynamic.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
  }
  const normalized = field.type === "date" && typeof value === "string"
    ? value.slice(0, 10)
    : value instanceof Date ? value.toISOString().slice(0, 10) : typeof value === "string" || typeof value === "number" ? value : "";
  return <label className="block text-xs font-medium text-slate-700">{field.label}<input name={field.name} type={field.type} required={field.required} min={field.type === "number" ? 0 : undefined} defaultValue={normalized} className={base} /></label>;
}

function formPayload(fields: FieldDefinition[], formData: FormData, editing: DataRecord | null, topics: DataRecord[], phases: DataRecord[]) {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = formData.get(field.name);
    if (field.type === "checkbox") {
      payload[field.name] = raw === "on";
    } else if (field.type === "number") {
      if (raw === "" || raw === null) {
        if (["scorePercent", "lastScorePercent", "rating", "confidence", "targetDate", "latencyMs", "costPerRun"].includes(field.name)) payload[field.name] = null;
        continue;
      }
      payload[field.name] = Number(raw);
    } else if (field.type === "topics" || ["objectives", "options", "acceptedAnswers", "misconceptions", "tags", "technologies", "evidence", "learningObjectives", "questionTypes"].includes(field.name)) {
      const text = String(raw ?? "");
      payload[field.name] = field.name === "objectives" || field.name === "options" || field.name === "acceptedAnswers" || field.name === "misconceptions" || field.name === "evidence" || field.name === "learningObjectives"
        ? text.split(/\r?\n/).map((part) => part.trim()).filter(Boolean)
        : text.split(",").map((part) => part.trim()).filter(Boolean);
    } else if (field.type === "date") {
      const text = String(raw ?? "");
      payload[field.name] = field.name === "dueAt" ? (text ? new Date(`${text}T23:59:00`).toISOString() : "") : text || null;
    } else if (field.name === "tasks") {
      const existingTasks = Array.isArray(editing?.tasks) ? editing.tasks as { id?: string; title?: string; completed?: boolean }[] : [];
      payload.tasks = String(raw ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
        const match = /^\[(x| )\]\s*(.*)$/i.exec(line);
        const title = (match ? match[2] : line).trim();
        const existing = existingTasks.find((task) => task.title === title);
        return { id: existing?.id ?? `task-${crypto.randomUUID()}-${index}`, title, completed: match ? match[1].toLowerCase() === "x" : existing?.completed ?? false };
      }).filter((task) => task.title.length > 0);
    } else if (field.name === "difficultyDistribution") {
      const distribution: Record<string, number> = {};
      for (const line of String(raw ?? "").split(/\r?\n/).map((part) => part.trim()).filter(Boolean)) {
        const match = /^(fundamental|beginner|intermediate|advanced)\s*=\s*(\d+)$/.exec(line);
        if (!match) throw new Error("Use one valid difficulty=count entry per line.");
        distribution[match[1]] = Number(match[2]);
      }
      payload[field.name] = distribution;
    } else if (field.type === "select" && ["confidence", "rating"].includes(field.name)) {
      payload[field.name] = raw ? Number(raw) : null;
    } else if (field.type === "select" && field.name.startsWith("dimensions.")) {
      payload[field.name] = Number(raw);
    } else if (field.name === "topicId" && !raw) {
      payload[field.name] = null;
    } else if (field.name === "correctAnswer" && !raw) {
      payload[field.name] = null;
    } else if (field.name === "correctAnswer" && formData.get("questionType") === "calculation") {
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new Error("Calculation answer must be a finite number.");
      payload[field.name] = value;
    } else {
      payload[field.name] = String(raw ?? "");
    }
  }
  if (fields.some(({ name }) => name === "topicId") && !formData.get("topicId") && topics.length) payload.topicId = topics[0].id;
  if (fields.some(({ name }) => name === "phaseId") && !formData.get("phaseId") && phases.length) payload.phaseId = phases[0].id;
  if (editing) payload.id = editing.id;
  if (fields.some(({ name }) => name === "confidence") && payload.confidence === undefined) payload.confidence = null;
  const dimensions = Object.fromEntries(fields
    .filter(({ name }) => name.startsWith("dimensions."))
    .map(({ name }) => [name.slice("dimensions.".length), payload[name]]));
  if (Object.keys(dimensions).length > 0) {
    payload.dimensions = dimensions;
    for (const name of Object.keys(payload)) if (name.startsWith("dimensions.")) delete payload[name];
  }
  if (fields.some(({ name }) => name === "updatedAt")) payload.updatedAt = new Date().toISOString();
  return payload;
}

function recordTitle(item: DataRecord, topics: DataRecord[], phases: DataRecord[]) {
  const title = item.title ?? item.prompt ?? item.date ?? item.weekStarting ?? item.id;
  const topic = topics.find(({ id }) => id === item.topicId);
  const phase = phases.find(({ id }) => id === item.phaseId);
  return [String(title), topic ? ` · ${topic.title}` : "", phase ? ` · ${phase.title}` : ""].join("");
}

function recordSummary(item: DataRecord, section: string) {
  if (section === "learningSessions") {
    return `${humanize(String(item.state))} · ${Math.floor(Number(item.focusedSeconds ?? 0) / 60)} focused min · ${Math.floor(Number(item.breakSeconds ?? 0) / 60)} break min · ${formatDate(item.startedAt)}`;
  }
  if (section === "examinationAttempts") {
    return `${humanize(String(item.examType))} · ${item.scorePercent === null ? "Manual grading pending or incomplete" : `${item.scorePercent}% — ${humanize(String(item.result))}`} · ${formatDate(item.startedAt)}`;
  }
  if (section === "studyPlans") return `${formatDate(item.date)} · ${item.plannedMinutes} planned min · ${item.completed ? "Completed" : "Open"}${item.restDay ? " · Rest day" : ""}`;
  if (section === "revisionSchedules") return `Due ${formatDate(item.dueAt)} · ${item.intervalDays} day interval${item.lastScorePercent === null ? "" : ` · Last score ${item.lastScorePercent}%`}`;
  if (section === "resources") return `${humanize(String(item.type))} · ${humanize(String(item.status))} · ${item.url}`;
  if (section === "examinationQuestions") return `${humanize(String(item.questionType))} · ${humanize(String(item.difficulty))} · ${item.maxMarks} marks · v${item.version}${item.sample ? " · Sample" : ""}`;
  if (section === "examinationBlueprints") return `${humanize(String(item.examType))} · ${blueprintQuestionCount(item)} questions · ${item.timeLimitMinutes} min · pass ${item.passingPercent}%`;
  if (section === "settings") return `${String(item.key)}: ${JSON.stringify(item.value)}`;
  const summary = item.description ?? item.body ?? item.evidence ?? item.reason ?? item.reflection ?? item.nextAction ?? "";
  const line = typeof summary === "string" ? summary : JSON.stringify(summary);
  return `${line}${item.status ? ` · ${humanize(String(item.status))}` : ""}`;
}

function blueprintQuestionCount(blueprint: DataRecord) {
  const distribution = blueprint.difficultyDistribution;
  if (typeof distribution === "object" && distribution !== null) {
    const count = Object.values(distribution).reduce((total, value) => total + (typeof value === "number" ? value : 0), 0);
    if (count > 0) return count;
  }
  if (Array.isArray(blueprint.questionIds) && blueprint.questionIds.length > 0) return blueprint.questionIds.length;
  return Number(blueprint.questionCount ?? 0);
}

function isHistorical(section: string) {
  return ["examinationAttempts", "learningSessions", "assessments"].includes(section);
}

function RecordDetails({ item }: { item: DataRecord }) {
  return <details className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-600"><summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-blue-700">View saved details</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-slate-50 p-3">{JSON.stringify(item, null, 2)}</pre></details>;
}

function humanize(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: unknown) {
  if (typeof value !== "string") return "Date not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

async function responseMessage(response: Response) {
  try {
    const body = await response.json() as { error?: string };
    return body.error ?? `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

function ExamDashboard({ blueprints }: { blueprints: DataRecord[] }) {
  const [active, setActive] = useState<DataRecord[]>([]);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState("");
  const [filter, setFilter] = useState("all");
  useEffect(() => { void fetch("/api/collections/examinationAttempts", { cache: "no-store" }).then((response) => response.json()).then((records: DataRecord[]) => setActive(records.filter((item) => item.submittedAt === null))).catch(() => setError("Unable to load attempts.")); }, []);
  const [reviewing, setReviewing] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  async function start(id: string) {
    setStarting(id); setError("");
    try {
      const response = await fetch("/api/exams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", blueprintId: id }) });
      if (!response.ok) throw new Error(await responseMessage(response));
      window.location.href = "/active-exam";
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to start examination."); }
    finally { setStarting(""); }
  }
  const available = blueprints.filter((blueprint) => blueprint.active === true);
  const shown = available.filter((blueprint) => filter === "all" || (filter === "practical" ? blueprint.examType === "practical" : blueprint.examType !== "practical"));
  return <section className="xl:col-span-2 space-y-5">
    <div className="overflow-hidden rounded-3xl border border-blue-100 bg-blue-50 p-6 text-slate-900 sm:p-8"><div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-800"><Brain size={24}/></span><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-800">Practice that shows what you know</p><h2 className="mt-2 text-2xl font-semibold">Check understanding. Find the gaps. Try again.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">Choose a short knowledge check or a hands-on challenge. Your results help guide what to review next; they are a learning signal, not a judgment.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-blue-100 bg-white p-3"><CheckCircle2 className="text-emerald-700" size={17}/><p className="mt-2 text-xs font-semibold">Recall</p><p className="mt-1 text-[11px] text-slate-700">Explain core ideas in your own words.</p></div><div className="rounded-xl border border-blue-100 bg-white p-3"><Brain className="text-violet-700" size={17}/><p className="mt-2 text-xs font-semibold">Reasoning</p><p className="mt-1 text-[11px] text-slate-700">Apply concepts to realistic choices.</p></div><div className="rounded-xl border border-blue-100 bg-white p-3"><Code2 className="text-blue-800" size={17}/><p className="mt-2 text-xs font-semibold">Build</p><p className="mt-1 text-[11px] text-slate-700">Show practical evidence and tradeoffs.</p></div></div></div>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {(() => {
      const blueprint = blueprints.find((item) => item.id === reviewing);
      if (!blueprint) return null;
      const closedBook = blueprint.examType === "closed-book";
      const list = (value: unknown) => Array.isArray(value) && value.length ? value.map(String).join(", ") : "Not specified";
      return <section aria-labelledby="exam-rules-heading" className="rounded-xl border border-blue-200 bg-white p-5">
        <h2 id="exam-rules-heading" className="text-lg font-semibold text-slate-900">Before you start: {String(blueprint.title)}</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-slate-500">Examination type</dt><dd>{humanize(String(blueprint.examType))}</dd></div>
          <div><dt className="text-xs text-slate-500">Questions · time limit</dt><dd>{blueprintQuestionCount(blueprint)} questions · {String(blueprint.timeLimitMinutes)} minutes (the timer keeps running if you leave or refresh)</dd></div>
          <div><dt className="text-xs text-slate-500">Passing threshold</dt><dd>{String(blueprint.passingPercent)}%; required practical tasks must also pass</dd></div>
          <div><dt className="text-xs text-slate-500">Retake policy</dt><dd>{blueprint.retakePolicy === "cooldown" ? `Wait ${String(blueprint.retakeCooldownHours)} hours between attempts` : "Retakes allowed; unused questions are preferred"}</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Learning objectives</dt><dd>{list(blueprint.learningObjectives)}</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Allowed reference materials</dt><dd>{String(blueprint.allowedMaterials || (closedBook ? "None" : "Not specified"))}</dd></div>
          {blueprint.practicalRequirements ? <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Practical requirements</dt><dd>{String(blueprint.practicalRequirements)}</dd></div> : null}
        </dl>
        <p className="mt-3 text-sm text-slate-700">Answers are saved as drafts while you work. Unanswered questions are recorded when you submit. Written and practical answers are graded by a person against the rubric.</p>
        {closedBook && <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Closed-book: notes, resources, and lessons are hidden until you submit. The result is self-declared and not proctored.</p>}
        <label className="mt-4 flex items-start gap-2 text-sm text-slate-800"><input type="checkbox" className="mt-1" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />{closedBook ? "I have read the rules and declare that I will not use notes or other help." : "I have read the objectives and rules."}</label>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={!acknowledged || starting === blueprint.id} onClick={() => void start(String(blueprint.id))} className="min-h-10 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{starting === blueprint.id ? "Starting…" : "Begin examination"}</button>
          <button type="button" onClick={() => { setReviewing(""); setAcknowledged(false); }} className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800">Choose a different examination</button>
        </div>
      </section>;
    })()}
    {active.length > 0 && <Link href="/active-exam" className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><span><strong>Pick up where you left off.</strong> You have {active.length} open {active.length === 1 ? "attempt" : "attempts"}.</span><ArrowRight size={17}/></Link>}
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold text-slate-950">Choose a challenge</h2><p className="mt-1 text-sm text-slate-600">{available.length} ready · Review explanations after each attempt.</p></div><div className="flex rounded-xl bg-slate-100 p-1"><button onClick={()=>setFilter("all")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${filter === "all" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}>All</button><button onClick={()=>setFilter("knowledge")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${filter === "knowledge" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}>Knowledge checks</button><button onClick={()=>setFilter("practical")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${filter === "practical" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}>Build challenges</button></div></div>
    {shown.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><p className="font-semibold text-slate-800">No challenges in this view yet</p><p className="mt-2 text-sm text-slate-600">{available.length ? "Try another filter." : "Add a question set in the Question Bank, then activate it in Exam blueprints."}</p></div> : <div className="grid gap-4 md:grid-cols-2">{shown.map((blueprint) => {const practical = blueprint.examType === "practical";return <article key={String(blueprint.id)} className="group rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-start justify-between gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${practical ? "bg-violet-50 text-violet-700" : "bg-blue-50 text-blue-700"}`}>{practical ? <Code2 size={19}/> : <Brain size={19}/>}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">{humanize(String(blueprint.difficulty ?? "beginner"))}</span></div><h3 className="mt-4 text-lg font-semibold text-slate-950">{String(blueprint.title)}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{practical ? "Apply the ideas in a practical task and explain your decisions." : "Check recall and reasoning, then use the feedback to choose what to review."}</p><div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500"><span>{blueprintQuestionCount(blueprint)} prompts</span><span className="inline-flex items-center gap-1"><Clock3 size={13}/>{String(blueprint.timeLimitMinutes)} min</span><span>Pass guide {String(blueprint.passingPercent)}%</span></div>{Array.isArray(blueprint.learningObjectives) && blueprint.learningObjectives.length > 0 && <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">You’ll practice: {blueprint.learningObjectives.join(" · ")}</p>}{blueprint.examType === "closed-book" && <p className="mt-3 text-xs text-amber-800">Closed-book is self-declared and not proctored.</p>}<button type="button" disabled={starting === blueprint.id} onClick={() => { setReviewing(String(blueprint.id)); setAcknowledged(false); window.setTimeout(() => document.getElementById("exam-rules-heading")?.scrollIntoView({ block: "start" }), 0); }} className="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-60">{starting === blueprint.id ? "Preparing…" : practical ? "Try the build challenge" : "Start knowledge check"}<ArrowRight size={15}/></button></article>})}</div>}
  </section>;
}



function ExamAnalytics({ attempts, topics }: { attempts: DataRecord[]; topics: DataRecord[] }) {
  const submitted = attempts.filter((item) => item.submittedAt && typeof item.scorePercent === "number");
  const scores = submitted.map((item) => Number(item.scorePercent));
  const first = new Map<string, number>();
  submitted.sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt))).forEach((item) => {
    const key = String(item.blueprintId);
    if (!first.has(key)) first.set(key, Number(item.scorePercent));
  });
  const topicStats = new Map<string, { earned: number; possible: number; correct: number; count: number }>();
  for (const attempt of submitted) {
    const snapshots = attempt.questionSnapshots as DataRecord[];
    const results = attempt.questionResults as DataRecord[];
    for (const result of results) {
      const snapshot = snapshots.find((question) => question.questionId === result.questionId);
      if (!snapshot) continue;
      const key = String(snapshot.topicId);
      const current = topicStats.get(key) ?? { earned: 0, possible: 0, correct: 0, count: 0 };
      current.earned += Number(result.marksEarned);
      current.possible += Number(result.maxMarks);
      current.correct += result.status === "correct" ? 1 : 0;
      current.count += 1;
      topicStats.set(key, current);
    }
  }
  return <section className="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
    <h2 className="font-semibold">Examination analytics</h2>
    {scores.length ? <>
      <div className="mt-3 grid gap-3 sm:grid-cols-3"><Metric label="Scored attempts" value={String(scores.length)} /><Metric label="First-attempt average" value={`${Math.round([...first.values()].reduce((sum, score) => sum + score, 0) / first.size)}%`} /><Metric label="Best score" value={`${Math.max(...scores)}%`} /></div>
      <h3 className="mt-6 text-sm font-semibold text-slate-800">Performance by topic</h3>
      <div className="mt-2 space-y-2">{[...topicStats.entries()].map(([topicId, stats]) => {
        const topic = topics.find((item) => item.id === topicId);
        return <div key={topicId} className="flex flex-wrap justify-between gap-2 rounded bg-slate-50 p-3 text-sm"><span className="font-medium text-slate-800">{topic ? String(topic.title) : `Topic ${topicId}`}</span><span className="text-slate-600">{Math.round(stats.earned / stats.possible * 100)}% marks · {stats.correct}/{stats.count} fully correct</span></div>;
      })}</div>
    </> : <p className="mt-3 text-sm text-slate-600">No graded results yet. Submitted written responses awaiting manual grading are not included in score analytics.</p>}
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>; }


function ExamHistory({ attempts }: { attempts: DataRecord[] }) {
  const history = attempts.filter((attempt) => attempt.submittedAt).sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
  return <section className="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
    <h2 className="font-semibold text-slate-900">Examination history</h2>
    <p className="mt-1 text-sm text-slate-600">Each attempt retains the exact question versions and grading saved at submission time.</p>
    {history.length ? <ol className="mt-4 space-y-3">{history.map((attempt) => <li key={attempt.id as string} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4">
      <div><h3 className="text-sm font-medium">{humanize(String(attempt.examType))} · {formatDate(attempt.submittedAt)}</h3><p className="mt-1 text-sm text-slate-600">{typeof attempt.scorePercent === "number" ? `${attempt.scorePercent}% · ${String(attempt.result === "pass" ? "Passed" : "Not passed")}` : "Awaiting manual grading"} · {String((attempt.questionSnapshots as DataRecord[]).length)} question snapshots</p></div>
      <a className="text-sm font-semibold text-blue-700 underline" href={`/answer-review?attemptId=${encodeURIComponent(String(attempt.id))}`}>Open saved attempt</a>
    </li>)}</ol> : <p className="mt-4 text-sm text-slate-600">No submitted attempts are in your examination history.</p>}
  </section>;
}

function AnswerReview({ attempts }: { attempts: DataRecord[] }) {
  const submitted = attempts.filter((attempt) => attempt.submittedAt).sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
  const [selectedId, setSelectedId] = useState("");
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("attemptId") ?? "";
    setSelectedId(submitted.some((attempt) => attempt.id === requested) ? requested : String(submitted[0]?.id ?? ""));
  }, [attempts]);
  const selected = submitted.find((attempt) => attempt.id === selectedId);
  return <section className="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
    <h2 className="font-semibold text-slate-900">Answer review</h2>
    {submitted.length === 0 ? <p className="mt-3 text-sm text-slate-600">Submit an examination to review its saved answers, marks, feedback, and explanations.</p> : <>
      <label className="mt-4 block max-w-xl text-xs font-medium text-slate-700">Submitted attempt
        <select value={selectedId} onChange={(event) => {
          const nextId = event.target.value;
          setSelectedId(nextId);
          window.history.replaceState(null, "", `/answer-review?attemptId=${encodeURIComponent(nextId)}`);
        }} className="mt-1 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">
          {submitted.map((attempt) => <option key={attempt.id as string} value={attempt.id as string}>{humanize(String(attempt.examType))} · {formatDate(attempt.submittedAt)} · {typeof attempt.scorePercent === "number" ? `${attempt.scorePercent}%` : "Pending grade"}</option>)}
        </select>
      </label>
      {selected && <><p className="mt-4 rounded bg-slate-50 p-3 text-sm text-slate-700">Result: {selected.result === "pass" ? "Passed" : selected.result === "not-yet-passed" ? "Not passed" : "Awaiting manual grade"} · {String(selected.marksEarned ?? "—")}/{String(selected.totalMarks)} marks · {typeof selected.scorePercent === "number" ? `${selected.scorePercent}%` : "Score pending"}</p>
        <div className="mt-4 space-y-4">{(selected.questionSnapshots as DataRecord[]).map((question, index) => {
          const result = (selected.questionResults as DataRecord[]).find((item) => item.questionId === question.questionId);
          return <article key={`${String(question.questionId)}-${String(question.version)}`} className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Question {index + 1} · version {String(question.version)} · {String(question.maxMarks)} marks</p>
            <h3 className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-900">{String(question.prompt)}</h3>
            <p className="mt-3 whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm text-slate-700"><strong>Your answer:</strong> {String(result?.answer || "Unanswered")}</p>
            <p className="mt-2 text-sm text-slate-700"><strong>Grade:</strong> {String(result?.status ?? "not graded")} · {String(result?.marksEarned ?? 0)}/{String(result?.maxMarks ?? question.maxMarks)} marks</p>
            {result?.feedback ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600"><strong>Feedback:</strong> {String(result.feedback)}</p> : null}
            {question.explanation ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600"><strong>Explanation:</strong> {String(question.explanation)}</p> : null}
          </article>;
        })}</div>
      </>}
    </>}
  </section>;
}

function ReviewPlanner({ plans }: { plans: DataRecord[] }) {
  const [reviews, setReviews] = useState<{ dailyReviews: DataRecord[]; weeklyReviews: DataRecord[] }>({ dailyReviews: [], weeklyReviews: [] });
  const [weekStarting, setWeekStarting] = useState(getMonday(new Date()));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch("/api/reviews", { cache: "no-store" });
    if (!response.ok) throw new Error(await responseMessage(response));
    setReviews(await response.json() as typeof reviews);
  }, []);
  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load reviews.")); }, [load]);
  const existingWeekly = reviews.weeklyReviews.find((review) => review.weekStarting === weekStarting);
  const today = new Date().toISOString().slice(0, 10);
  const todayPlans = plans.filter((plan) => plan.date === today);
  async function saveReview(type: "weekly" | "daily", form: FormData) {
    setSaving(true); setError(""); setMessage("");
    const body = type === "weekly"
      ? { type, weekStarting, reflection: String(form.get("reflection") ?? ""), nextWeekFocus: String(form.get("nextWeekFocus") ?? ""), plannedLearning: String(form.get("plannedLearning") ?? ""), actuallyCompleted: String(form.get("actuallyCompleted") ?? ""), struggles: String(form.get("struggles") ?? ""), independentSkills: String(form.get("independentSkills") ?? ""), assessmentImprovements: String(form.get("assessmentImprovements") ?? ""), practiceNeeds: String(form.get("practiceNeeds") ?? "") }
      : { type, date: today, reflection: String(form.get("reflection") ?? ""), nextAction: String(form.get("nextAction") ?? "") };
    try {
      const response = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error(await responseMessage(response));
      setMessage(type === "weekly" ? "Weekly review saved with metrics calculated from actual records." : "Daily reflection saved.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Review could not be saved."); }
    finally { setSaving(false); }
  }
  const summary = existingWeekly?.summary as Record<string, unknown> | undefined;
  return (
    <div className="xl:col-span-2 grid gap-5 lg:grid-cols-2">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Weekly review from recorded activity</h2>
        <label className="mt-3 block text-xs font-medium">Week starting (Monday)<input type="date" value={weekStarting} onChange={(event) => setWeekStarting(event.target.value)} className="mt-1 block min-h-10 rounded border border-slate-300 px-3 text-sm" /></label>
        {summary ? <div className="mt-4 grid grid-cols-2 gap-2"><Metric label="Plans recorded" value={String(summary.plannedCount ?? 0)} /><Metric label="Plans completed" value={String(summary.completedPlanCount ?? 0)} /><Metric label="Focused minutes" value={String(summary.focusedMinutes ?? 0)} /><Metric label="Study sessions" value={String(summary.sessionCount ?? 0)} /></div> : <p className="mt-4 text-sm text-slate-600">Save a review to snapshot planned items, completed items, actual time, difficulties, assessments, and project activity for this week.</p>}
        <form action={(form) => saveReview("weekly", form)} className="mt-4 grid gap-3">
          {[
            ["plannedLearning", "What did you plan to learn?"],
            ["actuallyCompleted", "What did you actually complete?"],
            ["struggles", "Where did you struggle?"],
            ["independentSkills", "What can you now do independently?"],
            ["assessmentImprovements", "Which assessment results improved?"],
            ["practiceNeeds", "Which subjects need more practice?"],
            ["nextWeekFocus", "What should you learn next week?"]
          ].map(([name, label]) => <label key={name} className="text-xs font-medium text-slate-700">{label}<textarea name={name} rows={2} defaultValue={String(existingWeekly?.[name] ?? "")} className="mt-1 block w-full rounded border border-slate-300 p-2 text-sm" /></label>)}
          <label className="text-xs font-medium text-slate-700">Additional reflection<textarea name="reflection" rows={2} defaultValue={String(existingWeekly?.reflection ?? "")} className="mt-1 block w-full rounded border border-slate-300 p-2 text-sm" /></label>
          <button disabled={saving} className="min-h-10 rounded bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-60">Save weekly review</button>
        </form>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Daily plan and reflection</h2>
        <p className="mt-2 text-sm text-slate-600">{todayPlans.length} plan items today · {todayPlans.filter((plan) => plan.completed).length} marked complete · {todayPlans.filter((plan) => plan.restDay).length} rest-day entries.</p>
        <form action={(form) => saveReview("daily", form)} className="mt-4 grid gap-3">
          <label className="text-xs font-medium text-slate-700">What did you learn or work on today?<textarea name="reflection" rows={4} defaultValue={String(reviews.dailyReviews.find((review) => review.date === today)?.reflection ?? "")} className="mt-1 block w-full rounded border border-slate-300 p-2 text-sm" /></label>
          <label className="text-xs font-medium text-slate-700">Next action<textarea name="nextAction" rows={3} defaultValue={String(reviews.dailyReviews.find((review) => review.date === today)?.nextAction ?? "")} className="mt-1 block w-full rounded border border-slate-300 p-2 text-sm" /></label>
          <button disabled={saving} className="min-h-10 rounded border border-slate-300 px-4 text-sm font-semibold">Save daily reflection</button>
        </form>
      </section>
      {message && <p aria-live="polite" className="lg:col-span-2 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="lg:col-span-2 text-sm text-rose-800">{error}</p>}
    </div>
  );
}

function getMonday(date: Date) {
  const monday = new Date(date);
  const day = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - day);
  return monday.toISOString().slice(0, 10);
}

function CompetencySummary({ topics }: { topics: DataRecord[] }) {
  const [rows, setRows] = useState<DataRecord[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { void fetch("/api/competency", { cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error(await responseMessage(response)); return response.json() as Promise<DataRecord[]>; }).then(setRows).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to calculate competency.")); }, []);
  const topicById = new Map(topics.map((topic) => [String(topic.id), topic]));
  return <section className="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Readiness to advance</h2><p className="mt-2 text-sm text-slate-600">Configurable topic, practical, and retention thresholds are applied to persisted examination evidence. Mastery requires two delayed-retention passes. Self-ratings and study hours cannot unlock competency.</p>{error && <p role="alert" className="mt-3 text-sm text-rose-800">{error}</p>}<div className="mt-4 grid gap-3 md:grid-cols-2">{rows.map((row) => { const readiness = row.readiness as { level: string; requirements: string[]; evidence: string[] }; return <article key={String(row.topicId)} className="rounded-lg border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-medium">{String(topicById.get(String(row.topicId))?.title ?? row.title)}</h3><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">{readiness.level}</span></div><p className="mt-2 text-xs text-slate-500">Learning status: {String(row.learningStatus)} · separate from competency</p>{readiness.requirements.length > 0 && <ul className="mt-3 list-disc pl-5 text-xs leading-5 text-slate-700">{readiness.requirements.map((item) => <li key={item}>{item}</li>)}</ul>}{readiness.evidence.length > 0 && <ul className="mt-3 list-disc pl-5 text-xs leading-5 text-emerald-800">{readiness.evidence.map((item) => <li key={item}>{item}</li>)}</ul>}</article>; })}</div></section>;
}


function TimerPanel({ topics }: { topics: DataRecord[] }) {
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [topicId, setTopicId] = useState("");
  const [plannedMinutes, setPlannedMinutes] = useState(60);
  const [now, setNow] = useState(new Date().toISOString());
  const [timezone, setTimezone] = useState("UTC");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      const [sessionResponse, settingsResponse] = await Promise.all([
        fetch("/api/collections/learningSessions", { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" })
      ]);
      if (!sessionResponse.ok) throw new Error(await responseMessage(sessionResponse));
      const loaded = await sessionResponse.json() as LearningSession[];
      setSessions(loaded);
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json() as { timezone?: string };
        if (settings.timezone) setTimezone(settings.timezone);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load timer state."); }
  }, []);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => setNow(new Date().toISOString()), 1000);
    return () => window.clearInterval(timer);
  }, [load]);
  const active = sessions.find((session) => ["running", "paused", "break"].includes(session.state));
  const topic = topics.find((item) => item.id === (active?.topicId ?? topicId));
  const time = active ? elapsedSessionSeconds(active, now) : null;
  const displayTime = (seconds: number) => `${Math.floor(seconds / 3600).toString().padStart(2, "0")}:${Math.floor(seconds % 3600 / 60).toString().padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  async function action(payload: Record<string, unknown>) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/timer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(await responseMessage(response));
      const result = await response.json() as LearningSession;
      setSessions((previous) => {
        const exists = previous.some((session) => session.id === result.id);
        return exists ? previous.map((session) => session.id === result.id ? result : session) : [...previous, result];
      });
      if (payload.action === "finish") setMessage("Session finished and saved.");
      if (payload.action === "cancel") setMessage("Session cancelled and recorded.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Timer action failed."); }
    finally { setBusy(false); }
  }
  async function saveReflection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active) return;
    const form = new FormData(event.currentTarget);
    setError("");
    setMessage("");
    try {
      const rating = String(form.get("rating") ?? "");
      const response = await fetch("/api/collections/learningSessions", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...active, notes: String(form.get("notes") ?? ""), accomplishments: String(form.get("accomplishments") ?? ""), problems: String(form.get("problems") ?? ""), distractions: String(form.get("distractions") ?? ""), rating: rating ? Number(rating) : null })
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      setMessage("Session reflection saved.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save session reflection.");
    }
  }

  return (
    <section className="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-base font-semibold text-slate-900">{active ? "Active learning session" : "Start a study session"}</h2><p className="mt-1 text-sm text-slate-600">{active ? `${String(topic?.title ?? "Topic")} · started ${new Date(active.startedAt).toLocaleString(undefined, { timeZone: timezone })}` : "Elapsed time is derived from saved ISO timestamps, not an interval counter."}</p></div>
        {active && time && <div className="text-right"><p className="font-mono text-3xl font-semibold tabular-nums text-slate-900">{displayTime(time.focusedSeconds)}</p><p className="text-xs text-slate-500">focused · break {displayTime(time.breakSeconds)}</p></div>}
      </div>
      {!active ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <label className="text-xs font-medium text-slate-700">Learning topic<select value={topicId} onChange={(event) => setTopicId(event.target.value)} className="mt-1 block min-h-10 w-full rounded border border-slate-300 px-3 text-sm"><option value="">Choose a topic</option>{topics.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.title)}</option>)}</select></label>
          <label className="text-xs font-medium text-slate-700">Planned minutes<input type="number" min="0" max="1440" value={plannedMinutes} onChange={(event) => setPlannedMinutes(Number(event.target.value))} className="mt-1 block min-h-10 w-full rounded border border-slate-300 px-3 text-sm" /></label>
          <button type="button" disabled={busy || !topicId} onClick={() => void action({ action: "start", topicId, plannedSeconds: plannedMinutes * 60 })} className="min-h-10 rounded bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50">Start learning</button>
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap gap-2">
            {active.state === "running" && <><button disabled={busy} onClick={() => void action({ action: "pause", sessionId: active.id })} className="min-h-10 rounded border border-slate-300 px-4 text-sm font-semibold">Pause</button><button disabled={busy} onClick={() => void action({ action: "break", sessionId: active.id })} className="min-h-10 rounded border border-slate-300 px-4 text-sm font-semibold">Take break</button></>}
            {active.state === "paused" && <button disabled={busy} onClick={() => void action({ action: "resume", sessionId: active.id })} className="min-h-10 rounded border border-slate-300 px-4 text-sm font-semibold">Resume</button>}
            {active.state === "break" && <button disabled={busy} onClick={() => void action({ action: "resume-break", sessionId: active.id })} className="min-h-10 rounded border border-slate-300 px-4 text-sm font-semibold">Resume from break</button>}
            <button disabled={busy} onClick={() => { if (window.confirm("Recover using saved timestamps? Elapsed time since the last state change will be recorded in that state.")) void action({ action: "recover", sessionId: active.id }); }} className="min-h-10 rounded border border-slate-300 px-4 text-sm font-semibold">Recover interrupted session</button>
            <button disabled={busy} onClick={() => void action({ action: "finish", sessionId: active.id })} className="min-h-10 rounded bg-blue-700 px-4 text-sm font-semibold text-white">Finish session</button>
            <button disabled={busy} onClick={() => { if (window.confirm("Cancel this session? Time already spent will be preserved as a cancelled session.")) void action({ action: "cancel", sessionId: active.id }); }} className="min-h-10 rounded border border-rose-200 px-4 text-sm font-semibold text-rose-800">Cancel session</button>
          </div>
          <form onSubmit={saveReflection} className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-700">Session notes<textarea name="notes" defaultValue={active.notes} rows={2} className="mt-1 block w-full rounded border border-slate-300 p-2 text-sm" /></label>
            <label className="text-xs font-medium text-slate-700">Accomplishments<textarea name="accomplishments" defaultValue={active.accomplishments} rows={2} className="mt-1 block w-full rounded border border-slate-300 p-2 text-sm" /></label>
            <label className="text-xs font-medium text-slate-700">Problems encountered<textarea name="problems" defaultValue={active.problems} rows={2} className="mt-1 block w-full rounded border border-slate-300 p-2 text-sm" /></label>
            <label className="text-xs font-medium text-slate-700">Distractions<textarea name="distractions" defaultValue={active.distractions} rows={2} className="mt-1 block w-full rounded border border-slate-300 p-2 text-sm" /></label>
            <label className="text-xs font-medium text-slate-700">Session rating<select name="rating" defaultValue={active.rating ?? ""} className="mt-1 block min-h-10 w-full rounded border border-slate-300 px-3 text-sm"><option value="">Not rated</option>{[1,2,3,4,5].map((rating) => <option key={rating}>{rating}</option>)}</select></label>
            <button className="self-end min-h-10 rounded border border-slate-300 px-4 text-sm font-semibold">Save session notes</button>
          </form>
        </>
      )}
      {time && active && <p className="mt-4 text-xs text-slate-500">Paused time: {displayTime(time.pausedSeconds)} · Planned focused time: {displayTime(active.plannedSeconds)} · Estimation accuracy: {active.plannedSeconds > 0 ? `${Math.round(timeEstimationAccuracy(active.plannedSeconds, time.focusedSeconds) ?? 0)}%` : "N/A"} (planning accuracy only; not a measure of ability).</p>}
      {message && <p aria-live="polite" className="mt-3 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-rose-800">{error}</p>}
      {topics.length === 0 && <p className="mt-4 rounded bg-amber-50 p-3 text-sm text-amber-900">Create a topic before starting a timer. Topic management is available from the Topics and Tasks page.</p>}
    </section>
  );
}

function ManualGrader({ attempts, reload }: { attempts: DataRecord[]; reload: () => Promise<void> }) {
  const [grades, setGrades] = useState<Record<string, Record<string, { marksEarned: number; feedback: string }>>>({});
  const [error, setError] = useState("");
  const pending = attempts.filter((attempt) => attempt.submittedAt && attempt.grading === "manual" && attempt.manualGraded !== true);
  async function submit(attemptId: string) {
    const values = grades[attemptId] ?? {};
    try {
      const response = await fetch("/api/exams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "grade", attemptId, grades: values }) });
      if (!response.ok) throw new Error(await responseMessage(response));
      setError(""); await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Manual grading failed."); }
  }
  if (pending.length === 0) return <section className="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Manual grading</h2><p className="mt-2 text-sm text-slate-600">No submitted attempts are awaiting manual review.</p></section>;
  return <section className="xl:col-span-2 rounded-xl border border-amber-200 bg-amber-50/50 p-5"><h2 className="font-semibold text-slate-900">Written and practical responses awaiting manual review</h2>{pending.map((attempt) => <article key={attempt.id} className="mt-4 rounded-lg border border-slate-200 bg-white p-4"><h3 className="font-medium">Attempt {String(attempt.id).slice(0, 8)} · {humanize(String(attempt.examType))}</h3>{(attempt.questionResults as DataRecord[]).filter((result) => result.correct === null).map((result) => { const question = (attempt.questionSnapshots as DataRecord[]).find((snapshot) => snapshot.questionId === result.questionId); const existing = grades[String(attempt.id)]?.[String(result.questionId)]; return <div key={String(result.questionId)} className="mt-4 border-t pt-3"><p className="text-sm font-medium">{String(question?.prompt)}</p><p className="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm">Submitted answer: {String(result.answer || "Unanswered")}</p><p className="mt-2 text-xs text-slate-600">Rubric: {String((question?.rubric as string) || "Apply the stated learning objective; record evidence-based feedback.")}</p><div className="mt-3 grid gap-3 sm:grid-cols-[140px_1fr]"><label className="text-xs font-medium">Marks (0–{String(result.maxMarks)})<input type="number" min="0" max={Number(result.maxMarks)} step="0.1" value={existing?.marksEarned ?? ""} onChange={(event) => setGrades((prev) => ({ ...prev, [String(attempt.id)]: { ...prev[String(attempt.id)], [String(result.questionId)]: { marksEarned: Number(event.target.value), feedback: existing?.feedback ?? "" } } }))} className="mt-1 block min-h-10 w-full rounded border border-slate-300 px-3 text-sm" /></label><label className="text-xs font-medium">Feedback<textarea value={existing?.feedback ?? ""} onChange={(event) => setGrades((prev) => ({ ...prev, [String(attempt.id)]: { ...prev[String(attempt.id)], [String(result.questionId)]: { marksEarned: existing?.marksEarned ?? 0, feedback: event.target.value } } }))} className="mt-1 block min-h-10 w-full rounded border border-slate-300 px-3 py-2 text-sm" /></label></div></div>; })}<button type="button" onClick={() => void submit(String(attempt.id))} className="mt-4 min-h-10 rounded bg-blue-700 px-4 text-sm font-semibold text-white">Finalize manual grade</button></article>)}{error && <p role="alert" className="mt-3 text-sm text-rose-800">{error}</p>}</section>;
}



function SalesAgentPlan({ projects }: { projects: DataRecord[] }) {
  const capabilities = ["Lead discovery", "Lead qualification", "Customer research", "Grounded product knowledge", "Conversation management", "Email and chat integration", "WhatsApp and voice integration", "CRM and ERP integration", "Tool calling and orchestration", "Memory and state", "Quotation and order preparation", "Human approval and safeguards", "Evaluation and monitoring", "Deployment and operating costs", "Customer feedback"];
  return <section className="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">AI Sales Employee capability roadmap</h2><p className="mt-2 text-sm leading-6 text-slate-600">Build small simulated prototypes first. Require human authorization for outreach, negotiation, quotations, and transactions. Track product readiness separately from learning competency.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{capabilities.map((capability) => <p key={capability} className="rounded bg-slate-50 px-3 py-2 text-sm">{capability}</p>)}</div><p className="mt-4 text-xs text-slate-500">{projects.length} project milestones saved.</p></section>;
}

function ReportPanel({ topics }: { topics: DataRecord[] }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [topicId, setTopicId] = useState("");
  const query = (format: string) => {
    const params = new URLSearchParams({ format });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (topicId) params.set("topicId", topicId);
    return `/api/reports?${params.toString()}`;
  };
  return <section className="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Export reports</h2><p className="mt-2 text-sm text-slate-600">Filter reports by date range and topic. Exports use saved sessions, examination results, competency calculations, revisions, and project records.</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><label className="text-xs font-medium">From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 block min-h-10 w-full rounded border border-slate-300 px-3 text-sm" /></label><label className="text-xs font-medium">To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 block min-h-10 w-full rounded border border-slate-300 px-3 text-sm" /></label><label className="text-xs font-medium">Topic<select value={topicId} onChange={(event) => setTopicId(event.target.value)} className="mt-1 block min-h-10 w-full rounded border border-slate-300 px-3 text-sm"><option value="">All topics</option>{topics.map((topic) => <option key={String(topic.id)} value={String(topic.id)}>{String(topic.title)}</option>)}</select></label></div><div className="mt-4 flex flex-wrap gap-3"><a href={query("csv")} className="rounded border border-slate-300 px-3 py-2 text-sm font-medium">Learning sessions CSV</a><a href={query("exams")} className="rounded border border-slate-300 px-3 py-2 text-sm font-medium">Examination results CSV</a><a href={query("json")} className="rounded border border-slate-300 px-3 py-2 text-sm font-medium">Analytics JSON</a><a href={query("print")} target="_blank" rel="noreferrer" className="rounded border border-slate-300 px-3 py-2 text-sm font-medium">Printable report</a></div></section>;
}

function BackupPanel() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [backup, setBackup] = useState<unknown>(null);
  async function snapshot() {
    setError(""); setMessage("");
    try {
      const response = await fetch("/api/backup", { method: "POST" });
      if (!response.ok) throw new Error(await responseMessage(response));
      setMessage("A validated automatic snapshot was created on the configured data disk.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Snapshot failed."); }
  }
  async function restore() {
    if (!backup || !window.confirm("This replaces the complete current dataset, including examination history. A validated backup file must be selected. Continue?")) return;
    setError(""); setMessage("");
    try {
      const response = await fetch("/api/backup", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: true, data: backup }) });
      if (!response.ok) throw new Error(await responseMessage(response));
      setMessage("Backup was validated and restored.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Restore failed."); }
  }
  return <section className="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Backup and recovery</h2><p className="mt-2 text-sm leading-6 text-slate-600">Export contains all records. Restore validates the complete versioned backup before atomically replacing data. Keep off-disk copies; this application has one local JSON store.</p><div className="mt-4 flex flex-wrap gap-3"><a href="/api/backup" className="rounded border border-slate-300 px-3 py-2 text-sm font-medium">Download complete JSON backup</a><button onClick={() => void snapshot()} className="rounded border border-slate-300 px-3 py-2 text-sm font-medium">Create retained snapshot</button><label className="rounded border border-slate-300 px-3 py-2 text-sm font-medium">Choose backup JSON<input type="file" accept="application/json,.json" className="ml-2 text-xs" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const parsed = JSON.parse(await file.text()) as unknown; setBackup(parsed); setMessage("File parsed locally. Restore will validate the complete schema."); setError(""); } catch { setError("Selected file is not valid JSON."); } }} /></label><button disabled={!backup} onClick={() => void restore()} className="rounded bg-rose-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Confirm restore</button></div>{message && <p aria-live="polite" className="mt-3 text-sm text-emerald-800">{message}</p>}{error && <p role="alert" className="mt-3 text-sm text-rose-800">{error}</p>}</section>;
}

