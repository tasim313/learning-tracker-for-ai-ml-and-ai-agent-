import Link from "next/link";
import { BookOpen, CheckCircle2, Clock3, Play, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth/server";
import { loadUserData } from "@/lib/storage/user-store";

export const dynamic = "force-dynamic";

export default async function RoadmapPage() {
  const { roadmapPhases, topics, resources } = await loadUserData((await requireUser()).user.id);
  const done = topics.filter((topic) => topic.status === "completed").length;
  return <div className="space-y-8">
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-blue-950 to-slate-900 p-6 text-white sm:p-9">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200"><Sparkles size={15}/> Guided learning path</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">From first steps to advanced AI engineering</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100">Follow the phases in order, learn each topic, practice with a small deliverable, then check your understanding. You can revisit any stage whenever you need.</p>
      <div className="mt-6 flex flex-wrap gap-3"><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs">{roadmapPhases.length} learning stages</span><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs">{topics.length} lessons</span><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs">{resources.length} learning resources</span><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs">{done} lessons completed</span></div>
    </section>
    <section aria-label="Roadmap phases" className="space-y-5">
      {roadmapPhases.map((phase) => {
        const phaseTopics = topics.filter((topic) => topic.phaseId === phase.id);
        const complete = phaseTopics.filter((topic) => topic.status === "completed").length;
        const progress = phaseTopics.length ? Math.round(complete / phaseTopics.length * 100) : 0;
        const firstIncomplete = phaseTopics.find((topic) => topic.status !== "completed");
        return <article key={phase.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-50 text-sm font-bold text-blue-900">{String(phase.order).padStart(2,"0")}</span>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-slate-950">{phase.title}</h2><StatusBadge status={phase.status}/></div><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{phase.summary}</p><div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><Clock3 size={14}/>{phase.estimatedHours} estimated hours</span><span>{phaseTopics.length} lessons</span><span>{complete} of {phaseTopics.length} complete</span></div><div className="mt-3 h-1.5 max-w-xl overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500" style={{width:`${progress}%`}}/></div></div>
            {firstIncomplete && <Link href="/topics" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-800"><Play size={14}/> Start lesson</Link>}
          </div>
          <details className="group mt-5 border-t border-slate-100 pt-4"><summary className="cursor-pointer list-none text-sm font-semibold text-blue-800 marker:hidden">{phaseTopics.length ? "View lessons and resources" : "Explore this stage"}<span className="ml-2 text-slate-400 group-open:hidden">＋</span><span className="ml-2 hidden text-slate-400 group-open:inline">−</span></summary>
            {phaseTopics.length ? <div className="mt-4 grid gap-3 lg:grid-cols-2">{phaseTopics.map((topic,index) => { const linked = resources.filter((resource) => resource.topicIds.includes(topic.id)).slice(0,2); return <div key={topic.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"><div className="flex items-start gap-3"><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${topic.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-white text-slate-500"}`}>{topic.status === "completed" ? <CheckCircle2 size={15}/> : <span className="text-xs font-semibold">{index+1}</span>}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-900">{topic.title}</h3><span className="text-[11px] text-slate-500">{topic.estimatedMinutes} min · {topic.difficulty}</span></div><p className="mt-1 text-xs leading-5 text-slate-600">{topic.description}</p>{topic.practicalExercise && <p className="mt-2 rounded-lg bg-white p-2.5 text-xs leading-5 text-slate-700"><strong>Try it:</strong> {topic.practicalExercise}</p>}{linked.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{linked.map((resource)=><a key={resource.id} target="_blank" rel="noreferrer" href={resource.url} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1.5 text-[11px] font-medium text-blue-800 hover:bg-blue-100"><BookOpen size={12}/>{resource.title}</a>)}</div>}<p className="mt-2 text-[11px] text-slate-500">Status: {topic.status.replaceAll("-"," ")}</p></div></div></div>})}</div> : <p className="mt-3 text-sm text-slate-600">Lessons for this stage will appear here as the learning path expands.</p>}
          </details></div>
        </article>;
      })}
    </section>
    <p className="text-xs leading-5 text-slate-500">Estimated time is a planning guide. Completing a lesson is your choice and progress is based on saved learner records.</p>
  </div>;
}

function StatusBadge({ status }: { status: "not-started" | "in-progress" | "completed" }) {
  const styles = status === "completed" ? "bg-emerald-50 text-emerald-800" : status === "in-progress" ? "bg-blue-50 text-blue-800" : "bg-slate-100 text-slate-600";
  const label = status === "not-started" ? "Ready to learn" : status === "in-progress" ? "In progress" : "Complete";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>{label}</span>;
}
