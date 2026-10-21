"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { translate, type Language } from "@/lib/i18n";

export function SignOutButton({ language = "en" }: { language?: Language }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      window.location.assign("/login");
    } catch {
      setError(translate(language, "Sign-out failed. Try again."));
      setPending(false);
    }
  }
  return (
    <div>
      <button type="button" onClick={signOut} disabled={pending} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-700 disabled:opacity-60">
        <LogOut size={14} aria-hidden="true" /> {pending ? translate(language, "Signing out…") : translate(language, "Sign out")}
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
