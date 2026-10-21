"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { translate } from "@/lib/i18n";

const statuses = ["backlog", "not-started", "ready-to-learn", "in-progress", "needs-practice", "needs-revision", "blocked", "completed"];

/** Update the learning status, revised estimate, and completion evidence of one topic. */
export function TopicQuickUpdate({ topic }: { topic: { id: string; status: string; revisedEstimatedMinutes: number | null; completionEvidence: string } }) {
  const language = useLanguage();
  const t = (text: string) => translate(language, text);
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const revised = String(form.get("revisedEstimatedMinutes") ?? "").trim();
    setMessage("");
    setError("");
    const response = await fetch("/api/collections/topics", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: topic.id, status: form.get("status"), revisedEstimatedMinutes: revised === "" ? null : Number(revised), completionEvidence: String(form.get("completionEvidence") ?? "") })
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) { setError(t(payload.error ?? "Not saved.")); return; }
    setMessage(t("Saved."));
    router.refresh();
  }
  const input = "mt-1 block min-h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm";
  return (
    <form onSubmit={save} className="space-y-3">
      <label className="block text-xs font-medium text-slate-700">{t("Learning status")}
        <select name="status" defaultValue={topic.status} className={input}>{statuses.map((status) => <option key={status} value={status}>{t(status.replace(/-/g, " "))}</option>)}</select>
      </label>
      <label className="block text-xs font-medium text-slate-700">{t("Revised time estimate (minutes)")}<input name="revisedEstimatedMinutes" type="number" min="0" defaultValue={topic.revisedEstimatedMinutes ?? ""} className={input} /></label>
      <label className="block text-xs font-medium text-slate-700">{t("Completion evidence (links, repository, demo, explanation)")}<textarea name="completionEvidence" rows={3} defaultValue={topic.completionEvidence} className={`${input} py-2`} /></label>
      <button type="submit" className="min-h-9 rounded-lg bg-blue-700 px-3 text-xs font-semibold text-white">{t("Save")}</button>
      {message && <p role="status" className="text-xs text-emerald-800">{message}</p>}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </form>
  );
}
