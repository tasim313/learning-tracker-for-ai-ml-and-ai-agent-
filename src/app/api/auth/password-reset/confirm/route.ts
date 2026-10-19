import { NextResponse } from "next/server";
import { clearSessionCookie, readJsonObject, withPublic } from "@/lib/auth/http";
import { resetPassword } from "@/lib/auth/service";

export const POST = withPublic(async (request) => {
  const body = await readJsonObject(request);
  await resetPassword({ token: body.token, password: body.password });
  return clearSessionCookie(NextResponse.json({ reset: true }));
});
