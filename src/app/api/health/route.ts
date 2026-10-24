import { NextResponse } from "next/server";
import { readJsonFile, resolveDataPath, writeJsonAtomic } from "@/lib/storage/file-store";
import { isMongoConfigured, checkMongoHealth } from "@/lib/storage/mongodb";

export const dynamic = "force-dynamic";

/** Liveness plus a real write/read on the data disk or MongoDB ping. Reveals no paths or data. */
export async function GET() {
  try {
    if (isMongoConfigured()) {
      await checkMongoHealth();
      return NextResponse.json({ status: "ok", storage: "mongodb" }, { headers: { "Cache-Control": "no-store" } });
    }
    const probe = resolveDataPath("system", "health-probe.json");
    const stamp = new Date().toISOString();
    await writeJsonAtomic(probe, { stamp });
    const read = await readJsonFile(probe) as { stamp?: string } | null;
    if (read?.stamp !== stamp) throw new Error("Probe mismatch.");
    return NextResponse.json({ status: "ok", storage: "file" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "storage-unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
