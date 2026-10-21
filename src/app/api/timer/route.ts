import { NextResponse } from "next/server";
import { updateUserData } from "@/lib/storage/user-store";
import { withUser } from "@/lib/auth/http";
import { StorageError } from "@/lib/storage/file-store";
import { createSession, transitionSession, type TimerAction } from "@/lib/services/timer";
import { recordRewardEvent } from "@/lib/services/rewards";

const actions = ["pause", "resume", "break", "resume-break", "finish", "cancel", "recover"] as const;

export const POST = withUser(async ({ request, user }) => {
  try {
    const payload = await request.json() as Record<string, unknown>;
    if (payload.action === "start") {
      const topicId = typeof payload.topicId === "string" ? payload.topicId : "";
      const plannedSeconds = typeof payload.plannedSeconds === "number" ? payload.plannedSeconds : 0;
      const activityType = typeof payload.activityType === "string" ? payload.activityType : "learning";
      const session = await updateUserData(user.id, (data) => {
        const created = createSession(data, topicId, plannedSeconds, undefined, activityType);
        return {
          data: { ...data, learningSessions: [...data.learningSessions, created] },
          result: created
        };
      });
      return NextResponse.json(session, { status: 201 });
    }

    if (!actions.includes(payload.action as (typeof actions)[number]) || typeof payload.sessionId !== "string") {
      return NextResponse.json({ error: "A valid timer action and session id are required." }, { status: 400 });
    }
    const updated = await updateUserData(user.id, (data) => {
      const index = data.learningSessions.findIndex(({ id }) => id === payload.sessionId);
      if (index < 0) throw new Error("Session was not found.");
      const session = transitionSession(data.learningSessions[index], payload.action as TimerAction);
      const learningSessions = [...data.learningSessions];
      learningSessions[index] = session;
      const eventId = `session-completed-${session.id}`;
      const award = session.state === "completed"
        ? recordRewardEvent(data, {
          eventId,
          title: "Focused session completed",
          earnedAt: session.endedAt ?? new Date().toISOString(),
          reason: `Completed a learning timer session on ${session.topicId}.`,
          points: 2,
          achievement: { id: "achievement-first-session", title: "First focused session" }
        })
        : { rewards: data.rewards, achievements: data.achievements };
      return { data: { ...data, learningSessions, ...award }, result: session };
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof StorageError) throw error;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Timer action failed." },
      { status: 400 }
    );
  }
});
