import { NextResponse } from "next/server";
import { jsonError, readJsonObject, withUser } from "@/lib/auth/http";
import { getDiagrams } from "@/lib/content/store";
import { diagramDefinitionSchema } from "@/lib/model";
import { loadUserData, updateUserData } from "@/lib/storage/user-store";

/** Shared lesson diagrams plus the caller's own diagrams. */
export const GET = withUser(async ({ user }) => {
  const [shared, data] = await Promise.all([getDiagrams(), loadUserData(user.id)]);
  return NextResponse.json({ shared, mine: data.userDiagrams });
});

export const POST = withUser(async ({ request, user }) => {
  const body = await readJsonObject(request);
  if (body.action === "delete") {
    await updateUserData(user.id, (data) => {
      if (!data.userDiagrams.some((item) => item.id === body.id)) throw new Error("Diagram was not found.");
      return { data: { ...data, userDiagrams: data.userDiagrams.filter((item) => item.id !== body.id) }, result: null };
    });
    return NextResponse.json({ deleted: true });
  }
  if (body.action !== "save") return jsonError("Unknown diagram action.");
  const parsed = diagramDefinitionSchema.safeParse({ ...(typeof body.diagram === "object" && body.diagram ? body.diagram : {}), updatedAt: new Date().toISOString() });
  if (!parsed.success) return jsonError(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
  const saved = await updateUserData(user.id, (data) => ({
    data: { ...data, userDiagrams: data.userDiagrams.some((item) => item.id === parsed.data.id) ? data.userDiagrams.map((item) => item.id === parsed.data.id ? parsed.data : item) : [...data.userDiagrams, parsed.data] },
    result: parsed.data
  }));
  return NextResponse.json(saved);
});
