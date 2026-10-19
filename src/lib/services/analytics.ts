import type { ApplicationData, ExaminationAttempt } from "@/lib/model";
import { competencyReadiness } from "@/lib/services/competency";

/**
 * Analytics computed only from stored records. Every function returns empty or
 * null values when there is no data; nothing is estimated or invented.
 */

const dayMs = 86_400_000;
export const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function dateKey(value: Date | string, timezone = "UTC"): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function addDays(key: string, days: number): string {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekdayOf(key: string): string {
  return weekdays[new Date(`${key}T00:00:00Z`).getUTCDay()];
}

// ---------- Examination breakdown ----------

type Bucket = { earned: number; possible: number; count: number; percent: number | null };
function bucket(): Bucket { return { earned: 0, possible: 0, count: 0, percent: null }; }
function finish(map: Map<string, Bucket>) {
  return [...map.entries()].map(([key, value]) => ({ key, ...value, percent: value.possible > 0 ? value.earned / value.possible * 100 : null }));
}

/**
 * Score Percentage = Marks Earned / Total Available Marks × 100 (N/A when the total is 0).
 * Breakdowns use the question versions saved in the attempt; difficulty comes
 * from the question bank and is "unknown" for questions that were later deleted.
 */
export function examBreakdown(attempt: ExaminationAttempt, data: Pick<ApplicationData, "examinationQuestions" | "examinationAttempts">) {
  const difficulty = new Map(data.examinationQuestions.map((question) => [question.id, question.difficulty]));
  const byTopic = new Map<string, Bucket>();
  const byDifficulty = new Map<string, Bucket>();
  const byType = new Map<string, Bucket>();
  const counts = { correct: 0, partial: 0, incorrect: 0, unanswered: 0, manual: 0 };
  for (const result of attempt.questionResults) {
    const snapshot = attempt.questionSnapshots.find((question) => question.questionId === result.questionId);
    if (!snapshot) continue;
    counts[result.status] += 1;
    if (result.status === "manual") continue;
    for (const [map, key] of [[byTopic, snapshot.topicId], [byDifficulty, difficulty.get(snapshot.questionId) ?? "unknown"], [byType, snapshot.questionType]] as const) {
      const current = map.get(key) ?? bucket();
      map.set(key, { ...current, earned: current.earned + result.marksEarned, possible: current.possible + result.maxMarks, count: current.count + 1 });
    }
  }
  const previous = data.examinationAttempts
    .filter((item) => item.blueprintId === attempt.blueprintId && item.id !== attempt.id && item.submittedAt && attempt.submittedAt && item.submittedAt < attempt.submittedAt && item.scorePercent !== null)
    .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)))[0] ?? null;
  const timeTakenSeconds = attempt.submittedAt ? Math.max(0, Math.round((Date.parse(attempt.submittedAt) - Date.parse(attempt.startedAt)) / 1000)) : null;
  const practical = attempt.questionSnapshots.filter((question) => question.questionType === "practical");
  return {
    counts,
    byTopic: finish(byTopic),
    byDifficulty: finish(byDifficulty),
    byType: finish(byType),
    timeTakenSeconds,
    practical: practical.map((question) => {
      const result = attempt.questionResults.find((item) => item.questionId === question.questionId);
      return { questionId: question.questionId, critical: question.critical, status: result?.status ?? "unanswered", marksEarned: result?.marksEarned ?? 0, maxMarks: question.maxMarks };
    }),
    previous: previous ? { attemptId: previous.id, scorePercent: previous.scorePercent, submittedAt: previous.submittedAt } : null,
    improvement: previous && attempt.scorePercent !== null && previous.scorePercent !== null ? attempt.scorePercent - previous.scorePercent : null
  };
}

