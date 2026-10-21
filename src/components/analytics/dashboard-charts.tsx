"use client";

import { useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { dashboardSeries } from "@/lib/services/analytics";

type Series = ReturnType<typeof dashboardSeries>;
const colors = { blue: "#1d4ed8", teal: "#0f766e", amber: "#b45309", slate: "#94a3b8", violet: "#6d28d9" };

function ChartCard({ title, description, empty, table, children }: { title: string; description: string; empty: string | null; table: { headers: string[]; rows: (string | number)[][] }; children: ReactNode }) {
  return (
    <figure className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
      <figcaption>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </figcaption>
      {empty ? <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">{empty}</p> : (
        <>
          <div className="mt-3 h-56 w-full" aria-hidden="true">{children}</div>
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer font-medium text-slate-600">Show data table</summary>
            <div className="mt-2 max-h-48 overflow-auto">
              <table className="min-w-full text-left">
                <thead><tr>{table.headers.map((header) => <th key={header} scope="col" className="border-b border-slate-200 px-2 py-1 font-semibold">{header}</th>)}</tr></thead>
                <tbody>{table.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className="border-b border-slate-100 px-2 py-1">{cell}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </figure>
  );
}

const axis = { fontSize: 11, fill: "#64748b" };

export function DashboardCharts({ series }: { series: Series }) {
  const [range, setRange] = useState(14);
  const [subject, setSubject] = useState("");
  const daily = series.daily.slice(-range);
  const anyDaily = daily.some((day) => day.focusedMinutes || day.plannedMinutes || day.plannedSchedule);
  const proficiency = series.proficiency.filter((row) => !subject || row.subject === subject);
  return (
    <section aria-labelledby="charts-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="charts-heading" className="text-lg font-semibold text-slate-900">Progress over time</h2>
          <p className="text-sm text-slate-600">Every chart is calculated from your recorded sessions, plans, examinations, and projects.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="text-xs font-medium text-slate-700">Date range
            <select value={range} onChange={(event) => setRange(Number(event.target.value))} className="mt-1 block min-h-9 rounded-lg border border-slate-300 px-2 text-sm">
              <option value={7}>Last 7 days</option><option value={14}>Last 14 days</option><option value={30}>Last 30 days</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-700">Subject
            <select value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1 block min-h-9 max-w-48 rounded-lg border border-slate-300 px-2 text-sm">
              <option value="">All subjects</option>{series.subjects.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Daily learning time: planned vs actual" description="Planned minutes from the daily planner and timer sessions, compared with focused minutes from completed sessions."
          empty={anyDaily ? null : "No planned or completed sessions in this period."}
          table={{ headers: ["Date", "Planned (planner)", "Planned (sessions)", "Focused"], rows: daily.map((day) => [day.date, day.plannedSchedule, day.plannedMinutes, day.focusedMinutes]) }}>
          <ResponsiveContainer><BarChart data={daily}><CartesianGrid stroke="#f1f5f9" vertical={false} /><XAxis dataKey="date" tick={axis} tickFormatter={(value: string) => value.slice(5)} /><YAxis tick={axis} width={32} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="plannedSchedule" name="Planned (planner)" fill={colors.slate} /><Bar dataKey="focusedMinutes" name="Focused minutes" fill={colors.blue} /></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Weekly learning and consistency" description="Focused hours and number of study days in each of the last 12 weeks."
          empty={series.weekly.some((week) => week.focusedHours > 0) ? null : "No completed sessions in the last 12 weeks."}
          table={{ headers: ["Week starting", "Focused hours", "Study days"], rows: series.weekly.map((week) => [week.week, week.focusedHours, week.studyDays]) }}>
          <ResponsiveContainer><BarChart data={series.weekly}><CartesianGrid stroke="#f1f5f9" vertical={false} /><XAxis dataKey="week" tick={axis} tickFormatter={(value: string) => value.slice(5)} /><YAxis tick={axis} width={32} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="focusedHours" name="Focused hours" fill={colors.blue} /><Bar dataKey="studyDays" name="Study days" fill={colors.teal} /></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Focused time by activity" description="Completed timer-session focus time, classified when each session starts. Pauses and breaks are excluded."
          empty={series.activityBreakdown.some((item) => item.focusedMinutes > 0) ? null : "No completed timer sessions yet."}
          table={{ headers: ["Activity", "Focused minutes"], rows: series.activityBreakdown.map((item) => [item.label, item.focusedMinutes]) }}>
          <ResponsiveContainer><BarChart data={series.activityBreakdown}><CartesianGrid stroke="#f1f5f9" vertical={false} /><XAxis dataKey="label" tick={axis} /><YAxis tick={axis} width={32} /><Tooltip /><Bar dataKey="focusedMinutes" name="Focused minutes" fill={colors.violet} /></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Examination scores over time" description="Every graded attempt in submission order. Retention examinations are shown separately below."
          empty={series.scores.length ? null : "No graded examinations yet."}
          table={{ headers: ["Date", "Type", "Score %"], rows: series.scores.map((item) => [item.date, item.examType, item.score]) }}>
          <ResponsiveContainer><LineChart data={series.scores}><CartesianGrid stroke="#f1f5f9" /><XAxis dataKey="date" tick={axis} tickFormatter={(value: string) => value.slice(5)} /><YAxis domain={[0, 100]} tick={axis} width={32} /><Tooltip /><Line type="monotone" dataKey="score" name="Score %" stroke={colors.blue} strokeWidth={2} dot isAnimationActive={false} /></LineChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Retention performance" description="Delayed retention examination scores, which show what you still remember after time has passed."
          empty={series.retention.length ? null : "No delayed retention examinations yet. They are scheduled after you pass a topic."}
          table={{ headers: ["Date", "Score %"], rows: series.retention.map((item) => [item.date, item.score]) }}>
          <ResponsiveContainer><LineChart data={series.retention}><CartesianGrid stroke="#f1f5f9" /><XAxis dataKey="date" tick={axis} tickFormatter={(value: string) => value.slice(5)} /><YAxis domain={[0, 100]} tick={axis} width={32} /><Tooltip /><Line type="monotone" dataKey="score" name="Retention %" stroke={colors.teal} strokeWidth={2} dot isAnimationActive={false} /></LineChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Skill proficiency by subject" description="Average competency level per subject: 0 = not assessed … 5 = mastered. Uses verified assessment rules, not time spent."
          empty={proficiency.some((row) => row.averageLevel > 0) ? null : "No assessed topics yet. Competency appears after examinations are graded."}
          table={{ headers: ["Subject", "Average level", "Assessed topics", "Topics"], rows: proficiency.map((row) => [row.subject, row.averageLevel, row.assessedTopics, row.topics]) }}>
          <ResponsiveContainer><BarChart data={proficiency} layout="vertical"><CartesianGrid stroke="#f1f5f9" horizontal={false} /><XAxis type="number" domain={[0, 5]} tick={axis} /><YAxis type="category" dataKey="subject" tick={axis} width={110} /><Tooltip /><Bar dataKey="averageLevel" name="Average level" fill={colors.violet} /></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Topic completion by phase" description="Learning status recorded on each roadmap topic. Completion is separate from demonstrated competency."
          empty={null}
          table={{ headers: ["Phase", "Completed", "In progress", "Remaining"], rows: series.completion.map((row) => [`${row.phase} ${row.title}`, row.completed, row.inProgress, row.remaining]) }}>
          <ResponsiveContainer><BarChart data={series.completion}><CartesianGrid stroke="#f1f5f9" vertical={false} /><XAxis dataKey="phase" tick={axis} /><YAxis tick={axis} width={28} allowDecimals={false} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="completed" stackId="a" name="Completed" fill={colors.teal} /><Bar dataKey="inProgress" stackId="a" name="In progress" fill={colors.blue} /><Bar dataKey="remaining" stackId="a" name="Remaining" fill="#e2e8f0" /></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Practical project progress" description="Projects by status, including AI Sales Employee milestones."
          empty={series.projects.some((row) => row.count) ? null : "No projects recorded."}
          table={{ headers: ["Status", "Projects"], rows: series.projects.map((row) => [row.status, row.count]) }}>
          <ResponsiveContainer><BarChart data={series.projects}><CartesianGrid stroke="#f1f5f9" vertical={false} /><XAxis dataKey="status" tick={axis} /><YAxis tick={axis} width={28} allowDecimals={false} /><Tooltip /><Bar dataKey="count" name="Projects" fill={colors.amber} /></BarChart></ResponsiveContainer>
        </ChartCard>
      </div>
    </section>
  );
}
