import { NextResponse } from "next/server";
import { readJsonObject, withUser } from "@/lib/auth/http";
import { changePassword } from "@/lib/auth/service";

export const POST = withUser(async ({ request, user, session }) => {
  const body = await readJsonObject(request);
  await changePassword(user.id, session.id, { currentPassword: body.currentPassword, newPassword: body.newPassword });
  return NextResponse.json({ changed: true, otherSessionsRevoked: true });
});