/** First and best scored attempt per blueprint — reported separately, never mixed. */
export function firstAndBestScores(attempts: ExaminationAttempt[]) {
  const scored = attempts.filter((attempt) => attempt.submittedAt && attempt.scorePercent !== null).sort((a, b) => String(a.submittedAt).localeCompare(String(b.submittedAt)));
  const byBlueprint = new Map<string, { first: number; best: number; latest: number; attempts: number }>();
  for (const attempt of scored) {
    const score = attempt.scorePercent!;
    const current = byBlueprint.get(attempt.blueprintId);
    byBlueprint.set(attempt.blueprintId, current
      ? { first: current.first, best: Math.max(current.best, score), latest: score, attempts: current.attempts + 1 }
      : { first: score, best: score, latest: score, attempts: 1 });
  }
  return byBlueprint;
}

// ---------- Learning gap analysis ----------

export const gapCategories = ["Fundamental knowledge", "Conceptual understanding", "Recall", "Application", "Debugging", "Practical implementation", "Time management"] as const;
export type GapCategory = (typeof gapCategories)[number];

/**
 * Classify an incorrect or incomplete answer. The category describes the kind of
 * skill the question tested; it is labelled a *possible* gap because the cause of an
 * error cannot be known from one answer.
 */
export function classifyGap(input: { questionType: string; difficulty: string | undefined; examType: string; status: string; ranOutOfTime: boolean }): GapCategory {
  if (input.status === "unanswered" && input.ranOutOfTime) return "Time management";
  if (input.questionType === "practical") return "Practical implementation";
  if (["debugging", "code-reading"].includes(input.questionType)) return "Debugging";
  // Delayed-retention and closed-book examinations test unaided recall, so their context comes first.
  if (["retention", "closed-book"].includes(input.examType)) return "Recall";
  if (["calculation", "case-study", "data-interpretation"].includes(input.questionType)) return "Application";
  if (input.status === "unanswered") return "Recall";
  if (input.difficulty === "fundamental") return "Fundamental knowledge";
  return "Conceptual understanding";
}

export function gapAnalysis(data: ApplicationData) {
  const topicById = new Map(data.topics.map((topic) => [topic.id, topic]));
  const questionById = new Map(data.examinationQuestions.map((question) => [question.id, question]));
  const items = data.examinationAttempts.filter((attempt) => attempt.submittedAt).flatMap((attempt) => {
    const ranOutOfTime = Date.parse(attempt.submittedAt!) >= Date.parse(attempt.startedAt) + attempt.timeLimitMinutes * 60_000;
    return attempt.questionResults.filter((result) => ["incorrect", "partial", "unanswered"].includes(result.status)).map((result) => {
      const snapshot = attempt.questionSnapshots.find((question) => question.questionId === result.questionId)!;
      const bankQuestion = questionById.get(result.questionId);
      const topic = topicById.get(snapshot?.topicId ?? "");
      const revision = data.revisionSchedules.find((item) => item.topicId === snapshot?.topicId);
      const category = classifyGap({ questionType: snapshot?.questionType ?? "", difficulty: bankQuestion?.difficulty, examType: attempt.examType, status: result.status, ranOutOfTime });
      return {
        key: `${attempt.id}:${result.questionId}`,
        attemptId: attempt.id,
        examType: attempt.examType,
        submittedAt: attempt.submittedAt!,
        category,
        status: result.status,
        testedConcept: bankQuestion?.objective || topic?.title || "Not recorded",
        prompt: snapshot?.prompt ?? "",
        submittedAnswer: result.answer,
        expectedAnswer: snapshot?.correctAnswer === null || snapshot?.correctAnswer === undefined ? "See the rubric" : Array.isArray(snapshot.correctAnswer) ? snapshot.correctAnswer.join(", ") : String(snapshot.correctAnswer),
        why: result.status === "unanswered" ? (ranOutOfTime ? "No answer was recorded before the time limit." : "No answer was recorded.") : result.feedback || snapshot?.explanation || "",
        possibleMisconceptions: bankQuestion?.misconceptions ?? [],
        topicId: snapshot?.topicId ?? null,
        topicTitle: topic?.title ?? null,
        prerequisitesToReview: (topic?.prerequisites ?? []).map((id) => topicById.get(id)?.title ?? id),
        recommendedExercise: topic?.practicalExercise || null,
        suggestedRevisionDate: revision?.dueAt ?? new Date(Date.parse(attempt.submittedAt!) + dayMs).toISOString()
      };
    });
  });
  const byCategory = gapCategories.map((category) => ({ category, count: items.filter((item) => item.category === category).length }));
  return { items: items.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)), byCategory };
}

