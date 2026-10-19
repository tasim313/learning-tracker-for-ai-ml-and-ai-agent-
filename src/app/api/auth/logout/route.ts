import { NextResponse } from "next/server";
import { clearSessionCookie, sessionTokenFrom, withPublic } from "@/lib/auth/http";
import { logout } from "@/lib/auth/service";

export const POST = withPublic(async (request) => {
  await logout(sessionTokenFrom(request));
  return clearSessionCookie(NextResponse.json({ signedOut: true }));
});
