import type { Metadata } from "next";
import { AdminUserDetail } from "@/components/admin-panels";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Learner profile" };

export default async function AdminUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  await requireAdmin();
  const { userId } = await params;
  return <div className="space-y-7">
    <PageHeader eyebrow="Administration / Accounts" title="Learner profile and history" description="Learning details are shown only to authorized administrators and are loaded from this account’s private JSON workspace." />
    <AdminUserDetail userId={userId} />
  </div>;
}