// ---------- Discipline and consistency ----------

/**
 * Consistency score (last `days` days):
 *   planned study days = days whose weekday is in Settings → study days, minus days marked as rest days in the planner
 *   consistency = planned study days with at least one completed session ÷ planned study days × 100
 * Rest days and non-study days are excluded, so breaks, illness, and planned time off never lower the score.
 * Returns null when no study days are planned in the window.
 */
export function consistency(data: ApplicationData, now = new Date(), days = 28) {
  const timezone = typeof data.settings.timezone === "string" ? data.settings.timezone : "UTC";
  const studyDays = Array.isArray(data.settings.studyDays) && data.settings.studyDays.length ? data.settings.studyDays as string[] : weekdays;
  const restDays = new Set(data.studyPlans.filter((plan) => plan.restDay).map((plan) => plan.date));
  const studied = new Set(data.learningSessions.filter((session) => session.state === "completed").map((session) => dateKey(session.endedAt ?? session.startedAt, timezone)));
  const today = dateKey(now, timezone);
  let planned = 0;
  let met = 0;
  for (let offset = 0; offset < days; offset += 1) {
    const key = addDays(today, -offset);
    if (!studyDays.includes(weekdayOf(key)) || restDays.has(key)) continue;
    planned += 1;
    if (studied.has(key)) met += 1;
  }
  // Flexible streak: consecutive planned study days with a session, skipping rest and non-study days.
  // Today does not break the streak if it has not ended yet.
  let streak = 0;
  for (let offset = 0; offset < 400; offset += 1) {
    const key = addDays(today, -offset);
    if (!studyDays.includes(weekdayOf(key)) || restDays.has(key)) continue;
    if (studied.has(key)) streak += 1;
    else if (offset === 0) continue;
    else break;
  }
  return { windowDays: days, plannedDays: planned, daysWithStudy: met, score: planned ? met / planned * 100 : null, flexibleStreak: streak };
}

// ---------- Rewards ----------

/**
 * XP = sum of points from recorded reward events (each event counts once).
 * Level = floor(XP ÷ 100) + 1.
 */
export function rewardSummary(data: ApplicationData, now = new Date()) {
  const xp = data.rewards.reduce((total, reward) => total + reward.points, 0);
  const level = Math.floor(xp / 100) + 1;
  const timezone = typeof data.settings.timezone === "string" ? data.settings.timezone : "UTC";
  const today = dateKey(now, timezone);
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const weekStart = addDays(today, -((weekday + 6) % 7));
  const inWeek = (value: string | null) => Boolean(value) && dateKey(value!, timezone) >= weekStart && dateKey(value!, timezone) <= today;
  const monthKey = today.slice(0, 7);
  const challenges = [
    { id: "weekly-sessions", title: "Complete 3 focused study sessions this week", target: 3, progress: data.learningSessions.filter((session) => session.state === "completed" && inWeek(session.endedAt)).length },
    { id: "weekly-practice", title: "Attempt 5 practice problems or games this week", target: 5, progress: data.practiceAttempts.filter((attempt) => attempt.kind !== "lesson-quiz" && inWeek(attempt.attemptedAt)).length },
    { id: "weekly-retention", title: "Review flashcards on 3 different days this week", target: 3, progress: new Set(data.flashcards.flatMap((card) => card.reviews.filter((review) => inWeek(review.reviewedAt)).map((review) => dateKey(review.reviewedAt, timezone)))).size }
  ].map((challenge) => ({ ...challenge, complete: challenge.progress >= challenge.target }));
  const monthlyGoals = data.goals.filter((goal) => goal.targetDate?.startsWith(monthKey));
  return {
    xp, level, toNextLevel: level * 100 - xp, challenges,
    monthlyGoals: { total: monthlyGoals.length, completed: monthlyGoals.filter((goal) => goal.completed).length },
    projectMilestones: data.projects.reduce((total, project) => total + project.tasks.filter((task) => task.completed).length, 0)
  };
}

