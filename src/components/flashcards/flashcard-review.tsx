"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Card = { id: string; front: string; back: string; topicId: string | null; source: string; stage: number; dueAt: string; suspended: boolean; reviews: { grade: string; reviewedAt: string }[] };
type Payload = { cards: Card[]; due: string[]; intervals: number[]; retentionPercent: number | null };
type Course = { id: string; title: string; lessons: { id: string; title: string; glossaryCount: number }[] };

async function post<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/flashcards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "The change was not saved.");
  return payload as T;
}

const button = "inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800";
const input = "mt-1 block min-h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm";

export function FlashcardReview({ topics, courses }: { topics: { id: string; title: string }[]; courses: Course[] }) {
  const [state, setState] = useState<Payload | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(() => fetch("/api/flashcards", { cache: "no-store" }).then((response) => response.json()).then(setState).catch(() => setError("Flashcards are unavailable.")), []);
  useEffect(() => { void load(); }, [load]);

  if (!state) return error ? <p role="alert" className="text-sm text-red-700">{error}</p> : <p className="text-sm text-slate-600">Loading flashcards…</p>;
  const current = state.cards.find((card) => card.id === state.due[0]);

  async function grade(value: "again" | "hard" | "good" | "easy") {
    if (!current) return;
    try {
      await post({ action: "review", cardId: current.id, grade: value });
      setRevealed(false);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Review was not saved."); }
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    setError("");
    try {
      await post({ action: "create", ...values });
      form.reset();
      setNotice("Card added. It is due now.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Card was not added."); }
  }
  async function fromLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const [courseId, lessonId] = String(new FormData(event.currentTarget).get("lesson") ?? "").split("::");
    setError("");
    try {
      const result = await post<{ created: number }>({ action: "from-lesson", courseId, lessonId });
      setNotice(result.created ? `${result.created} card(s) created from the lesson glossary.` : "All glossary terms from this lesson already have cards.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Cards were not created."); }
  }
  async function remove(card: Card) {
    if (!window.confirm(`Delete the card “${card.front}”? Its review history is deleted too.`)) return;
    try { await post({ action: "delete", cardId: card.id }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Card was not deleted."); }
  }
  async function toggleSuspend(card: Card) {
    try { await post({ action: "update", cardId: card.id, suspended: !card.suspended }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Card was not updated."); }
  }

  return (
    <div className="space-y-5">
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{notice}</p>}
      <section className="rounded-xl border border-slate-200 bg-white p-6" aria-live="polite">
        <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500">
          <span>{state.due.length} due now · {state.cards.length} total</span>
          <span>Intervals (days): {state.intervals.join(", ")} · {state.retentionPercent === null ? "No reviews yet" : `${state.retentionPercent.toFixed(0)}% of reviews recalled (good or easy)`}</span>
        </div>
        {current ? (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-slate-500">{current.source} · stage {current.stage + 1} of {state.intervals.length}</p>
            <p className="text-xl font-semibold text-slate-900">{current.front}</p>
            {revealed ? (
              <>
                <p className="rounded-lg bg-slate-50 p-4 text-base text-slate-800">{current.back}</p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="How well did you recall it?">
                  <button type="button" className={button} onClick={() => grade("again")}>Again (forgot)</button>
                  <button type="button" className={button} onClick={() => grade("hard")}>Hard</button>
                  <button type="button" className={button} onClick={() => grade("good")}>Good</button>
                  <button type="button" className={button} onClick={() => grade("easy")}>Easy</button>
                </div>
                <p className="text-xs text-slate-500">Be honest — the schedule only helps if grades reflect your real recall.</p>
              </>
            ) : <button type="button" className="inline-flex min-h-10 items-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white" onClick={() => setRevealed(true)}>Show answer</button>}
          </div>
        ) : <p className="mt-4 text-sm text-slate-600">{state.cards.length ? "No cards are due. Come back later, or add new cards." : "You have no flashcards yet. Add your own or create them from a lesson glossary."}</p>}
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <form onSubmit={create} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-900">Add a card</h2>
          <label className="block text-xs font-medium text-slate-700">Front (question or term)<input name="front" required maxLength={2000} className={input} /></label>
          <label className="block text-xs font-medium text-slate-700">Back (answer)<textarea name="back" required maxLength={5000} rows={3} className={`${input} py-2`} /></label>
          <label className="block text-xs font-medium text-slate-700">Topic (optional)<select name="topicId" className={input}><option value="">None</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select></label>
          <button type="submit" className={button}>Add card</button>
        </form>
        <form onSubmit={fromLesson} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-900">Create cards from a lesson</h2>
          <p className="text-sm text-slate-600">Each glossary term becomes a card. Terms you already have are skipped.</p>
          <label className="block text-xs font-medium text-slate-700">Lesson
            <select name="lesson" required className={input}>
              {courses.flatMap((course) => course.lessons.filter((lesson) => lesson.glossaryCount > 0).map((lesson) => <option key={lesson.id} value={`${course.id}::${lesson.id}`}>{course.title} — {lesson.title} ({lesson.glossaryCount} terms)</option>))}
            </select>
          </label>
          <button type="submit" className={button}>Create cards</button>
        </form>
      </div>
      {state.cards.length > 0 && (
        <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <caption className="px-4 pt-4 text-left text-base font-semibold text-slate-900">All cards</caption>
            <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th scope="col" className="px-4 py-2">Front</th><th scope="col" className="px-4 py-2">Next review</th><th scope="col" className="px-4 py-2">Reviews</th><th scope="col" className="px-4 py-2"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {state.cards.map((card) => (
                <tr key={card.id}>
                  <td className="px-4 py-2">{card.front}{card.suspended && <span className="ml-2 text-xs text-slate-500">(suspended)</span>}</td>
                  <td className="px-4 py-2 text-xs">{new Date(card.dueAt).toLocaleString()}</td>
                  <td className="px-4 py-2 text-xs">{card.reviews.length}</td>
                  <td className="px-4 py-2 text-right"><button type="button" className="mr-3 text-xs underline" onClick={() => toggleSuspend(card)}>{card.suspended ? "Resume" : "Suspend"}</button><button type="button" className="text-xs text-red-700 underline" onClick={() => remove(card)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
