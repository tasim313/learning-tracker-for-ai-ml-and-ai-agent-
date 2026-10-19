import { NextResponse } from "next/server";
import { withUser } from "@/lib/auth/http";
import { listSessions, revokeSession } from "@/lib/auth/service";

export const GET = withUser(async ({ user, session }) => {
  const sessions = await listSessions(user.id);
  return NextResponse.json(sessions.map((item) => ({ ...item, current: item.id === session.id })));
});

export const DELETE = withUser(async ({ request, user }) => {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) throw new Error("Session id is required.");
  await revokeSession(user.id, id);
  return NextResponse.json({ revoked: true });
});
