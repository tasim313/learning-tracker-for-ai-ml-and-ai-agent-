import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { applicationDataSchema } from "@/lib/model";
import { updateApplicationData } from "@/lib/storage/json-store";

export async function GET() {
  try {
    const { loadApplicationData } = await import("@/lib/storage/json-store");
    const data = await loadApplicationData();
    return NextResponse.json({ dailyReviews: data.dailyReviews, weeklyReviews: data.weeklyReviews }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load reviews.", error);
    return NextResponse.json({ error: "Saved reviews are unavailable." }, { status: 500 });
  }
}

function between(value: string, start: string, end: string) {
  const day = value.slice(0, 10);
  return day >= start && day <= end;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    if (payload.type === "weekly") {
      const weekStarting = typeof payload.weekStarting === "string" ? payload.weekStarting : "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStarting)) {
        return NextResponse.json({ error: "A valid week starting date is required." }, { status: 400 });
      }
      const result = await updateApplicationData((data) => {
        const weekEndingDate = new Date(`${weekStarting}T00:00:00Z`);
        weekEndingDate.setUTCDate(weekEndingDate.getUTCDate() + 6);
        const weekEnding = weekEndingDate.toISOString().slice(0, 10);
        const plans = data.studyPlans.filter((plan) => between(plan.date, weekStarting, weekEnding));
        const sessions = data.learningSessions.filter((session) => session.state === "completed" && session.endedAt && between(session.endedAt, weekStarting, weekEnding));
        const assessments = data.assessments.filter((assessment) => between(assessment.assessedAt, weekStarting, weekEnding));
        const projects = data.projects.filter((project) => between(project.updatedAt, weekStarting, weekEnding));
        const summary = {
          plannedCount: plans.length,
          completedPlanCount: plans.filter((plan) => plan.completed).length,
          unfinishedPlans: plans.filter((plan) => !plan.completed && !plan.restDay).map((plan) => plan.title),
          focusedMinutes: Math.round(sessions.reduce((sum, session) => sum + session.focusedSeconds, 0) / 60),
          sessionCount: sessions.length,
          struggles: sessions.map((session) => session.problems).filter(Boolean),
          assessments: assessments.map((assessment) => ({ topicId: assessment.topicId, scorePercent: assessment.scorePercent })),
          updatedProjects: projects.map((project) => project.title)
        };
        const previous = data.weeklyReviews.find((review) => review.weekStarting === weekStarting);
        const review = {
          id: previous?.id ?? randomUUID(),
          weekStarting,
          reflection: typeof payload.reflection === "string" ? payload.reflection : previous?.reflection ?? "",
          nextWeekFocus: typeof payload.nextWeekFocus === "string" ? payload.nextWeekFocus : previous?.nextWeekFocus ?? "",
          plannedLearning: typeof payload.plannedLearning === "string" ? payload.plannedLearning : previous?.plannedLearning ?? "",
          actuallyCompleted: typeof payload.actuallyCompleted === "string" ? payload.actuallyCompleted : previous?.actuallyCompleted ?? "",
          struggles: typeof payload.struggles === "string" ? payload.struggles : previous?.struggles ?? "",
          independentSkills: typeof payload.independentSkills === "string" ? payload.independentSkills : previous?.independentSkills ?? "",
          assessmentImprovements: typeof payload.assessmentImprovements === "string" ? payload.assessmentImprovements : previous?.assessmentImprovements ?? "",
          practiceNeeds: typeof payload.practiceNeeds === "string" ? payload.practiceNeeds : previous?.practiceNeeds ?? "",
          summary
        };
        const weeklyReviews = previous
          ? data.weeklyReviews.map((item) => item.id === previous.id ? review : item)
          : [...data.weeklyReviews, review];
        const next = applicationDataSchema.parse({ ...data, weeklyReviews });
        return { data: next, result: review };
      });
      return NextResponse.json(result);
    }
    if (payload.type === "daily") {
      const date = typeof payload.date === "string" ? payload.date : "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof payload.reflection !== "string" || typeof payload.nextAction !== "string") {
        return NextResponse.json({ error: "Date, reflection, and next action are required." }, { status: 400 });
      }
      const result = await updateApplicationData((data) => {
        const previous = data.dailyReviews.find((review) => review.date === date);
        const review = { id: previous?.id ?? randomUUID(), date, reflection: payload.reflection as string, nextAction: payload.nextAction as string };
        const dailyReviews = previous
          ? data.dailyReviews.map((item) => item.id === previous.id ? review : item)
          : [...data.dailyReviews, review];
        return { data: applicationDataSchema.parse({ ...data, dailyReviews }), result: review };
      });
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "Review type must be daily or weekly." }, { status: 400 });
  } catch (error) {
    console.error("Unable to save review.", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Review was not saved." }, { status: 400 });
  }
}
