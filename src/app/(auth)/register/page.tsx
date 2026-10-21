import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth-forms";
import { getCurrentSession } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Create an account" };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const session = await getCurrentSession();
  if (session) redirect(session.user.role === "admin" || session.user.role === "superuser" ? "/admin" : "/dashboard");
  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Create your account</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">You start with the shared AI/ML roadmap and no recorded activity. Your progress, answers, and notes are visible only to you.</p>
      <RegisterForm />
    </>
  );
}
