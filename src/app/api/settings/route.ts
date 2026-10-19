import { NextResponse } from "next/server";
import { loadUserData, updateUserData } from "@/lib/storage/user-store";
import { withUser } from "@/lib/auth/http";
import { StorageError } from "@/lib/storage/file-store";

const allowedDays = new Set(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);

export const GET = withUser(async ({ user }) => {
  try {
    const data = await loadUserData(user.id);
    return NextResponse.json(data.settings, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof StorageError) throw error;
    console.error("Unable to read settings.", error);
    return NextResponse.json({ error: "Saved settings are unavailable." }, { status: 500 });
  }
});

export const PATCH = withUser(async ({ request, user }) => {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const timezone = typeof payload.timezone === "string" ? payload.timezone : "";
    const weeklyHours = payload.weeklyHours;
    const studyDays = payload.studyDays;
    const thresholds = {
      topicPassingPercent: payload.topicPassingPercent,
      practicalPassingPercent: payload.practicalPassingPercent,
      retentionPassingPercent: payload.retentionPassingPercent
    };
    if (!timezone || typeof weeklyHours !== "number" || !Number.isFinite(weeklyHours) || weeklyHours < 0 || weeklyHours > 168) {
      return NextResponse.json({ error: "Provide a valid timezone and a weekly target from 0 to 168 hours." }, { status: 400 });
    }
    if (!Array.isArray(studyDays) || studyDays.some((day) => typeof day !== "string" || !allowedDays.has(day))) {
      return NextResponse.json({ error: "Study days must use full weekday names." }, { status: 400 });
    }
    if (Object.values(thresholds).some((value) => value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100))) {
      return NextResponse.json({ error: "Competency thresholds must be percentages from 0 to 100." }, { status: 400 });
    }
    try {
      new Intl.DateTimeFormat("en", { timeZone: timezone });
    } catch {
      return NextResponse.json({ error: "Timezone must be a valid IANA timezone." }, { status: 400 });
    }
    const settings = await updateUserData(user.id, (data) => {
      const next = {
        timezone,
        weeklyHours,
        studyDays: [...new Set(studyDays)],
        topicPassingPercent: thresholds.topicPassingPercent ?? data.settings.topicPassingPercent ?? 80,
        practicalPassingPercent: thresholds.practicalPassingPercent ?? data.settings.practicalPassingPercent ?? 80,
        retentionPassingPercent: thresholds.retentionPassingPercent ?? data.settings.retentionPassingPercent ?? 70
      };
      return { data: { ...data, settings: { ...data.settings, ...next } }, result: next };
    });
    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof StorageError) throw error;
    console.error("Unable to save settings.", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Settings were not saved." }, { status: 400 });
  }
});