// ---------- Dashboard series ----------

const levelValue: Record<string, number> = { "Not Assessed": 0, "Needs Practice": 1, Developing: 2, Competent: 3, Proficient: 4, Mastered: 5 };

export function dashboardSeries(data: ApplicationData, now = new Date()) {
  const timezone = typeof data.settings.timezone === "string" ? data.settings.timezone : "UTC";
  const completed = data.learningSessions.filter((session) => session.state === "completed");
  const today = dateKey(now, timezone);
  const daily = Array.from({ length: 30 }, (_, index) => {
    const key = addDays(today, index - 29);
    const sessions = completed.filter((session) => dateKey(session.startedAt, timezone) === key);
    return {
      date: key,
      focusedMinutes: Math.round(sessions.reduce((total, session) => total + session.focusedSeconds, 0) / 60),
      plannedMinutes: Math.round(sessions.reduce((total, session) => total + session.plannedSeconds, 0) / 60),
      plannedSchedule: data.studyPlans.filter((plan) => plan.date === key && !plan.restDay).reduce((total, plan) => total + plan.plannedMinutes, 0)
    };
  });
  const weekly = Array.from({ length: 12 }, (_, index) => {
    const end = addDays(today, -7 * (11 - index));
    const start = addDays(end, -6);
    const sessions = completed.filter((session) => { const key = dateKey(session.startedAt, timezone); return key >= start && key <= end; });
    return { week: start, focusedHours: Math.round(sessions.reduce((total, session) => total + session.focusedSeconds, 0) / 360) / 10, studyDays: new Set(sessions.map((session) => dateKey(session.startedAt, timezone))).size };
  });
  const scores = data.examinationAttempts.filter((attempt) => attempt.submittedAt && attempt.scorePercent !== null)
    .sort((a, b) => String(a.submittedAt).localeCompare(String(b.submittedAt)))
    .map((attempt) => ({ date: attempt.submittedAt!.slice(0, 10), score: Math.round(attempt.scorePercent! * 10) / 10, examType: attempt.examType }));
  const retention = scores.filter((item) => item.examType === "retention");
  const subjects = [...new Set(data.topics.map((topic) => topic.subject))];
  const proficiency = subjects.map((subject) => {
    const topics = data.topics.filter((topic) => topic.subject === subject);
    const levels = topics.map((topic) => levelValue[competencyReadiness(data, topic.id).level] ?? 0);
    return { subject, averageLevel: Math.round(levels.reduce((a, b) => a + b, 0) / Math.max(1, levels.length) * 10) / 10, assessedTopics: levels.filter((value) => value > 0).length, topics: topics.length };
  }).sort((a, b) => b.averageLevel - a.averageLevel);
  const completion = data.roadmapPhases.map((phase) => {
    const topics = data.topics.filter((topic) => topic.phaseId === phase.id);
    return { phase: `P${phase.order}`, title: phase.title, completed: topics.filter((topic) => topic.status === "completed").length, inProgress: topics.filter((topic) => topic.status === "in-progress").length, remaining: topics.filter((topic) => !["completed", "in-progress"].includes(topic.status)).length };
  });
  const projects = (["planned", "in-progress", "completed", "blocked"] as const).map((status) => ({ status, count: data.projects.filter((project) => project.status === status).length }));
  return { daily, weekly, scores, retention, proficiency, completion, projects, subjects };
}
