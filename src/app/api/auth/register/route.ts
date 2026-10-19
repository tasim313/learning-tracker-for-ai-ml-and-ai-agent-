import { NextResponse } from "next/server";
import { readJsonObject, requestContext, setSessionCookie, withPublic } from "@/lib/auth/http";
import { register } from "@/lib/auth/service";

export const POST = withPublic(async (request) => {
  const body = await readJsonObject(request);
  const result = await register({ email: body.email, password: body.password, displayName: body.displayName }, requestContext(request));
  const response = NextResponse.json({ user: result.user, verificationSent: result.verificationSent }, { status: 201 });
  return setSessionCookie(response, result.session.token, result.session.expiresAt);
});
