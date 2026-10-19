import { NextResponse } from "next/server";
import { readJsonObject, requestContext, setSessionCookie, withPublic } from "@/lib/auth/http";
import { login } from "@/lib/auth/service";

export const POST = withPublic(async (request) => {
  const body = await readJsonObject(request);
  const result = await login({ email: body.email, password: body.password }, requestContext(request));
  return setSessionCookie(NextResponse.json({ user: result.user }), result.session.token, result.session.expiresAt);
});
