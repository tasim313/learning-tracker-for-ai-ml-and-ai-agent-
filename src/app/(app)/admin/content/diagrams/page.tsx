import type { Metadata } from "next";
import { DiagramLibrary } from "@/components/admin/diagram-library";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Diagram library" };

export default async function DiagramLibraryPage() {
  await requireAdmin();
  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Administration" title="Shared diagram library" description="Diagrams used in lessons. A diagram cannot be deleted while a lesson uses it." />
      <DiagramLibrary />
    </div>
  );
}
