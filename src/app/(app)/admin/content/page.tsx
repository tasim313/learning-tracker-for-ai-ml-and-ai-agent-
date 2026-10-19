import type { Metadata } from "next";
import { ContentManager } from "@/components/admin/content-manager";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Content management" };

export default async function ContentManagementPage() {
  await requireAdmin();
  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Administration" title="Content management and publishing" description="Edit drafts, preview them, and publish versions to learners. Every published version is kept in history, and changing content never alters completed examination attempts or learners' recorded progress. Publishing actions are written to the audit log." />
      <ContentManager />
    </div>
  );
}
