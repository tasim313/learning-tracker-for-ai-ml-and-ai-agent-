import type { Metadata } from "next";
import { AdminOverview } from "@/components/admin-panels";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Administration dashboard" };

export default async function AdminDashboardPage() {
  await requireAdmin();
  return <div className="space-y-7">
    <PageHeader eyebrow="Administration" title="Platform overview" description="Live account and learning summaries derived from saved learner records. Active learning time is collected only while the app is visible, focused, and recently used." />
    <AdminOverview />
  </div>;
}
