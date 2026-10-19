import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Sparkles size={18} aria-hidden="true" /></span>
        Learning Tracker
      </Link>
      <main className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">{children}</main>
    </div>
  );
}
