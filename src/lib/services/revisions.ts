import type { ApplicationData, ExaminationAttempt } from "@/lib/model";
import { configuredIntervals } from "@/lib/services/flashcards";

const dayMs = 86_400_000;

/**
 * Schedule (or reschedule) a revision for every topic in a graded attempt, using the
 * learner's configured intervals (default 1, 3, 7, 14, 30 days):
 *  - not yet passed, or awaiting manual grading → the first interval
 *  - passed for the first time → the second interval
 *  - passed again → the next interval after the topic's current one (capped at the last)
 * Examination attempts themselves are never modified here; each attempt remains its own record.
 */
export function scheduleRevisions(data: ApplicationData, attempt: ExaminationAttempt): ApplicationData["revisionSchedules"] {
  const intervals = configuredIntervals(data.settings);
  const base = Date.parse(attempt.submittedAt ?? new Date().toISOString());
  let schedules = [...data.revisionSchedules];
  for (const topicId of new Set(attempt.questionSnapshots.map((question) => question.topicId))) {
    const previous = schedules.find((schedule) => schedule.topicId === topicId);
    let intervalDays: number;
    if (attempt.result !== "pass") intervalDays = intervals[0];
    else if (!previous || previous.sourceAttemptId === attempt.id) intervalDays = intervals[Math.min(1, intervals.length - 1)];
    else {
      const stage = intervals.findIndex((value) => value >= previous.intervalDays);
      intervalDays = intervals[Math.min(intervals.length - 1, (stage < 0 ? intervals.length - 1 : stage) + 1)];
    }
    const entry = {
      id: previous?.id ?? `${attempt.id}-${topicId}-revision`,
      topicId,
      dueAt: new Date(base + intervalDays * dayMs).toISOString(),
      intervalDays,
      lastScorePercent: attempt.scorePercent,
      sourceAttemptId: attempt.id
    };
    schedules = previous ? schedules.map((schedule) => schedule.id === previous.id ? entry : schedule) : [...schedules, entry];
  }
  return schedules;
}
