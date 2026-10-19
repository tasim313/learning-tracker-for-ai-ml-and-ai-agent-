"use client";

import { useState } from "react";

const labels = {
  unchecked: { text: "Availability not checked", className: "bg-slate-100 text-slate-700" },
  available: { text: "Reachable when checked", className: "bg-emerald-50 text-emerald-800" },
  unavailable: { text: "Not found when checked", className: "bg-rose-50 text-rose-800" },
  "needs-check": { text: "Needs checking", className: "bg-amber-50 text-amber-900" }
} as const;

/** Shows the last real availability check and lets the learner run a new one. Nothing is claimed without a check. */
export function ResourceAvailability({ id, availability, lastCheckedAt, license, publisher }: { id: string; availability: string; lastCheckedAt: string | null; license: string; publisher: string }) {
  const [state, setState] = useState({ availability, lastCheckedAt, detail: "" });
  const [busy, setBusy] = useState(false);
  const label = labels[state.availability as keyof typeof labels] ?? labels.unchecked;
  async function check() {
    setBusy(true);
    try {
      const response = await fetch("/api/resources/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const payload = await response.json() as { availability?: string; checkedAt?: string; detail?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "The check failed.");
      setState({ availability: payload.availability ?? "needs-check", lastCheckedAt: payload.checkedAt ?? null, detail: payload.detail ?? "" });
    } catch (cause) {
      setState((current) => ({ ...current, detail: cause instanceof Error ? cause.message : "The check failed." }));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-3 space-y-1 text-xs">
      <p className="text-slate-500">{[publisher, `Licence: ${license || "Unknown"}`].filter(Boolean).join(" · ")} · third-party, opens at source</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 font-medium ${label.className}`}>{label.text}{state.lastCheckedAt ? ` · ${new Date(state.lastCheckedAt).toLocaleDateString()}` : ""}</span>
        <button type="button" onClick={check} disabled={busy} className="rounded-md border border-slate-300 bg-white px-2 py-0.5 font-semibold text-slate-700 disabled:opacity-50">{busy ? "Checking…" : "Check link"}</button>
      </div>
      {state.detail && <p role="status" className="text-slate-600">{state.detail}</p>}
    </div>
  );
}
