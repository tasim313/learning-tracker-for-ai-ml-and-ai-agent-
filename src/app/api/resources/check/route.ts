import { NextResponse } from "next/server";
import { jsonError, readJsonObject, withUser } from "@/lib/auth/http";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { checkAvailability } from "@/lib/net/url-guard";
import { loadUserData, updateUserData } from "@/lib/storage/user-store";

/** Check whether one of the caller's resource links is reachable and record the result with a timestamp. */
export const POST = withUser(async ({ request, user }) => {
  const body = await readJsonObject(request);
  if (typeof body.id !== "string") return jsonError("Resource id is required.");
  consumeRateLimit(`link-check:${user.id}`, { limit: 30, windowMs: 10 * 60_000 });
  const resource = (await loadUserData(user.id)).resources.find((item) => item.id === body.id);
  if (!resource) return jsonError("Resource was not found.", 404);
  const result = await checkAvailability(resource.url);
  await updateUserData(user.id, (data) => ({
    data: { ...data, resources: data.resources.map((item) => item.id === resource.id ? { ...item, availability: result.availability, lastCheckedAt: result.checkedAt, checkStatusCode: result.statusCode } : item) },
    result: null
  }));
  return NextResponse.json(result);
});
