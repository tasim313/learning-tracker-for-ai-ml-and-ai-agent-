import { NextResponse } from "next/server";
import { jsonError, readJsonObject, withUser } from "@/lib/auth/http";
import { loadUserData, updateUserData } from "@/lib/storage/user-store";

const progressKey = "visualLearningProgress";

export const GET = withUser(async ({ user }) => {
  const data = await loadUserData(user.id);
  const value = data.settings[progressKey];
  return NextResponse.json({ progress: typeof value === "object" && value !== null && !Array.isArray(value) ? value : {} });
});

export const POST = withUser(async ({ request, user }) => {
  const body = await readJsonObject(request);
  if (typeof body.visualId !== "string" || !/^[a-z0-9-]{1,80}$/.test(body.visualId)) return jsonError("A valid visualization id is required.");
  if (typeof body.step !== "number" || !Number.isInteger(body.step) || body.step < 0 || body.step > 1000) return jsonError("Step must be a whole number from 0 to 1000.");
  const completed = body.completed === true;
  const step = body.step as number;
  if (body.assessment !== undefined && body.assessment !== "correct" && body.assessment !== "incorrect") return jsonError("Assessment result must be correct or incorrect.");
  await updateUserData(user.id, (data) => {
    const stored = data.settings[progressKey];
    const progress = typeof stored === "object" && stored !== null && !Array.isArray(stored) ? stored as Record<string, unknown> : {};
    const old = typeof progress[body.visualId as string] === "object" && progress[body.visualId as string] !== null ? progress[body.visualId as string] as Record<string, unknown> : {};
    const oldCount = Number(old.interactions ?? 0);
    const interactions = Number.isFinite(oldCount) ? Math.min(1_000_000, Math.max(0, oldCount) + 1) : 1;
    const now = new Date();
    const updatedAt = now.toISOString();
    const oldTimestamp = typeof old.updatedAt === "string" ? Date.parse(old.updatedAt) : Number.NaN;
    const elapsed = Number.isFinite(oldTimestamp) ? Math.max(0, Math.min(300, Math.floor((now.getTime() - oldTimestamp) / 1000))) : 0;
    const history = Array.isArray(old.history) ? old.history.filter((value): value is number => typeof value === "number" && Number.isInteger(value)).slice(-499) : [];
    if (history.at(-1) !== step) history.push(step);
    const previousSteps = Array.isArray(old.stepsVisited) ? old.stepsVisited.filter((value): value is number => typeof value === "number" && Number.isInteger(value)) : [];
    const stepsVisited = [...new Set([...previousSteps, step])].slice(-1000);
    const assessments = Array.isArray(old.assessments) ? old.assessments.slice(-49) : [];
    if (body.assessment) assessments.push({ result: body.assessment, at: updatedAt });
    const firstVisitedAt = typeof old.firstVisitedAt === "string" ? old.firstVisitedAt : updatedAt;
    const previousTime = typeof old.timeSpentSeconds === "number" && Number.isFinite(old.timeSpentSeconds) ? old.timeSpentSeconds : 0;
    const record = { step, lastVisitedPosition: step, completed, interactions, history, stepsVisited, assessments, firstVisitedAt, updatedAt, timeSpentSeconds: Math.min(100_000_000, previousTime + elapsed) };
    return { data: { ...data, settings: { ...data.settings, [progressKey]: { ...progress, [body.visualId as string]: record } } }, result: null };
  });
  return NextResponse.json({ saved: true });
});
