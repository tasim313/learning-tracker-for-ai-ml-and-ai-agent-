"use client";

import { useEffect, useState, type FormEvent } from "react";

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const input = "mt-1 block min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm";

type Settings = {
  timezone?: string; weeklyHours?: number; studyDays?: string[];
  topicPassingPercent?: number; practicalPassingPercent?: number; retentionPassingPercent?: number; revisionIntervalsDays?: number[];
};

/** Learning preferences. The form renders only after saved settings load, so it always shows stored values. */
export function SettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const timezones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error(); setSettings(await response.json() as Settings); })
      .catch(() => setError("Saved settings could not be loaded."));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const intervals = String(form.get("intervals") ?? "").split(",").map((value) => Number(value.trim())).filter((value) => value > 0);
    const body = {
      timezone: String(form.get("timezone")),
      weeklyHours: Number(form.get("weeklyHours")),
      studyDays: weekdays.filter((day) => form.get(`day-${day}`) === "on"),
      topicPassingPercent: Number(form.get("topicPassingPercent")),
      practicalPassingPercent: Number(form.get("practicalPassingPercent")),
      retentionPassingPercent: Number(form.get("retentionPassingPercent")),
      revisionIntervalsDays: intervals
    };
    setPending(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Settings were not saved.");
      setSettings({ ...settings, ...body });
      setMessage("Settings saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Settings were not saved.");
    } finally {
      setPending(false);
    }
  }

  if (!settings) return <div className="xl:col-span-2">{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : <p className="text-sm text-slate-600">Loading settings…</p>}</div>;
  const studyDays = settings.studyDays ?? weekdays.slice(0, 5);
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-2">
      <h2 className="text-base font-semibold text-slate-900">Learning preferences</h2>
      <form onSubmit={save} className="mt-4 grid max-w-2xl gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-slate-700">Timezone (used to display all dates)
            {timezones.length
              ? <select name="timezone" defaultValue={settings.timezone ?? "UTC"} className={input}>{["UTC", ...timezones.filter((zone) => zone !== "UTC")].map((zone) => <option key={zone}>{zone}</option>)}</select>
              : <input name="timezone" required defaultValue={settings.timezone ?? "UTC"} className={input} />}
          </label>
          <label className="text-xs font-medium text-slate-700">Weekly target (hours)<input name="weeklyHours" type="number" min="0" max="168" step="0.5" defaultValue={settings.weeklyHours ?? 10} className={input} /></label>
        </div>
        <fieldset className="rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-xs font-semibold text-slate-700">Study days (other days count as rest days)</legend>
          <div className="mt-1 flex flex-wrap gap-3">{weekdays.map((day) => <label key={day} className="flex items-center gap-1.5 text-sm"><input type="checkbox" name={`day-${day}`} defaultChecked={studyDays.includes(day)} />{day.slice(0, 3)}</label>)}</div>
        </fieldset>
        <fieldset className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-3">
          <legend className="px-1 text-xs font-semibold text-slate-700">Competency thresholds (%) — configurable defaults, not universal standards</legend>
          <label className="text-xs font-medium text-slate-700">Topic examination<input name="topicPassingPercent" type="number" min="0" max="100" defaultValue={settings.topicPassingPercent ?? 80} className={input} /></label>
          <label className="text-xs font-medium text-slate-700">Practical examination<input name="practicalPassingPercent" type="number" min="0" max="100" defaultValue={settings.practicalPassingPercent ?? 80} className={input} /></label>
          <label className="text-xs font-medium text-slate-700">Delayed retention<input name="retentionPassingPercent" type="number" min="0" max="100" defaultValue={settings.retentionPassingPercent ?? 70} className={input} /></label>
        </fieldset>
        <label className="text-xs font-medium text-slate-700">Revision and flashcard intervals (days, comma-separated, increasing)
          <input name="intervals" defaultValue={(settings.revisionIntervalsDays ?? [1, 3, 7, 14, 30]).join(", ")} className={input} />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className="min-h-10 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-60">Save settings</button>
          {message && <p role="status" className="text-sm text-emerald-800">{message}</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </div>
      </form>
    </section>
  );
}
