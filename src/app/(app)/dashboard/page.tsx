import Link from "next/link";
import { ArrowRight, BookOpenCheck, CheckCircle2, Clock3, Compass, ListChecks, Play, Route } from "lucide-react";
import { getDashboardSummary } from "@/lib/services/dashboard";
import { requireUser } from "@/lib/auth/server";
import { loadUserData } from "@/lib/storage/user-store";
import { studyTimeByDay, timeEstimationAccuracy } from "@/lib/calculations/time";
import type { ApplicationData } from "@/lib/model";
import { competencyReadiness } from "@/lib/services/competency";
import { DashboardCharts } from "@/components/analytics/dashboard-charts";
import { consistency, dashboardSeries } from "@/lib/services/analytics";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await loadUserData((await requireUser()).user.id);
  const summary = getDashboardSummary(data);
  const nextTopic = data.topics.find((topic) => topic.status !== "completed" && topic.status !== "blocked") ?? null;
  const nextPhase = nextTopic ? data.roadmapPhases.find((phase) => phase.id === nextTopic.phaseId) : summary.nextPhase;
  const nextResources = nextTopic ? data.resources.filter((resource) => resource.topicIds.includes(nextTopic.id) || resource.phaseId === nextTopic.phaseId).slice(0, 3) : [];
  const nextResource = nextResources.find((resource) => resource.type !== "practice") ?? nextResources[0];
  const topicProgress = data.topics.length ? Math.round((data.topics.filter((topic) => topic.status === "completed").length / data.topics.length) * 100) : 0;
  const progress = summary.phaseCount
    ? Math.round((summary.completedPhases / summary.phaseCount) * 100)
    : 0;
  const completedSessions = data.learningSessions.filter((session) => session.state === "completed");
  const attempts = data.examinationAttempts.filter((attempt) => attempt.submittedAt);
  const scoredAttempts = attempts.filter((attempt) => attempt.scorePercent !== null);
  const estimates = completedSessions
    .map((session) => timeEstimationAccuracy(session.plannedSeconds, session.focusedSeconds))
    .filter((accuracy): accuracy is number => accuracy !== null);
  const upcomingRevisions = data.revisionSchedules
    .filter((revision) => revision.dueAt.slice(0, 10) <= new Date().toISOString().slice(0, 10))
    .length;
  const timezone = typeof data.settings.timezone === "string" ? data.settings.timezone : "UTC";
  const dailyStudy = studyTimeByDay(data, 7, new Date(), timezone);
  const routine = consistency(data);
  const streak = routine.flexibleStreak;
  const firstScored = countFirstAttempts(attempts).filter((attempt) => attempt.scorePercent !== null);
  const firstAverage = firstScored.length
    ? Math.round(firstScored.reduce((sum, attempt) => sum + (attempt.scorePercent ?? 0), 0) / firstScored.length)
    : null;
  const recentScores = [...scoredAttempts].sort((left, right) => left.startedAt.localeCompare(right.startedAt)).slice(-7);
  const latestRetention = [...scoredAttempts].filter((attempt) => attempt.examType === "retention").sort((left, right) => left.startedAt.localeCompare(right.startedAt)).slice(-2);
  const nextRequirement = data.topics.map((topic) => ({
    topic,
    readiness: competencyReadiness(data, topic.id)
  })).find(({ readiness }) => readiness.requirements.length > 0);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-blue-100 bg-blue-50 px-6 py-7 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-800">Your AI engineering journey</p>
            <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900">Learn by building. See what you can demonstrate.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-700">A guided path from Python foundations to production AI, with lessons, practice, examinations and projects in one place.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/recommendations" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"><Play size={16} aria-hidden="true" /> What should I learn next? <ArrowRight size={15} aria-hidden="true" /></Link>
              <Link href="/courses" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-900"><Compass size={16} aria-hidden="true" /> Browse courses</Link>
            </div>
          </div>
          <div className="rounded-xl border border-blue-100 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Learning progress</p>
            <div className="mt-3 flex items-end justify-between"><span className="text-4xl font-semibold text-slate-900">{topicProgress}<span className="text-xl">%</span></span><span className="text-right text-xs leading-5 text-slate-600">{summary.completedTopics} of {summary.topicCount}<br />topics marked complete</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${topicProgress}%` }} /></div>
            <p className="mt-3 text-xs text-slate-500">Completion is not competency. See the Competency page for demonstrated skills.</p>
          </div>
        </div>
      </section>
      {nextTopic && <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 sm:p-6"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-800"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white"><CheckCircle2 size={16}/></span>Recommended next lesson</div><p className="mt-4 text-xs text-slate-500">{nextPhase ? `Phase ${nextPhase.order} · ${nextPhase.title}` : "Your learning path"}</p><h2 className="mt-1 text-xl font-semibold text-slate-950">{nextTopic.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{nextTopic.description}</p><p className="mt-3 text-xs text-slate-600">About {nextTopic.estimatedMinutes} minutes · {nextTopic.difficulty}</p><Link href={`/topics/${nextTopic.id}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-800">Open topic and readiness <ArrowRight size={15}/></Link></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Start with a resource</p><h2 className="mt-1 text-base font-semibold text-slate-900">{nextResource?.title ?? "Your learning materials"}</h2></div><BookOpenCheck className="text-blue-700" size={20}/></div><p className="mt-2 text-sm leading-6 text-slate-600">{nextResource?.notes ?? "Browse videos, courses, slides and guided exercises matched to your roadmap."}</p><div className="mt-4 flex gap-3">{nextResource && <a href={nextResource.url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white">Open {nextResource.type} <ArrowRight size={14}/></a>}<Link href="/resources" className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700">All resources</Link></div></article>
      </section>}

      <section aria-label="Learning summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Route size={18} />} label="Roadmap progress" value={`${progress}%`} detail={`${summary.completedPhases} of ${summary.phaseCount} phases complete`} />
        <MetricCard icon={<BookOpenCheck size={18} />} label="Topics tracked" value={String(summary.topicCount)} detail={`${summary.completedTopics} completed or mastered`} />
        <MetricCard icon={<Clock3 size={18} />} label="Focused study" value={`${Math.floor(summary.focusedMinutes / 60)}h ${summary.focusedMinutes % 60}m`} detail="Completed learning sessions" />
        <MetricCard icon={<ListChecks size={18} />} label="Examinations" value={String(attempts.length)} detail={`${scoredAttempts.length} scored · ${upcomingRevisions} revisions due`} />
      </section>

      <DashboardCharts series={dashboardSeries(data)} />

      <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Learning roadmap</h2>
              <p className="mt-1 text-sm text-slate-500">Your staged path to building commercial AI systems</p>
            </div>
            <Link href="/roadmap" className="text-sm font-semibold text-blue-700 focus-visible:underline">See all</Link>
          </div>
          <div className="space-y-4">
            {data.roadmapPhases.slice(0, 5).map((phase) => (
              <div key={phase.id} className="flex items-start gap-3">
                <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${phase.status === "completed" ? "bg-emerald-600" : phase.status === "in-progress" ? "bg-blue-600" : "bg-slate-300"}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{phase.order}. {phase.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{phase.summary}</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{statusLabel(phase.status)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-5 sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">Suggested next step</h2>
          {summary.nextPhase ? (
            <>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-blue-700">Phase {summary.nextPhase.order}</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">{summary.nextPhase.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{summary.nextPhase.summary}</p>
              <Link href="/roadmap" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 focus-visible:underline">
                Review roadmap <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-600">All roadmap phases are complete. Review your evidence and plan what to deepen next.</p>
          )}
        </div>
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="text-base font-semibold text-slate-900">Focused time · last 7 days</h2><p className="mt-1 text-xs text-slate-500">Completed sessions only; no fabricated activity.</p></div>
            <p className="text-xs text-slate-500">Flexible streak: {streak} planned study {streak === 1 ? "day" : "days"} · consistency {routine.score === null ? "N/A" : `${Math.round(routine.score)}%`} (last 28 days; rest days excluded)</p>
          </div>
          <div className="mt-5 flex h-36 items-end gap-2" role="img" aria-label="Completed focused learning minutes by day for the last seven days">
            {dailyStudy.map(({ date, plannedMinutes, focusedMinutes }) => {
              const max = Math.max(1, ...dailyStudy.flatMap((day) => [day.plannedMinutes, day.focusedMinutes]));
              return <div key={date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                {focusedMinutes > 0 && <span className="text-[10px] text-slate-500">{focusedMinutes}m</span>}
                <div className="flex h-full w-full items-end justify-center gap-1">
                  <div className="w-2/5 rounded-t bg-slate-300" style={{ height: `${plannedMinutes ? Math.max(3, plannedMinutes / max * 100) : 0}%` }} />
                  <div className="w-2/5 rounded-t bg-blue-600" style={{ height: `${focusedMinutes ? Math.max(3, focusedMinutes / max * 100) : 0}%` }} />
                </div>
                <span className="text-[10px] text-slate-500">{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</span>
              </div>;
            })}
          </div>
          <div className="mt-3 flex gap-4 text-[11px] text-slate-500"><span><span className="mr-1 inline-block h-2 w-2 bg-blue-600" />Focused</span><span><span className="mr-1 inline-block h-2 w-2 bg-slate-300" />Planned</span></div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-900">Evidence snapshot</h2>
          <p className="mt-1 text-xs text-slate-500">Assessment scores are not self-confidence ratings.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <SmallMetric label="First-attempt score average" value={firstAverage === null ? "N/A" : `${firstAverage}%`} />
            <SmallMetric label="Best scored result" value={scoredAttempts.length ? `${Math.max(...scoredAttempts.map((attempt) => attempt.scorePercent ?? 0)).toFixed(0)}%` : "N/A"} />
            <SmallMetric label="Average planning accuracy" value={estimates.length ? `${Math.round(estimates.reduce((sum, value) => sum + value, 0) / estimates.length)}%` : "N/A"} />
            <SmallMetric label="Practical projects complete" value={`${data.projects.filter((project) => project.status === "completed").length} / ${data.projects.length}`} />
            <SmallMetric label="Recent retention average" value={latestRetention.length ? `${Math.round(latestRetention.reduce((sum, attempt) => sum + (attempt.scorePercent ?? 0), 0) / latestRetention.length)}%` : "N/A"} />
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">Time-estimation accuracy = 100 × (1 − |actual focused time − planned time| ÷ planned time), clamped to 0–100. It measures planning accuracy only, not intelligence or skill.</p>
          {nextRequirement && <p className="mt-3 rounded bg-amber-50 p-3 text-xs leading-5 text-amber-950"><strong>Next evidence to build: {nextRequirement.topic.title}.</strong> {nextRequirement.readiness.requirements[0]}</p>}
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">Recent examination scores</h2>
        <p className="mt-1 text-xs text-slate-500">Submitted and scored attempts only; first-attempt and best scores are reported separately above.</p>
        {recentScores.length === 0 ? <p className="mt-4 text-sm text-slate-500">No scored examinations yet.</p> : <div className="mt-5 flex h-32 items-end gap-2" role="img" aria-label="Most recent examination scores">
          {recentScores.map((attempt) => <div key={attempt.id} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
            <span className="text-[10px] text-slate-500">{Math.round(attempt.scorePercent ?? 0)}%</span>
            <div className="w-full rounded-t bg-emerald-600" style={{ height: `${Math.max(5, attempt.scorePercent ?? 0)}%` }} />
            <span className="max-w-full truncate text-[10px] text-slate-500">{new Date(attempt.startedAt).toLocaleDateString()}</span>
          </div>)}
        </div>}
      </section>
      <p className="text-xs text-slate-500">
        Dashboard measures come from saved records. No study activity or assessment results have been pre-filled.
      </p>
    </div>
  );
}

function MetricCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function statusLabel(status: "not-started" | "in-progress" | "completed") {
  return status === "not-started" ? "Not started" : status === "in-progress" ? "In progress" : "Completed";
}

function countFirstAttempts(attempts: ApplicationData["examinationAttempts"]) {
  const first = new Map<string, typeof attempts[number]>();
  [...attempts].sort((left, right) => left.startedAt.localeCompare(right.startedAt)).forEach((attempt) => {
    if (!first.has(attempt.blueprintId)) first.set(attempt.blueprintId, attempt);
  });
  return [...first.values()];
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold text-slate-900">{value}</p></div>;
}
