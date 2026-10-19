import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { jsonError, readJsonObject, withUser } from "@/lib/auth/http";
import { listPublishedCourses } from "@/lib/content/store";
import { buildRecommendations } from "@/lib/services/recommendations";
import { loadUserData, updateUserData } from "@/lib/storage/user-store";

export const GET = withUser(async ({ user }) => {
  const [data, courses] = await Promise.all([loadUserData(user.id), listPublishedCourses()]);
  return NextResponse.json(buildRecommendations({ data, courses }));
});

/** Learner override: pin, dismiss, snooze (with a date), or clear. */
export const POST = withUser(async ({ request, user }) => {
  const body = await readJsonObject(request);
  const key = typeof body.key === "string" ? body.key.slice(0, 200) : "";
  if (!key) return jsonError("Recommendation key is required.");
  const action = body.action;
  if (!["pinned", "dismissed", "snoozed", "clear"].includes(String(action))) return jsonError("Action must be pinned, dismissed, snoozed, or clear.");
  let until: string | null = null;
  if (action === "snoozed") {
    const days = Number(body.days ?? 7);
    if (!Number.isInteger(days) || days < 1 || days > 90) return jsonError("Snooze for 1 to 90 days.");
    until = new Date(Date.now() + days * 86_400_000).toISOString();
  }
  await updateUserData(user.id, (data) => {
    const others = data.recommendationOverrides.filter((item) => item.recommendationKey !== key);
    const next = action === "clear" ? others : [...others, { id: randomUUID(), recommendationKey: key, action: action as "pinned" | "dismissed" | "snoozed", until, reason: typeof body.reason === "string" ? body.reason.slice(0, 1000) : "", createdAt: new Date().toISOString() }];
    return { data: { ...data, recommendationOverrides: next }, result: null };
  });
  return NextResponse.json({ ok: true });
});
