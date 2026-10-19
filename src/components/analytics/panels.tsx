"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAnalytics } from "@/components/analytics/use-analytics";
import { gapCategories } from "@/lib/services/analytics";

const pct = (value: number | null | undefined) => value === null || value === undefined ? "N/A" : `${Math.round(value * 10) / 10}%`;
const duration = (seconds: number | null) => seconds === null ? "—" : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;

function Loading({ error }: { error: string }) {
  return error ? <p role="alert" className="text-sm text-red-700">{error}</p> : <p className="text-sm text-slate-600">Calculating from your records…</p>;
}

function Breakdown({ title, rows, label }: { title: string; rows: { key: string; earned: number; possible: number; count: number; percent: number | null }[]; label: (key: string) => string }) {
  if (!rows.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <ul className="mt-1 space-y-1 text-sm">{rows.map((row) => <li key={row.key} className="flex justify-between gap-3"><span className="truncate">{label(row.key)}</span><span className="font-mono">{Math.round(row.earned * 100) / 100}/{row.possible} · {pct(row.percent)}</span></li>)}</ul>
    </div>
  );
}

/** Detailed results for every submitted attempt: marks, outcome counts, breakdowns, practical status, and improvement. */
export function ExamResultsPanel({ attempts }: { attempts: Record<string, unknown>[] }) {
  const { data, error } = useAnalytics();
  if (!data) return <div className="xl:col-span-2"><Loading error={error} /></div>;
  const submitted = attempts.filter((attempt) => attempt.submittedAt).sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
  if (!submitted.length) return <p className="xl:col-span-2 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No submitted examinations yet.</p>;
  return (
    <section className="space-y-4 xl:col-span-2" aria-label="Examination results">
      {submitted.map((attempt) => {
        const breakdown = data.examBreakdowns[String(attempt.id)];
        const scores = data.firstAndBest[String(attempt.blueprintId)];
        if (!breakdown) return null;
        const passed = attempt.result === "pass";
        const criticalFailed = breakdown.practical.some((item) => item.critical && item.status !== "correct");
        return (
          <article key={String(attempt.id)} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{data.blueprintTitles[String(attempt.blueprintId)] ?? "Examination"}</h2>
                <p className="text-xs text-slate-500">{String(attempt.examType)} · submitted {new Date(String(attempt.submittedAt)).toLocaleString()} · time taken {duration(breakdown.timeTakenSeconds)}{attempt.selfDeclaredClosedBook ? " · closed-book (self-declared, not proctored)" : ""}</p>
              </div>
              <Link href={`/answer-review?attemptId=${encodeURIComponent(String(attempt.id))}`} className="text-sm font-semibold text-blue-800 underline">Review answers</Link>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
              <div><dt className="text-xs text-slate-500">Marks</dt><dd className="font-semibold">{attempt.marksEarned === null ? "Pending" : String(attempt.marksEarned)} / {String(attempt.totalMarks)}</dd></div>
              <div><dt className="text-xs text-slate-500">Score</dt><dd className="font-semibold">{pct(attempt.scorePercent as number | null)}</dd></div>
              <div><dt className="text-xs text-slate-500">Passing threshold</dt><dd className="font-semibold">{String(attempt.passingPercent)}%</dd></div>
              <div><dt className="text-xs text-slate-500">Outcome</dt><dd className={`font-semibold ${passed ? "text-emerald-700" : "text-amber-800"}`}>{attempt.result === null ? "Awaiting manual grading" : passed ? "Passed" : "Not yet passed"}</dd></div>
              <div><dt className="text-xs text-slate-500">Grading</dt><dd className="font-semibold">{String(attempt.grading ?? "—")}</dd></div>
              <div><dt className="text-xs text-slate-500">Since previous attempt</dt><dd className="font-semibold">{breakdown.improvement === null ? "First attempt" : `${breakdown.improvement >= 0 ? "+" : ""}${Math.round(breakdown.improvement * 10) / 10} points`}</dd></div>
            </dl>
            <p className="mt-3 text-sm text-slate-700">Correct {breakdown.counts.correct} · partially correct {breakdown.counts.partial} · incorrect {breakdown.counts.incorrect} · unanswered {breakdown.counts.unanswered}{breakdown.counts.manual ? ` · awaiting manual grading ${breakdown.counts.manual}` : ""}</p>
            {criticalFailed && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">A required practical task was not passed, so a high theory score cannot compensate for it.</p>}
            {scores && <p className="mt-2 text-xs text-slate-600">For this examination: first attempt {pct(scores.first)} · best {pct(scores.best)} · latest {pct(scores.latest)} · {scores.attempts} graded attempt(s).</p>}
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Breakdown title="By topic" rows={breakdown.byTopic} label={(key) => data.topicTitles[key] ?? key} />
              <Breakdown title="By difficulty" rows={breakdown.byDifficulty} label={(key) => key} />
              <Breakdown title="By question type" rows={breakdown.byType} label={(key) => key.replace(/-/g, " ")} />
            </div>
            {breakdown.practical.length > 0 && <p className="mt-3 text-sm text-slate-700">Practical tasks: {breakdown.practical.map((item) => `${item.marksEarned}/${item.maxMarks} (${item.status}${item.critical ? ", required" : ""})`).join(" · ")}</p>}
            <p className="mt-3 text-xs text-slate-500">The overall percentage is one signal. Competency also requires practical evidence and delayed retention; see <Link href="/competency" className="underline">Competency</Link>.</p>
          </article>
        );
      })}
    </section>
  );
}

export function GapReport() {
  const { data, error } = useAnalytics();
  if (!data) return <div className="xl:col-span-2"><Loading error={error} /></div>;
  const { items, byCategory } = data.gaps;
  return (
    <section className="space-y-4 xl:col-span-2" aria-label="Learning gaps">
      <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {byCategory.map((item) => <div key={item.category} className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">{item.category}</p><p className="text-xl font-semibold text-slate-900">{item.count}</p></div>)}
      </div>
      <p className="text-xs text-slate-500">Categories describe the kind of skill a question tested. They are labelled as possible gaps because the cause of an error cannot be known from one answer. Categories: {gapCategories.join(", ")}.</p>
      {items.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No incorrect, partially correct, or unanswered graded answers are recorded.</p> : items.map((item) => (
        <article key={item.key} className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Possible knowledge gap · {item.category} · {item.status}</p>
          <h3 className="mt-1 text-sm font-semibold text-slate-900">Tested concept: {item.testedConcept}</h3>
          <p className="mt-1 text-sm text-slate-700">{item.prompt}</p>
          <dl className="mt-3 grid gap-2 text-sm md:grid-cols-2">
            <div><dt className="text-xs text-slate-500">Your answer</dt><dd>{item.submittedAnswer || "No answer"}</dd></div>
            <div><dt className="text-xs text-slate-500">Expected answer</dt><dd>{item.expectedAnswer}</dd></div>
            <div className="md:col-span-2"><dt className="text-xs text-slate-500">Why it was marked this way</dt><dd>{item.why || "No explanation was stored with the question."}</dd></div>
            {item.possibleMisconceptions.length > 0 && <div className="md:col-span-2"><dt className="text-xs text-slate-500">Possible underlying misconceptions (not confirmed)</dt><dd>{item.possibleMisconceptions.join("; ")}</dd></div>}
            <div><dt className="text-xs text-slate-500">Prerequisites to review</dt><dd>{item.prerequisitesToReview.length ? item.prerequisitesToReview.join(", ") : "None recorded"}</dd></div>
            <div><dt className="text-xs text-slate-500">Suggested revision date</dt><dd>{new Date(item.suggestedRevisionDate).toLocaleDateString()}</dd></div>
            {item.recommendedExercise && <div className="md:col-span-2"><dt className="text-xs text-slate-500">Recommended exercise</dt><dd>{item.recommendedExercise}</dd></div>}
          </dl>
          {item.topicId && <Link href={`/topics/${encodeURIComponent(item.topicId)}`} className="mt-3 inline-block text-sm font-medium text-blue-800 underline">Open topic: {item.topicTitle}</Link>}
        </article>
      ))}
    </section>
  );
}

export function DisciplinePanel() {
  const { data, error } = useAnalytics();
  if (!data) return <div className="xl:col-span-2"><Loading error={error} /></div>;
  const value = data.consistency;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-2">
      <h2 className="text-base font-semibold text-slate-900">Learning consistency</h2>
      <dl className="mt-3 grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">Consistency (last {value.windowDays} days)</dt><dd className="text-2xl font-semibold">{pct(value.score)}</dd></div>
        <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">Planned study days</dt><dd className="text-2xl font-semibold">{value.plannedDays}</dd></div>
        <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">Planned days with study</dt><dd className="text-2xl font-semibold">{value.daysWithStudy}</dd></div>
        <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">Flexible streak</dt><dd className="text-2xl font-semibold">{value.flexibleStreak}</dd></div>
      </dl>
      <div className="mt-4 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
        <p className="font-semibold">How this is calculated</p>
        <p className="mt-1 font-mono text-xs">consistency = planned study days with ≥ 1 completed session ÷ planned study days × 100</p>
        <p className="mt-1">Planned study days are the weekdays chosen in <Link href="/settings" className="underline">Settings</Link>, minus days marked as rest days in the <Link href="/planner" className="underline">planner</Link>. The flexible streak counts consecutive planned study days with a session, skipping rest and non-study days. Today does not break it before the day ends. Breaks, illness, and planned time off never reduce either number. This measures routine, not ability.</p>
      </div>
    </section>
  );
}

export function RewardsPanel() {
  const { data, error } = useAnalytics();
  const [achievements, setAchievements] = useState<{ id: string; title: string; unlockedAt: string }[]>([]);
  useEffect(() => { void fetch("/api/collections/achievements", { cache: "no-store" }).then((response) => response.ok ? response.json() : []).then(setAchievements).catch(() => setAchievements([])); }, []);
  if (!data) return <div className="xl:col-span-2"><Loading error={error} /></div>;
  const value = data.rewards;
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 xl:col-span-2">
      <h2 className="text-base font-semibold text-slate-900">Experience, levels, and challenges</h2>
      <dl className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">Experience points</dt><dd className="text-2xl font-semibold">{value.xp}</dd></div>
        <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">Learning level</dt><dd className="text-2xl font-semibold">{value.level}</dd></div>
        <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">Badges</dt><dd className="text-2xl font-semibold">{achievements.length}</dd></div>
        <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">Monthly goals done</dt><dd className="text-2xl font-semibold">{value.monthlyGoals.completed}/{value.monthlyGoals.total}</dd></div>
      </dl>
      <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
        <p className="font-semibold">How points work</p>
        <p className="mt-1 font-mono text-xs">level = floor(XP ÷ 100) + 1 · {value.toNextLevel} XP to level {value.level + 1}</p>
        <p className="mt-1">Points come only from meaningful, recorded evidence, and each event counts once: completed focused session 2, completed lesson 3, first fully correct game 5, passed assessment 10, completed project milestone 20. Repeating an activity never awards the same points again. Points measure recorded activity, not ability, and no points are lost for breaks.</p>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-900">This week’s challenges</h3>
        <ul className="mt-2 space-y-2">
          {value.challenges.map((challenge) => (
            <li key={challenge.id} className="text-sm">
              <div className="flex justify-between gap-3"><span>{challenge.title}</span><span className="font-mono">{Math.min(challenge.progress, challenge.target)}/{challenge.target}{challenge.complete ? " ✓" : ""}</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-teal-600" style={{ width: `${Math.min(100, challenge.progress / challenge.target * 100)}%` }} /></div>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">Challenges are optional and award no points, so there is no pressure to study when you are unwell or resting.</p>
      </div>
      {achievements.length > 0 && <div><h3 className="text-sm font-semibold text-slate-900">Badges</h3><ul className="mt-2 flex flex-wrap gap-2">{achievements.map((achievement) => <li key={achievement.id} className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-900">{achievement.title} · {new Date(achievement.unlockedAt).toLocaleDateString()}</li>)}</ul></div>}
    </section>
  );
}
