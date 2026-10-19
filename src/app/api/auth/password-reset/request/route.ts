import { NextResponse } from "next/server";
import { readJsonObject, requestContext, withPublic } from "@/lib/auth/http";
import { requestPasswordReset } from "@/lib/auth/service";

export const POST = withPublic(async (request) => {
  const body = await readJsonObject(request);
  const { deliveryAvailable } = await requestPasswordReset({ email: body.email }, requestContext(request));
  return NextResponse.json({
    deliveryAvailable,
    message: deliveryAvailable
      ? "If an account uses that email, a reset link has been sent. It expires in 1 hour."
      : "Email delivery is not configured on this server. Ask the administrator to generate a reset link."
  });
});
