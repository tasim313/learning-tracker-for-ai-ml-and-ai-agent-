import { NextResponse } from "next/server";
import { withUser } from "@/lib/auth/http";
import { readAudit } from "@/lib/auth/stores";

export const GET = withUser(async () => NextResponse.json(await readAudit(500)), { role: "admin" });
