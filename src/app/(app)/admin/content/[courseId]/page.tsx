import type { Metadata } from "next";
import { CourseEditor } from "@/components/admin/course-editor";
import { requireAdmin } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Course authoring" };

export default async function CourseAuthoringPage({ params }: { params: Promise<{ courseId: string }> }) {
  await requireAdmin();
  const { courseId } = await params;
  return <CourseEditor courseId={courseId} />;
}
