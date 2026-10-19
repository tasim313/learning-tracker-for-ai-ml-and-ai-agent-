import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Choose a new password", referrer: "no-referrer" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Choose a new password</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">Setting a new password signs out every existing session.</p>
      <ResetPasswordForm token={token ?? ""} />
    </>
  );
}
