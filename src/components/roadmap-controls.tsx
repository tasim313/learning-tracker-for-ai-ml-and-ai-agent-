"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/roadmap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(((await response.json().catch(() => ({}))) as { error?: string }).error ?? "The change was not saved.");
}

export function MoveControls({ kind, id, label, isFirst, isLast }: { kind: "phase" | "topic"; id: string; label: string; isFirst: boolean; isLast: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function move(direction: "up" | "down") {
    setBusy(true);
    setError("");
    try {
      await post({ action: kind === "phase" ? "move-phase" : "move-topic", id, direction });
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Not saved.");
    } finally {
      setBusy(false);
    }
  }
  const button = "inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 disabled:opacity-40";
  return (
    <span className="inline-flex items-center gap-1">
      <button type="button" className={button} disabled={busy || isFirst} onClick={() => move("up")} aria-label={`Move ${label} up`}><ArrowUp size={14} aria-hidden="true" /></button>
      <button type="button" className={button} disabled={busy || isLast} onClick={() => move("down")} aria-label={`Move ${label} down`}><ArrowDown size={14} aria-hidden="true" /></button>
      {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
    </span>
  );
}

export function PrioritySelect({ id, label, value }: { id: string; label: string; value: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <label className="inline-flex items-center gap-1 text-xs text-slate-600">Priority
      <select aria-label={`Priority for ${label}`} defaultValue={value} className="min-h-8 rounded-md border border-slate-300 bg-white px-1 text-xs" onChange={async (event) => {
        setError("");
        try { await post({ action: "set-priority", id, priority: event.target.value }); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Not saved."); }
      }}>
        <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
      </select>
      {error && <span role="alert" className="text-red-700">{error}</span>}
    </label>
  );
}
