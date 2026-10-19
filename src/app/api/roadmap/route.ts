import { NextResponse } from "next/server";
import { readJsonObject, withUser } from "@/lib/auth/http";
import { movePhase, moveTopic, setTopicPriority } from "@/lib/services/roadmap";
import { updateUserData } from "@/lib/storage/user-store";

/** Reorder and reprioritize the caller's own roadmap. */
export const POST = withUser(async ({ request, user }) => {
  const body = await readJsonObject(request);
  const id = typeof body.id === "string" ? body.id : "";
  await updateUserData(user.id, (data) => {
    switch (body.action) {
      case "move-phase": return { data: movePhase(data, id, body.direction), result: null };
      case "move-topic": return { data: moveTopic(data, id, body.direction), result: null };
      case "set-priority": return { data: setTopicPriority(data, id, body.priority), result: null };
      default: throw new Error("Unknown roadmap action.");
    }
  });
  return NextResponse.json({ ok: true });
});
