import { randomUUID } from "node:crypto";
import type { ApplicationData, LearningSession } from "@/lib/model";
import { elapsedSessionSeconds, secondsBetween } from "@/lib/calculations/time";

export type TimerAction = "pause" | "resume" | "break" | "resume-break" | "finish" | "cancel" | "recover";

export function createSession(
  data: ApplicationData,
  topicId: string,
  plannedSeconds: number,
  now = new Date().toISOString()
): LearningSession {
  if (!data.topics.some((topic) => topic.id === topicId)) throw new Error("Select a valid learning topic.");
  if (!Number.isInteger(plannedSeconds) || plannedSeconds < 0 || plannedSeconds > 86400) {
    throw new Error("Planned duration must be between 0 and 24 hours.");
  }
  if (data.learningSessions.some((session) => ["running", "paused", "break"].includes(session.state))) {
    throw new Error("Finish or cancel the active session before starting another.");
  }
  return {
    id: randomUUID(),
    topicId,
    plannedStartAt: null,
    startedAt: now,
    endedAt: null,
    stateChangedAt: now,
    state: "running",
    focusedSeconds: 0,
    pausedSeconds: 0,
    breakSeconds: 0,
    plannedSeconds,
    notes: "",
    accomplishments: "",
    problems: "",
    distractions: "",
    manualAdjustmentNote: "",
    rating: null,
    manuallyAdjusted: false
  };
}

export function transitionSession(session: LearningSession, action: TimerAction, now = new Date().toISOString()): LearningSession {
  const next = { ...session };
  const currentState = session.state;
  const elapsed = session.stateChangedAt ? secondsBetween(session.stateChangedAt, now) : 0;
  if (currentState === "completed" || currentState === "cancelled") {
    throw new Error("This session has already ended.");
  }
  if (action === "pause" && currentState !== "running") throw new Error("Only a running session can be paused.");
  if (action === "break" && currentState !== "running") throw new Error("Only a running session can enter a break.");
  if (action === "resume" && currentState !== "paused") throw new Error("Only a paused session can resume.");
  if (action === "resume-break" && currentState !== "break") throw new Error("The session is not on a break.");
  if ((currentState === "running") && ["pause", "break", "finish", "cancel"].includes(action)) next.focusedSeconds += elapsed;
  if ((currentState === "paused") && ["resume", "finish", "cancel"].includes(action)) next.pausedSeconds += elapsed;
  if ((currentState === "break") && ["resume-break", "finish", "cancel"].includes(action)) next.breakSeconds += elapsed;
  if (action === "recover") {
    if (currentState === "running") next.focusedSeconds += elapsed;
    if (currentState === "paused") next.pausedSeconds += elapsed;
    if (currentState === "break") next.breakSeconds += elapsed;
    next.state = "paused";
    next.stateChangedAt = now;
    return next;
  }

  if (action === "pause") next.state = "paused";
  if (action === "resume") next.state = "running";
  if (action === "break") next.state = "break";
  if (action === "resume-break") next.state = "running";
  if (action === "finish") {
    next.state = "completed";
    next.endedAt = now;
  }
  if (action === "cancel") {
    next.state = "cancelled";
    next.endedAt = now;
  }
  next.stateChangedAt = ["completed", "cancelled"].includes(next.state) ? null : now;
  return next;
}

export function currentSessionTime(session: LearningSession, now = new Date().toISOString()) {
  return elapsedSessionSeconds(session, now);
}
