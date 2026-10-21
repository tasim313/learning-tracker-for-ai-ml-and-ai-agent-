import { NextResponse } from "next/server";
import { readJsonObject, withUser } from "@/lib/auth/http";
import { recordHeartbeat } from "@/lib/auth/service";

export const POST = withUser(async ({ request, session }) => {
  const body = await readJsonObject(request);
  const result = await recordHeartbeat(session.id, {
    eventId: body.eventId,
    learningActive: body.learningActive,
    activity: body.activity
  });
  return NextResponse.json(result);
});
