"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Pin } from "lucide-react";
import type { Recommendation } from "@/lib/services/recommendations";

export function RecommendationList() {
  const [state, setState] = useState<{ visible: Recommendation[]; hidden: Recommendation[] } | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => fetch("/api/recommendations", { cache: "no-store" }).then(async (response) => {
    if (!response.ok) throw new Error();
    setState(await response.json());
  }).catch(() => setError("Recommendations are unavailable.")), []);
  useEffect(() => { void load(); }, [load]);

  async function override(key: string, action: "pinned" | "dismissed" | "snoozed" | "clear") {
    setError("");
    const response = await fetch("/api/recommendations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, action, days: 7 }) });
    if (!response.ok) { setError("Your choice was not saved."); return; }
    await load();
  }

  if (!state) return error ? <p role="alert" className="text-sm text-red-700">{error}</p> : <p className="text-sm text-slate-600">Working out recommendations from your records…</p>;
  const small = "rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700";
  return (
    <div className="space-y-5">
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {state.visible.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No recommendations right now. Record study sessions, lessons, or examinations to get personalized suggestions.</p> : (
        <ol className="space-y-3">
          {state.visible.map((item) => (
            <li key={item.key} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.override === "pinned" && <Pin size={12} className="mr-1 inline" aria-label="Pinned" />}{item.kind.replace(/-/g, " ")}</p>
                  <h2 className="mt-1 text-base font-semibold text-slate-900"><Link href={item.href} className="underline-offset-2 focus-visible:underline">{item.title}</Link></h2>
                  <p className="mt-1 text-sm text-slate-700"><span className="font-medium">Why: </span>{item.reason}</p>
                  {item.evidence.length > 0 && <ul className="mt-2 list-disc pl-5 text-xs text-slate-600">{item.evidence.map((evidence) => <li key={evidence}>{evidence}</li>)}</ul>}
                </div>
                <div className="flex flex-wrap gap-1">
                  <Link href={item.href} className="rounded-md bg-blue-700 px-2 py-1 text-xs font-semibold text-white">Open</Link>
                  {item.override === "pinned" ? <button type="button" className={small} onClick={() => override(item.key, "clear")}>Unpin</button> : <button type="button" className={small} onClick={() => override(item.key, "pinned")}>Pin</button>}
                  <button type="button" className={small} onClick={() => override(item.key, "snoozed")}>Snooze 7 days</button>
                  <button type="button" className={small} onClick={() => override(item.key, "dismissed")}>Dismiss</button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      {state.hidden.length > 0 && (
        <details className="rounded-xl border border-slate-200 bg-white p-5">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">Dismissed or snoozed ({state.hidden.length})</summary>
          <ul className="mt-3 space-y-2">{state.hidden.map((item) => <li key={item.key} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{item.title} <span className="text-xs text-slate-500">({item.override})</span></span><button type="button" className={small} onClick={() => override(item.key, "clear")}>Restore</button></li>)}</ul>
        </details>
      )}
      <p className="text-xs text-slate-500">Recommendations use only your recorded examinations, practical evidence, revisions, flashcards, lessons, and practice. They never treat time spent or lesson completion as proof of mastery, and you can override any of them.</p>
    </div>
  );
}
