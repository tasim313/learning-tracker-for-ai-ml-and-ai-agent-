"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TaskStatusButton({ id, completed }: { id: string; completed: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function toggle() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/collections/learningTasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: completed ? "not-started" : "completed" })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Task status was not saved.");
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Task status was not saved.");
    } finally {
      setSaving(false);
    }
  }
  return <span className="inline-flex items-center gap-2">
    <button type="button" disabled={saving} onClick={() => void toggle()} className="min-h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-blue-700">
      {saving ? "Saving…" : completed ? "Mark to revisit" : "Mark complete"}
    </button>
    {error && <span role="alert" className="text-xs text-rose-700">{error}</span>}
  </span>;
}
