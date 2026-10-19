import { NextResponse } from "next/server";
import { readJsonObject, withUser } from "@/lib/auth/http";
import { listAccountsForAdmin, setAccountRole } from "@/lib/auth/service";

export const GET = withUser(async () => NextResponse.json(await listAccountsForAdmin()), { role: "admin" });

export const PATCH = withUser(async ({ request, user }) => {
  const body = await readJsonObject(request);
  if (typeof body.userId !== "string") throw new Error("Account id is required.");
  await setAccountRole(user, body.userId, body.role);
  return NextResponse.json({ updated: true });
}, { role: "admin" });
