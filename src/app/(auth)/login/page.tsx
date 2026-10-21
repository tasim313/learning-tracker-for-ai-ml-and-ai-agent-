import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { getCurrentSession } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await getCurrentSession();
  if (session) redirect(session.user.role === "admin" || session.user.role === "superuser" ? "/admin" : "/dashboard");
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">Continue with your own learning records.</p>
      <LoginForm next={next} />
    </>
  );
}
