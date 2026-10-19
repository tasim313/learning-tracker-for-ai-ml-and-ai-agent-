import { loadApplicationData } from "@/lib/storage/json-store";
import { timeEstimationAccuracy } from "@/lib/calculations/time";
import { competencyReadiness } from "@/lib/services/competency";

function csvCell(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  try {
    const data = await loadApplicationData();
    const params = new URL(request.url).searchParams;
    const format = params.get("format") ?? "csv";
    if (!["csv", "exams", "json", "print"].includes(format)) return Response.json({ error: "Format must be csv, exams, json, or print." }, { status: 400 });
    const from = params.get("from") ?? "";
    const to = params.get("to") ?? "";
    const topicId = params.get("topicId") ?? "";
    if ((from && !isDate(from)) || (to && !isDate(to)) || (from && to && from > to)) {
      return Response.json({ error: "Provide a valid date range." }, { status: 400 });
    }
    if (topicId && !data.topics.some((topic) => topic.id === topicId)) {
      return Response.json({ error: "Selected topic was not found." }, { status: 400 });
    }
    const matches = (date: string, relatedTopics: string[]) =>
      (!from || date.slice(0, 10) >= from) &&
      (!to || date.slice(0, 10) <= to) &&
      (!topicId || relatedTopics.includes(topicId));
    const sessions = data.learningSessions.filter((session) => session.state === "completed");
    const topicName = new Map(data.topics.map((topic) => [topic.id, topic.title]));
    const selectedSessions = sessions.filter((session) => matches(session.startedAt, [session.topicId]));
    const selectedProjects = data.projects.filter((project) =>
      matches(project.updatedAt, project.topicIds)
    );
    const selectedRevisions = data.revisionSchedules.filter((revision) =>
      matches(revision.dueAt, [revision.topicId]) && revision.dueAt.slice(0, 10) <= new Date().toISOString().slice(0, 10)
    );
    const attempts = data.examinationAttempts.filter((attempt) =>
      attempt.submittedAt && matches(attempt.startedAt, [...new Set(attempt.questionSnapshots.map((question) => question.topicId))])
    );
    if (format === "json") {
      const topicRows = data.topics.filter((topic) => !topicId || topic.id === topicId).map((topic) => {
        const topicSessions = selectedSessions.filter((session) => session.topicId === topic.id);
        const topicAttempts = attempts.filter((attempt) => attempt.questionSnapshots.some((question) => question.topicId === topic.id));
        return {
          topicId: topic.id,
          title: topic.title,
          learningStatus: topic.status,
          competency: competencyReadiness(data, topic.id),
          completedSessions: topicSessions.length,
          focusedMinutes: Math.round(topicSessions.reduce((total, session) => total + session.focusedSeconds, 0) / 60),
          examinationAttempts: topicAttempts.map((attempt) => ({ id: attempt.id, examType: attempt.examType, startedAt: attempt.startedAt, submittedAt: attempt.submittedAt, scorePercent: attempt.scorePercent, result: attempt.result }))
        };
      });
      const monthly = new Map<string, { sessions: number; focusedMinutes: number }>();
      for (const session of selectedSessions) {
        const month = (session.endedAt ?? session.startedAt).slice(0, 7);
        const current = monthly.get(month) ?? { sessions: 0, focusedMinutes: 0 };
        current.sessions += 1;
        current.focusedMinutes += Math.round(session.focusedSeconds / 60);
        monthly.set(month, current);
      }
      const report = {
        generatedAt: new Date().toISOString(),
        filters: { from: from || null, to: to || null, topicId: topicId || null },
        summary: {
          topicCount: topicRows.length,
          completedTopics: topicRows.filter((topic) => ["completed", "mastered"].includes(topic.learningStatus)).length,
          completedSessions: selectedSessions.length,
          focusedMinutes: Math.round(selectedSessions.reduce((total, session) => total + session.focusedSeconds, 0) / 60),
          examinationAttempts: attempts.length,
          scoredAttempts: attempts.filter((attempt) => attempt.scorePercent !== null).length,
          projectMilestonesCompleted: selectedProjects.filter((project) => project.status === "completed").length,
          dueRevisions: selectedRevisions.length
        },
        topics: topicRows,
        timeEstimation: selectedSessions.map((session) => ({
          sessionId: session.id,
          plannedSeconds: session.plannedSeconds,
          focusedSeconds: session.focusedSeconds,
          accuracyPercent: timeEstimationAccuracy(session.plannedSeconds, session.focusedSeconds)
        })),
        monthlyLearning: [...monthly.entries()].map(([month, values]) => ({ month, ...values })),
        examinationResults: attempts,
        weeklyReviews: data.weeklyReviews.filter((review) => matches(review.weekStarting, [])),
        projects: selectedProjects
      };
      return new Response(`${JSON.stringify(report, null, 2)}\n`, {
        headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="learning-tracker-report.json"', "Cache-Control": "no-store" }
      });
    }
    if (format === "exams") {
      const header = ["attemptId", "examType", "startedAt", "submittedAt", "scorePercent", "passingPercent", "result", "manualGraded"];
      const rows = attempts.map((attempt) => [attempt.id, attempt.examType, attempt.startedAt, attempt.submittedAt, attempt.scorePercent, attempt.passingPercent, attempt.result, attempt.manualGraded]);
      const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
      return new Response(`${csv}\r\n`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="examination-results.csv"', "Cache-Control": "no-store" } });
    }
    if (format === "print") {
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Learning Tracker Report</title><style>body{font:16px Arial;color:#172b4d;max-width:900px;margin:40px auto;padding:0 20px}table{border-collapse:collapse;width:100%}th,td{text-align:left;border:1px solid #dce4ec;padding:8px}th{background:#f5f8fb}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Print report</button><h1>Learning activity report</h1><p>Generated ${new Date().toLocaleString()}</p><p>Completed sessions ${selectedSessions.length} · Focused hours ${(selectedSessions.reduce((sum, session) => sum + session.focusedSeconds, 0) / 3600).toFixed(1)} · Scored examinations ${attempts.filter((attempt) => attempt.scorePercent !== null).length}</p><table><thead><tr><th>Started</th><th>Topic</th><th>Focused min</th><th>Break min</th><th>Estimated accuracy</th></tr></thead><tbody>${selectedSessions.map((session) => `<tr><td>${new Date(session.startedAt).toLocaleString()}</td><td>${escapeHtml(topicName.get(session.topicId) ?? "Unknown topic")}</td><td>${Math.round(session.focusedSeconds / 60)}</td><td>${Math.round(session.breakSeconds / 60)}</td><td>${session.plannedSeconds > 0 ? `${Math.round(timeEstimationAccuracy(session.plannedSeconds, session.focusedSeconds) ?? 0)}%` : "N/A"}</td></tr>`).join("")}</tbody></table></body></html>`;
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
    }
    const header = ["sessionId", "topic", "startedAt", "endedAt", "focusedSeconds", "pausedSeconds", "breakSeconds", "plannedSeconds", "estimationAccuracyPercent", "rating"];
    const rows = selectedSessions.map((session) => [
      session.id, topicName.get(session.topicId) ?? "Unknown topic", session.startedAt, session.endedAt,
      session.focusedSeconds, session.pausedSeconds, session.breakSeconds, session.plannedSeconds,
      timeEstimationAccuracy(session.plannedSeconds, session.focusedSeconds), session.rating
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    return new Response(`${csv}\r\n`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="learning-sessions.csv"',
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("Unable to create report.", error);
    return Response.json({ error: "Report could not be generated from saved data." }, { status: 500 });
  }
}

function isDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
