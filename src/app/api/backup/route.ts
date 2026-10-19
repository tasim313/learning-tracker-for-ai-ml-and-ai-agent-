import { NextResponse } from "next/server";
import { createAutomaticBackup, exportApplicationData, restoreApplicationData } from "@/lib/storage/json-store";

export async function GET() {
  try {
    const data = await exportApplicationData();
    if (data.examinationAttempts.some((attempt) => attempt.submittedAt === null && attempt.selfDeclaredClosedBook)) {
      return NextResponse.json({ error: "Backup export is unavailable during a self-declared closed-book examination." }, { status: 423 });
    }
    return new Response(`${JSON.stringify(data, null, 2)}\n`, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="learning-tracker-backup-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("Unable to export backup.", error);
    return NextResponse.json({ error: "Backup export failed." }, { status: 500 });
  }
}

export async function POST() {
  try {
    await createAutomaticBackup();
    return NextResponse.json({ created: true });
  } catch (error) {
    console.error("Unable to create snapshot.", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Snapshot could not be created." }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const { loadApplicationData } = await import("@/lib/storage/json-store");
    const current = await loadApplicationData();
    if (current.examinationAttempts.some((attempt) => attempt.submittedAt === null && attempt.selfDeclaredClosedBook)) {
      return NextResponse.json({ error: "Backup restore is unavailable during a self-declared closed-book examination." }, { status: 423 });
    }
    const payload = await request.json() as Record<string, unknown>;
    if (payload.confirm !== true) {
      return NextResponse.json({ error: "Explicit confirmation is required before replacing application data." }, { status: 400 });
    }
    const restored = await restoreApplicationData(payload.data);
    return NextResponse.json({ restored: true, schemaVersion: restored.schemaVersion });
  } catch (error) {
    console.error("Unable to restore backup.", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Backup validation failed; existing data was not replaced." }, { status: 400 });
  }
}
