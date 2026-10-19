import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { sessionCookieName } from "@/lib/auth/cookies";
import { validateSessionToken, type ValidatedSession } from "@/lib/auth/service";

/** Session lookup for Server Components, de-duplicated per request. */
export const getCurrentSession = cache(async (): Promise<ValidatedSession | null> => {
  const store = await cookies();
  return validateSessionToken(store.get(sessionCookieName())?.value);
});

export async function requireUser(): Promise<ValidatedSession> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin(): Promise<ValidatedSession> {
  const session = await requireUser();
  if (session.user.role !== "admin") notFound();
  return session;
}
