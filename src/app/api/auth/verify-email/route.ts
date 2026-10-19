import { NextResponse } from "next/server";
import { readJsonObject, withPublic } from "@/lib/auth/http";
import { verifyEmail } from "@/lib/auth/service";

export const POST = withPublic(async (request) => {
  const body = await readJsonObject(request);
  await verifyEmail({ token: body.token });
  return NextResponse.json({ verified: true });
});
