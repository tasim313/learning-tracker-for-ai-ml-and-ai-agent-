import type { Metadata } from "next";
import { VerifyEmailForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Verify your email", referrer: "no-referrer" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Verify your email address</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">Confirming your address lets you recover your account by email.</p>
      <VerifyEmailForm token={token ?? ""} />
    </>
  );
}
