"use client";

import { Languages } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Language } from "@/lib/i18n";

export function LanguageToggle({ language }: { language: Language }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function changeLanguage(next: Language) {
    if (next === language || pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredLanguage: next })
      });
      if (!response.ok) throw new Error();
      router.refresh();
    } catch {
      setError("Language could not be saved. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-1" aria-label="Change language">
      <Languages size={15} aria-hidden="true" className="text-slate-500" />
      <label className="sr-only" htmlFor="site-language">Language</label>
      <select id="site-language" value={language} disabled={pending} onChange={(event) => void changeLanguage(event.target.value as Language)} className="min-h-9 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-700 disabled:opacity-60">
        <option value="en">English</option>
        <option value="bn">বাংলা</option>
      </select>
      {error && <span role="alert" className="sr-only">{error}</span>}
    </div>
  );
}
