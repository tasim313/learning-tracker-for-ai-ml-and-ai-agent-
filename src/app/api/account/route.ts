import { NextResponse } from "next/server";
import { clearSessionCookie, readJsonObject, withUser } from "@/lib/auth/http";
import { deleteAccount, updateProfile } from "@/lib/auth/service";
import { emailDeliveryAvailable } from "@/lib/email/mailer";

export const GET = withUser(async ({ user }) => NextResponse.json({ user, emailDeliveryAvailable: emailDeliveryAvailable() }));

export const PATCH = withUser(async ({ request, user }) => {
  const body = await readJsonObject(request);
  return NextResponse.json({ user: await updateProfile(user.id, body) });
});

export const DELETE = withUser(async ({ request, user }) => {
  const body = await readJsonObject(request);
  await deleteAccount(user.id, { password: body.password, confirmation: body.confirmation });
  return clearSessionCookie(NextResponse.json({ deleted: true }));
});
