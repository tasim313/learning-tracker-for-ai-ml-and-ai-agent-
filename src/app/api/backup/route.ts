import { NextResponse } from "next/server";
import { jsonError, readJsonObject, withUser } from "@/lib/auth/http";
import type { ApplicationData } from "@/lib/model";
import {
  createUserSnapshot, exportUserData, listUserSnapshots, loadUserData, restoreUserData, restoreUserSnapshot
} from "@/lib/storage/user-store";

function closedBookActive(data: ApplicationData) {
  return data.examinationAttempts.some((attempt) => attempt.submittedAt === null && attempt.selfDeclaredClosedBook);
}

/** GET            → download the caller's complete data export (JSON).
 *  GET ?list=1    → list the caller's automatic snapshots. */
export const GET = withUser(async ({ request, user }) => {
  if (new URL(request.url).searchParams.get("list") === "1") {
    return NextResponse.json(await listUserSnapshots(user.id));
  }
  const exported = await exportUserData(user.id);
  if (closedBookActive(exported.data)) return jsonError("Backup export is unavailable during a self-declared closed-book examination.", 423);
  return new Response(`${JSON.stringify(exported, null, 2)}\n`, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="learning-tracker-export-${new Date().toISOString().slice(0, 10)}.json"`
    }
  });
});

/** Create a manual snapshot of the caller's data. */
export const POST = withUser(async ({ user }) => {
  const name = await createUserSnapshot(user.id);
  return NextResponse.json({ created: true, name }, { status: 201 });
});

/**
 * Restore from an uploaded export ({ confirm: true, data }) or one of the caller's
 * snapshots ({ confirm: true, snapshot }). Backups belonging to another account are rejected.
 */
export const PUT = withUser(async ({ request, user }) => {
  const current = await loadUserData(user.id);
  if (closedBookActive(current)) return jsonError("Backup restore is unavailable during a self-declared closed-book examination.", 423);
  const payload = await readJsonObject(request);
  if (payload.confirm !== true) return jsonError("Explicit confirmation is required before replacing your data.");
  const restored = typeof payload.snapshot === "string"
    ? await restoreUserSnapshot(user.id, payload.snapshot)
    : await restoreUserData(user.id, payload.data);
  return NextResponse.json({ restored: true, schemaVersion: restored.schemaVersion });
});
