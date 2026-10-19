import type { ApplicationData, LearningSession } from "@/lib/model";

export function secondsBetween(start: string, end: string): number {
  const elapsed = Date.parse(end) - Date.parse(start);
  return Number.isFinite(elapsed) && elapsed > 0 ? Math.floor(elapsed / 1000) : 0;
}

export function elapsedSessionSeconds(session: LearningSession, now = new Date().toISOString()) {
  const activeSeconds = session.state === "running" && session.stateChangedAt
    ? secondsBetween(session.stateChangedAt, now)
    : 0;
  const currentBreak = session.state === "break" && session.stateChangedAt
    ? secondsBetween(session.stateChangedAt, now)
    : 0;
  const currentPause = session.state === "paused" && session.stateChangedAt
    ? secondsBetween(session.stateChangedAt, now)
    : 0;
  return {
    focusedSeconds: session.focusedSeconds + activeSeconds,
    pausedSeconds: session.pausedSeconds + currentPause,
    breakSeconds: session.breakSeconds + currentBreak
  };
}

export function timeEstimationAccuracy(estimated: number | null | undefined, actual: number | null | undefined): number | null {
  if (estimated === null || estimated === undefined || estimated <= 0 || actual === null || actual === undefined || actual < 0) {
    return null;
  }
  return Math.max(0, Math.min(100, 100 * (1 - Math.abs(actual - estimated) / estimated)));
}

function dateKey(value: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function focusedMinutesByDay(data: ApplicationData, days = 14, now = new Date(), timezone = "UTC") {
  const [year, month, day] = dateKey(now, timezone).split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));
  start.setUTCDate(start.getUTCDate() - Math.max(0, days - 1));
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    const minutes = data.learningSessions
      .filter((session) => session.state === "completed" && dateKey(new Date(session.startedAt), timezone) === key)
      .reduce((total, session) => total + session.focusedSeconds, 0) / 60;
    return { date: key, minutes: Math.round(minutes) };
  });
}

export function studyTimeByDay(data: ApplicationData, days = 14, now = new Date(), timezone = "UTC") {
  const dates = focusedMinutesByDay(data, days, now, timezone).map(({ date }) => date);
  return dates.map((date) => {
    const sessions = data.learningSessions.filter((session) =>
      session.state === "completed" && dateKey(new Date(session.startedAt), timezone) === date
    );
    return {
      date,
      plannedMinutes: Math.round(sessions.reduce((total, session) => total + session.plannedSeconds, 0) / 60),
      focusedMinutes: Math.round(sessions.reduce((total, session) => total + session.focusedSeconds, 0) / 60)
    };
  });
}

export function completionStreak(data: ApplicationData, now = new Date(), timezone = "UTC"): number {
  const studyDates = new Set(data.learningSessions
    .filter((session) => session.state === "completed")
    .map((session) => session.endedAt ? dateKey(new Date(session.endedAt), timezone) : null)
    .filter((date): date is string => Boolean(date)));
  const [year, month, day] = dateKey(now, timezone).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  let streak = 0;
  while (studyDates.has(date.toISOString().slice(0, 10))) {
    streak += 1;
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return streak;
}
