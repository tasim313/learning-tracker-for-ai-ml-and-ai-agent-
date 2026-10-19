import { NextResponse } from "next/server";
import { applicationDataSchema } from "@/lib/model";
import { gradeManualQuestions, startExamination, submitExamination } from "@/lib/services/examinations";
import { updateCompetencyRecords } from "@/lib/services/competency";
import { recordRewardEvent } from "@/lib/services/rewards";
import { updateApplicationData } from "@/lib/storage/json-store";

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    if (payload.action === "start") {
      if (typeof payload.blueprintId !== "string") return error("An examination blueprint is required.");
      const result = await updateApplicationData((data) => {
        const attempt = startExamination(data, payload.blueprintId as string);
        const next = applicationDataSchema.parse({ ...data, examinationAttempts: [...data.examinationAttempts, attempt] });
        return { data: next, result: attempt };
      });
      return NextResponse.json(result, { status: 201 });
    }
    if (payload.action === "submit" || payload.action === "expire") {
      if (typeof payload.attemptId !== "string") return error("Examination attempt id is required.");
      const result = await updateApplicationData((data) => {
        const index = data.examinationAttempts.findIndex(({ id }) => id === payload.attemptId);
        if (index < 0) throw new Error("Examination attempt was not found.");
        const current = data.examinationAttempts[index];
        if (
          payload.action === "expire" &&
          Date.now() < Date.parse(current.startedAt) + current.timeLimitMinutes * 60000
        ) {
          throw new Error("This examination has not reached its time limit; submit it normally.");
        }
        const updated = submitExamination(current);
        const attempts = [...data.examinationAttempts];
        attempts[index] = updated;
        const topicIds = [...new Set(updated.questionSnapshots.map(({ topicId }) => topicId))];
        const award = updated.result === "pass"
          ? recordRewardEvent(data, {
            eventId: `exam-pass-${updated.id}`,
            title: "Assessment passed",
            earnedAt: updated.submittedAt ?? new Date().toISOString(),
            reason: `Passed ${updated.examType} examination ${updated.id}.`,
            points: 10,
            achievement: { id: "achievement-first-pass", title: "First assessment passed" }
          })
          : { rewards: data.rewards, achievements: data.achievements };
        const scheduleIntervals = [1, 3, 7, 14, 30];
        let revisionSchedules = [...data.revisionSchedules];
        for (const topicId of topicIds) {
          const previous = revisionSchedules.find((schedule) => schedule.topicId === topicId);
          const passed = updated.result === "pass";
          const intervalDays = passed && previous ? scheduleIntervals[Math.min(scheduleIntervals.length - 1, scheduleIntervals.indexOf(previous.intervalDays) + 1)] ?? 3 : passed ? 3 : 1;
          const dueAt = new Date(new Date(updated.submittedAt ?? Date.now()).getTime() + intervalDays * 86400000).toISOString();
          const entry = {
            id: previous?.id ?? `${updated.id}-${topicId}-revision`,
            topicId,
            dueAt,
            intervalDays,
            lastScorePercent: updated.scorePercent,
            sourceAttemptId: updated.id
          };
          revisionSchedules = previous
            ? revisionSchedules.map((schedule) => schedule.id === previous.id ? entry : schedule)
            : [...revisionSchedules, entry];
        }
        const interim = { ...data, examinationAttempts: attempts, revisionSchedules };
        const competencies = updateCompetencyRecords(interim, topicIds, updated.submittedAt ?? new Date().toISOString());
        const next = applicationDataSchema.parse({ ...interim, competencies, ...award });
        return { data: next, result: updated };
      });
      return NextResponse.json(result);
    }
    if (payload.action === "grade") {
      if (typeof payload.attemptId !== "string" || typeof payload.grades !== "object" || payload.grades === null) {
        return error("An attempt id and question grades are required.");
      }
      const result = await updateApplicationData((data) => {
        const index = data.examinationAttempts.findIndex(({ id }) => id === payload.attemptId);
        if (index < 0) throw new Error("Examination attempt was not found.");
        const updated = gradeManualQuestions(data.examinationAttempts[index], payload.grades as Record<string, { marksEarned: number; feedback: string }>);
        const attempts = [...data.examinationAttempts];
        attempts[index] = updated;
        const revisionSchedules = [...data.revisionSchedules];
        for (const scheduleIndex in revisionSchedules) {
          const schedule = revisionSchedules[scheduleIndex];
          if (schedule.sourceAttemptId !== updated.id) continue;
          const intervalDays = updated.result === "pass" ? 3 : 1;
          const dueAt = new Date(new Date(updated.submittedAt ?? Date.now()).getTime() + intervalDays * 86400000).toISOString();
          revisionSchedules[scheduleIndex] = { ...schedule, intervalDays, dueAt, lastScorePercent: updated.scorePercent };
        }
        const interim = { ...data, examinationAttempts: attempts, revisionSchedules };
        const topicIds = [...new Set(updated.questionSnapshots.map(({ topicId }) => topicId))];
        const competencies = updateCompetencyRecords(interim, topicIds, updated.submittedAt ?? new Date().toISOString());
        const award = updated.result === "pass"
          ? recordRewardEvent(data, {
            eventId: `exam-pass-${updated.id}`,
            title: "Assessment passed",
            earnedAt: updated.submittedAt ?? new Date().toISOString(),
            reason: `Passed ${updated.examType} examination ${updated.id} after manual grading.`,
            points: 10,
            achievement: { id: "achievement-first-pass", title: "First assessment passed" }
          })
          : { rewards: data.rewards, achievements: data.achievements };
        const next = applicationDataSchema.parse({ ...interim, competencies, ...award });
        return { data: next, result: updated };
      });
      return NextResponse.json(result);
    }
    return error("Unknown examination action.");
  } catch (cause) {
    console.error("Examination workflow failed.", cause);
    return error(cause instanceof Error ? cause.message : "Examination action failed.");
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    if (payload.action !== "answer" || typeof payload.attemptId !== "string" || typeof payload.questionId !== "string" || typeof payload.answer !== "string") {
      return error("Attempt id, question id, and answer are required.");
    }
    const result = await updateApplicationData((data) => {
      const index = data.examinationAttempts.findIndex(({ id }) => id === payload.attemptId);
      if (index < 0) throw new Error("Examination attempt was not found.");
      const attempt = data.examinationAttempts[index];
      if (attempt.submittedAt) throw new Error("Submitted answers are immutable.");
      if (!attempt.questionSnapshots.some(({ questionId }) => questionId === payload.questionId)) throw new Error("Question does not belong to this attempt.");
      const elapsed = Date.now() - Date.parse(attempt.startedAt);
      if (elapsed > attempt.timeLimitMinutes * 60000) throw new Error("Examination time expired; submit the attempt.");
      const updated = { ...attempt, answers: { ...attempt.answers, [payload.questionId as string]: payload.answer as string } };
      const attempts = [...data.examinationAttempts];
      attempts[index] = updated;
      return { data: applicationDataSchema.parse({ ...data, examinationAttempts: attempts }), result: updated };
    });
    return NextResponse.json(result);
  } catch (cause) {
    console.error("Unable to save examination answer.", cause);
    return error(cause instanceof Error ? cause.message : "Answer was not saved.");
  }
}
