import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Recover your account" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Recover your account</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">Enter your account email. If email delivery is configured, we will send a reset link that expires in one hour.</p>
      <ForgotPasswordForm />
    </>
  );
}
