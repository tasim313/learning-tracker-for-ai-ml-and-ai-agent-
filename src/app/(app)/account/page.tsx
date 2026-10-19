import type { Metadata } from "next";
import { AccountSettings } from "@/components/account-settings";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Account and privacy" };

export default function AccountPage() {
  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Your account" title="Account and privacy" description="Manage your profile, password, and sessions; export your data; or delete your account." />
      <AccountSettings />
    </div>
  );
}
