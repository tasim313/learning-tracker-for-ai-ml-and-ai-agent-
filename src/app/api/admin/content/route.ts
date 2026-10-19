import { NextResponse } from "next/server";
import { readJsonObject, withUser } from "@/lib/auth/http";
import { deleteCourse, deleteDiagram, publishCourse, readCatalog, saveCourse, saveDiagram, unpublishCourse } from "@/lib/content/store";

export const GET = withUser(async () => {
  const catalog = await readCatalog();
  return NextResponse.json({
    courses: catalog.courses,
    published: Object.fromEntries(Object.entries(catalog.published).map(([id, course]) => [id, { version: course.version, publishedAt: course.publishedAt }])),
    diagrams: catalog.diagrams
  });
}, { role: "admin" });

export const POST = withUser(async ({ request, user }) => {
  const body = await readJsonObject(request);
  const id = typeof body.id === "string" ? body.id : "";
  switch (body.action) {
    case "save-course": return NextResponse.json(await saveCourse(user, body.course));
    case "delete-course": await deleteCourse(user, id); return NextResponse.json({ deleted: true });
    case "publish": return NextResponse.json(await publishCourse(user, id));
    case "unpublish": await unpublishCourse(user, id); return NextResponse.json({ unpublished: true });
    case "save-diagram": return NextResponse.json(await saveDiagram(user, body.diagram));
    case "delete-diagram": await deleteDiagram(user, id); return NextResponse.json({ deleted: true });
    default: throw new Error("Unknown content action.");
  }
}, { role: "admin" });
