import { NextResponse } from "next/server";
import { requestContext, withUser } from "@/lib/auth/http";
import { resendVerification } from "@/lib/auth/service";

export const POST = withUser(async ({ request, user }) => {
  const sent = await resendVerification(user.id, requestContext(request));
  return NextResponse.json({ sent });
});
