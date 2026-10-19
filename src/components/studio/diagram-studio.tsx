"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DiagramViewer } from "@/components/diagram-viewer";
import { DiagramEditor, emptyDiagram } from "@/components/diagram-editor";
import { diagramQuestions } from "@/lib/diagrams";
import type { DiagramDefinition } from "@/lib/model";

async function request<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "The request failed.");
  return payload as T;
}

function DiagramQuiz({ diagram }: { diagram: DiagramDefinition }) {
  const questions = useMemo(() => diagramQuestions(diagram), [diagram]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; maxScore: number; feedback: { id: string; correct: boolean; answer: string }[] } | null>(null);
  const [error, setError] = useState("");
  if (!questions.length) return <p className="text-sm text-slate-600">This diagram has no generated questions (questions need nodes with a single next step or one decision point).</p>;
  async function submit() {
    setError("");
    try {
      setResult(await request("/api/practice", { kind: "diagram", diagramId: diagram.id, answers }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Answers were not checked.");
    }
  }
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-900">Questions about this diagram</h2>
      <p className="text-xs text-slate-500">Generated from the diagram’s structure. Practice results are kept separately from examinations.</p>
      <ol className="mt-3 space-y-4">
        {questions.map((question) => {
          const feedback = result?.feedback.find((item) => item.id === question.id);
          return (
            <li key={question.id}>
              <fieldset>
                <legend className="text-sm font-medium text-slate-900">{question.prompt}</legend>
                <div className="mt-1 grid gap-1 sm:grid-cols-2">
                  {question.options.map((option) => (
                    <label key={option} className="flex items-center gap-2 text-sm text-slate-800">
                      <input type="radio" name={question.id} checked={answers[question.id] === option} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option }))} disabled={Boolean(result)} />{option}
                    </label>
                  ))}
                </div>
                {feedback && <p className={`mt-1 text-sm ${feedback.correct ? "text-emerald-700" : "text-amber-800"}`}>{feedback.correct ? "Correct." : `Answer: ${feedback.answer}`}</p>}
              </fieldset>
            </li>
          );
        })}
      </ol>
      {result
        ? <div className="mt-3 flex items-center gap-3"><p role="status" className="text-sm font-semibold">{result.score} of {result.maxScore} correct</p><button type="button" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold" onClick={() => { setResult(null); setAnswers({}); }}>Try again</button></div>
        : <button type="button" onClick={submit} className="mt-3 inline-flex min-h-9 items-center rounded-lg bg-blue-700 px-3 text-xs font-semibold text-white">Check answers</button>}
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </section>
  );
}

export function DiagramStudio({ initialDiagramId }: { initialDiagramId?: string }) {
  const [shared, setShared] = useState<DiagramDefinition[]>([]);
  const [mine, setMine] = useState<DiagramDefinition[]>([]);
  const [selection, setSelection] = useState<{ source: "shared" | "mine" | "new"; id: string } | null>(null);
  const [draft, setDraft] = useState<DiagramDefinition | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await request<{ shared: DiagramDefinition[]; mine: DiagramDefinition[] }>("/api/diagrams");
      setShared(result.shared);
      setMine(result.mine);
      setLoaded(true);
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Diagrams are unavailable.");
      return null;
    }
  }, []);

  useEffect(() => {
    void load().then((result) => {
      if (!result) return;
      const initial = result.shared.find((item) => item.id === initialDiagramId) ?? result.shared[0];
      if (initial) setSelection({ source: "shared", id: initial.id });
    });
  }, [load, initialDiagramId]);

  const current = selection?.source === "shared" ? shared.find((item) => item.id === selection.id) : selection?.source === "mine" ? mine.find((item) => item.id === selection.id) : draft;

  function copyToMine(diagram: DiagramDefinition) {
    const copy = { ...structuredClone(diagram), id: `my-${diagram.id}-${Date.now().toString(36)}`.slice(0, 80), title: `${diagram.title} (my copy)` };
    setDraft(copy);
    setSelection({ source: "new", id: copy.id });
  }

  if (!loaded) return error ? <p role="alert" className="text-sm text-red-700">{error}</p> : <p className="text-sm text-slate-600">Loading diagrams…</p>;
  const item = "block w-full rounded-md px-2 py-1.5 text-left text-sm";
  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <nav aria-label="Diagrams" className="space-y-4 rounded-xl border border-slate-200 bg-white p-3">
        <div>
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Lesson diagrams</p>
          {shared.map((diagram) => <button key={diagram.id} type="button" className={`${item} ${selection?.source === "shared" && selection.id === diagram.id ? "bg-blue-50 font-semibold text-blue-900" : "text-slate-700"}`} onClick={() => setSelection({ source: "shared", id: diagram.id })}>{diagram.title}</button>)}
        </div>
        <div>
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">My diagrams</p>
          {mine.length === 0 && <p className="px-2 text-xs text-slate-500">None yet.</p>}
          {mine.map((diagram) => <button key={diagram.id} type="button" className={`${item} ${selection?.source === "mine" && selection.id === diagram.id ? "bg-blue-50 font-semibold text-blue-900" : "text-slate-700"}`} onClick={() => setSelection({ source: "mine", id: diagram.id })}>{diagram.title}</button>)}
          <button type="button" className="mt-2 w-full rounded-md border border-dashed border-slate-300 px-2 py-1.5 text-sm font-semibold text-slate-700" onClick={() => { const fresh = emptyDiagram(`my-diagram-${Date.now().toString(36)}`); setDraft(fresh); setSelection({ source: "new", id: fresh.id }); }}>Draw a new diagram</button>
        </div>
      </nav>
      <div className="min-w-0 space-y-5">
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {!current ? <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">Choose a diagram.</p> : selection?.source === "shared" ? (
          <>
            <DiagramViewer diagram={current} height={420} />
            <button type="button" onClick={() => copyToMine(current)} className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800">Copy and edit as an exercise</button>
            <DiagramQuiz diagram={current} />
          </>
        ) : (
          <DiagramEditor key={current.id} initial={current}
            onSave={async (diagram) => { await request("/api/diagrams", { action: "save", diagram }); await load(); setSelection({ source: "mine", id: diagram.id }); }}
            onDelete={selection?.source === "mine" ? async () => { await request("/api/diagrams", { action: "delete", id: current.id }); setSelection(null); await load(); } : undefined} />
        )}
      </div>
    </div>
  );
}
