import Link from "next/link";
import { BookOpen, CheckCircle2, Clock3, Play, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth/server";
import { MoveControls, PrioritySelect } from "@/components/roadmap-controls";
import { TaskStatusButton } from "@/components/roadmap/task-status-button";
import { loadUserData } from "@/lib/storage/user-store";

export const dynamic = "force-dynamic";

export default async function RoadmapPage() {
  const { roadmapPhases, topics, resources, subtopics, learningTasks } = await loadUserData((await requireUser()).user.id);
  const done = topics.filter((topic) => topic.status === "completed").length;
  return <div className="space-y-8">
    <section className="overflow-hidden rounded-3xl border border-blue-100 bg-blue-50 p-6 text-slate-900 sm:p-9">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-800"><Sparkles size={15}/> Guided learning path</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">From first steps to advanced AI engineering</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">The starting schedule places one phase in each of 12 suggested months. Reorder phases to adjust the plan; the schedule is a guide, not a promise of mastery. Work through each subject, subtopic, and task, then use assessment evidence to decide when to advance.</p>
      <div className="mt-6 flex flex-wrap gap-3"><span className="rounded-full border border-white/20 bg-white px-3 py-1.5 text-xs">{roadmapPhases.length} suggested months</span><span className="rounded-full border border-white/20 bg-white px-3 py-1.5 text-xs">{topics.length} topics</span><span className="rounded-full border border-white/20 bg-white px-3 py-1.5 text-xs">{resources.length} learning resources</span><span className="rounded-full border border-white/20 bg-white px-3 py-1.5 text-xs">{done} topics completed</span></div>
    </section>
    <section aria-label="Roadmap phases" className="space-y-5">
      {[...roadmapPhases].sort((a, b) => a.order - b.order).map((phase, phaseIndex, sortedPhases) => {
        const phaseTopics = topics.filter((topic) => topic.phaseId === phase.id);
        const complete = phaseTopics.filter((topic) => topic.status === "completed").length;
        const phaseTopicIds = new Set(phaseTopics.map((topic) => topic.id));
        const phaseSubtopicIds = new Set(subtopics.filter((item) => phaseTopicIds.has(item.topicId)).map((item) => item.id));
        const phaseTasks = learningTasks.filter((task) => phaseSubtopicIds.has(task.subtopicId));
        const completeTasks = phaseTasks.filter((task) => task.status === "completed").length;
        const progress = phaseTasks.length ? Math.round(completeTasks / phaseTasks.length * 100) : phaseTopics.length ? Math.round(complete / phaseTopics.length * 100) : 0;
        const firstIncomplete = phaseTopics.find((topic) => topic.status !== "completed");
        const subjects = [...new Set(phaseTopics.map((topic) => topic.subject))];
        return <article key={phase.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-sm font-bold text-blue-900">{String(phase.order).padStart(2,"0")}</span>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-slate-950">{phase.title}</h2><StatusBadge status={phase.status}/><MoveControls kind="phase" id={phase.id} label={`phase ${phase.title}`} isFirst={phaseIndex === 0} isLast={phaseIndex === sortedPhases.length - 1} /></div><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{phase.summary}</p><div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500"><span>Suggested month {phase.order}</span><span className="inline-flex items-center gap-1"><Clock3 size={14}/>{phase.estimatedHours} estimated hours</span><span>{phaseTopics.length} topics</span><span>{complete} topics complete</span><span>{completeTasks}/{phaseTasks.length} tasks complete</span></div><div className="mt-3 h-1.5 max-w-xl overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{width:`${progress}%`}}/></div></div>
            {firstIncomplete && <Link href={`/topics/${firstIncomplete.id}`} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white"><Play size={14}/> Start lesson</Link>}
          </div>
          <details className="group mt-5 border-t border-slate-100 pt-4"><summary className="cursor-pointer list-none text-sm font-semibold text-blue-800 marker:hidden">{phaseTopics.length ? "View lessons and resources" : "Explore this stage"}<span className="ml-2 text-slate-400 group-open:hidden">＋</span><span className="ml-2 hidden text-slate-400 group-open:inline">−</span></summary>
            {phaseTopics.length ? <div className="mt-4 space-y-5">{subjects.map((subject) => {
              const subjectTopics = phaseTopics.filter((topic) => topic.subject === subject);
              return <section key={subject} aria-label={`${subject} subject`}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">{subject}</h3>
                <div className="grid gap-3 lg:grid-cols-2">{subjectTopics.map((topic) => {
                  const index = phaseTopics.indexOf(topic);
                  const linked = resources.filter((resource) => resource.topicIds.includes(topic.id)).slice(0, 2);
                  const topicSubtopics = subtopics.filter((item) => item.topicId === topic.id).sort((a, b) => a.order - b.order);
                  return <article key={topic.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-start gap-3"><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${topic.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-white text-slate-500"}`}>{topic.status === "completed" ? <CheckCircle2 size={15} /> : <span className="text-xs font-semibold">{index + 1}</span>}</span><div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold text-slate-900">{topic.title}</h4><span className="text-[11px] text-slate-500">{topic.estimatedMinutes} min · {topic.difficulty}</span></div>
                      <p className="mt-1 text-xs leading-5 text-slate-600">{topic.description}</p>
                      {topicSubtopics.length > 0 && <div className="mt-3 space-y-2">{topicSubtopics.map((subtopic) => {
                        const tasks = learningTasks.filter((task) => task.subtopicId === subtopic.id).sort((a, b) => a.title.localeCompare(b.title));
                        const completeTasks = tasks.filter((task) => task.status === "completed").length;
                        return <details key={subtopic.id} className="rounded-lg border border-slate-200 bg-white p-3">
                          <summary className="cursor-pointer text-xs font-semibold text-slate-800">{subtopic.title}<span className="ml-2 font-normal text-slate-500">{completeTasks}/{tasks.length} tasks · {subtopic.estimatedMinutes} min</span></summary>
                          {subtopic.description && <p className="mt-2 text-xs leading-5 text-slate-600">{subtopic.description}</p>}
                          {tasks.length > 0 && <ul className="mt-2 space-y-2">{tasks.map((task) => <li key={task.id} className="flex flex-wrap items-start justify-between gap-2 border-t border-slate-100 pt-2">
                            <div className="min-w-0"><p className={`text-xs font-medium ${task.status === "completed" ? "text-slate-500 line-through" : "text-slate-800"}`}>{task.title}<span className="ml-2 font-normal text-slate-500">{task.taskType} · {task.estimatedMinutes} min</span></p>{task.description && <p className="mt-1 text-xs leading-5 text-slate-600">{task.description}</p>}{task.completionCriteria && <p className="mt-1 text-[11px] leading-5 text-slate-500">Done when: {task.completionCriteria}</p>}</div>
                            <TaskStatusButton id={task.id} completed={task.status === "completed"} />
                          </li>)}</ul>}
                        </details>;
                      })}</div>}
                      {linked.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{linked.map((resource) => <a key={resource.id} target="_blank" rel="noreferrer" href={resource.url} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1.5 text-[11px] font-medium text-blue-800"><BookOpen size={12} />{resource.title}</a>)}</div>}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] text-slate-500">Topic status: {topic.status.replaceAll("-", " ")}</p><span className="flex flex-wrap items-center gap-2"><PrioritySelect id={topic.id} label={topic.title} value={topic.priority} /><MoveControls kind="topic" id={topic.id} label={topic.title} isFirst={index === 0} isLast={index === phaseTopics.length - 1} /></span></div>
                    </div></div>
                  </article>;
                })}</div>
              </section>;
            })}</div> : <p className="mt-3 text-sm text-slate-600">Topics for this stage will appear here as the learning path expands.</p>}
          </details></div>
        </article>;
      })}
    </section>
    <p className="text-xs leading-5 text-slate-500">Estimated time is a planning guide. Task completion tracks learning activity; demonstrated competency still requires assessment evidence.</p>
  </div>;
}

function StatusBadge({ status }: { status: "not-started" | "in-progress" | "completed" }) {
  const styles = status === "completed" ? "bg-emerald-50 text-emerald-800" : status === "in-progress" ? "bg-blue-50 text-blue-800" : "bg-slate-100 text-slate-600";
  const label = status === "not-started" ? "Ready to learn" : status === "in-progress" ? "In progress" : "Complete";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>{label}</span>;
}
