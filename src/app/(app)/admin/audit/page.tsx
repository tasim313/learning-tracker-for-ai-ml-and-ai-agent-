import type { Metadata } from "next";
import { AdminAuditLog } from "@/components/admin-panels";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Audit log" };

export default async function AdminAuditPage() {
  await requireAdmin();
  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Administration" title="Administrative audit log" description="Role changes, content publishing, and account deletions, newest first." />
      <AdminAuditLog />
    </div>
  );
}
