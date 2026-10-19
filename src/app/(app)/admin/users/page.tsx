import type { Metadata } from "next";
import { AdminAccounts } from "@/components/admin-panels";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Accounts" };

export default async function AdminUsersPage() {
  const { user } = await requireAdmin();
  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Administration" title="Accounts" description="Account metadata and roles only. Learners’ notes, answers, and learning history are private and not available here. Role changes are recorded in the audit log." />
      <AdminAccounts currentUserId={user.id} />
    </div>
  );
}
