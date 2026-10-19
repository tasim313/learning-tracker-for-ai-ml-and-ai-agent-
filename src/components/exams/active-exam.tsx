"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/markdown";

type Snapshot = { questionId: string; prompt: string; questionType: string; options: string[]; maxMarks: number; critical: boolean };
type Attempt = {
  id: string; examType: string; startedAt: string; timeLimitMinutes: number; selfDeclaredClosedBook: boolean; submittedAt: string | null;
  questionSnapshots: Snapshot[]; answers: Record<string, string>; confidenceRatings?: Record<string, number>;
};

async function messageFrom(response: Response) {
  const payload = await response.json().catch(() => ({})) as { error?: string };
  return payload.error ?? "The request failed.";
}

const placeholders: Record<string, string> = {
  practical: "Describe what you built and how you tested it, and link the evidence. Code is not executed here.",
  "code-writing": "Write your code. It is reviewed against the rubric; it is not executed by the platform.",
  "correct-flawed-solution": "Explain what is wrong and give a corrected solution.",
  "concept-comparison": "Compare the concepts: similarities, differences, and when to use each.",
  "algorithm-design": "Describe your algorithm step by step, with its complexity and edge cases.",
  "predict-output": "Type exactly what the program prints.",
  calculation: "Enter a number.",
  "data-interpretation": "Enter your answer."
};

/**
 * Active examination. Remaining time is derived from the saved start timestamp, so
 * it survives refreshes. Draft answers are saved after a short pause, one request
 * at a time, so an older draft can never overwrite a newer one.
 */
export function ActiveExam() {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now());
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(new Map<string, string>());
  const timer = useRef<number | null>(null);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const expired = useRef(false);

  useEffect(() => {
    fetch("/api/collections/examinationAttempts", { cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error(await messageFrom(response)); return response.json() as Promise<Attempt[]>; })
      .then((rows) => {
        const active = rows.find((row) => row.submittedAt === null) ?? null;
        setAttempt(active);
        if (active) { setAnswers(active.answers); setConfidence(active.confidenceRatings ?? {}); }
      })
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setLoaded(true));
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const flush = useCallback((): Promise<void> => {
    if (!attempt) return chain.current;
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    const batch = [...pending.current.entries()];
    pending.current.clear();
    if (!batch.length) return chain.current;
    setSaveState("saving");
    chain.current = chain.current.then(async () => {
      for (const [questionId, answer] of batch) {
        const response = await fetch("/api/exams", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "answer", attemptId: attempt.id, questionId, answer }) });
        if (!response.ok) throw new Error(await messageFrom(response));
      }
      setSaveState(pending.current.size ? "saving" : "saved");
    }).catch((cause: unknown) => {
      // Keep unsaved answers so the next flush retries them.
      for (const [questionId, answer] of batch) if (!pending.current.has(questionId)) pending.current.set(questionId, answer);
      setSaveState("error");
      setError(cause instanceof Error ? cause.message : "An answer was not saved.");
    });
    return chain.current;
  }, [attempt]);

  function changeAnswer(questionId: string, value: string) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    pending.current.set(questionId, value);
    setSaveState("saving");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), 600);
  }

  async function rateConfidence(questionId: string, value: number) {
    if (!attempt) return;
    setConfidence((current) => ({ ...current, [questionId]: value }));
    const response = await fetch("/api/exams", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "confidence", attemptId: attempt.id, questionId, confidence: value }) });
    if (!response.ok) setError(await messageFrom(response));
  }

  const submit = useCallback(async (reason: "submit" | "expire") => {
    if (!attempt) return;
    setSubmitting(true);
    setError("");
    try {
      if (reason === "submit") await flush();
      if (pending.current.size) throw new Error("Some answers are not saved yet. Check your connection and try again.");
      const response = await fetch("/api/exams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: reason, attemptId: attempt.id }) });
      if (!response.ok) throw new Error(await messageFrom(response));
      window.location.href = "/exam-results";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The examination was not submitted.");
      setSubmitting(false);
    }
  }, [attempt, flush]);

  const deadline = attempt ? Date.parse(attempt.startedAt) + attempt.timeLimitMinutes * 60_000 : 0;
  const remaining = attempt ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;

  useEffect(() => {
    if (!attempt || remaining > 0 || expired.current) return;
    expired.current = true;
    void submit("expire");
  }, [attempt, remaining, submit]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (pending.current.size) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  if (!loaded) return <p className="text-sm text-slate-600 xl:col-span-2">Loading your examination…</p>;
  if (!attempt) return <section className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-2"><h2 className="font-semibold text-slate-900">No active examination</h2><p className="mt-2 text-sm text-slate-600">Start an examination from the dashboard. An attempt in progress resumes here after a refresh.</p><Link href="/exams" className="mt-3 inline-block text-sm font-semibold text-blue-800 underline">Open examinations</Link>{error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</section>;

  const unanswered = attempt.questionSnapshots.filter((question) => !(answers[question.questionId] ?? "").trim());
  return (
    <div className="grid gap-5 xl:col-span-2 xl:grid-cols-[minmax(0,1fr)_240px]">
      <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Active examination</h2>
            <p className="mt-1 text-sm text-slate-600">{attempt.examType.replace(/-/g, " ")} · started {new Date(attempt.startedAt).toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className={`font-mono text-xl font-semibold ${remaining < 300 ? "text-red-700" : "text-slate-900"}`} aria-live="off">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")} remaining</p>
            <p className="text-xs text-slate-500" aria-live="polite">{saveState === "saving" ? "Saving draft…" : saveState === "error" ? "Not saved — will retry" : "All answers saved"}</p>
          </div>
        </div>
        {attempt.selfDeclaredClosedBook && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Closed-book (self-declared, not proctored). Notes, resources, lessons, and explanations are hidden until you submit.</p>}
        <ol className="mt-5 space-y-4">
          {attempt.questionSnapshots.map((question, index) => {
            const value = answers[question.questionId] ?? "";
            return (
              <li key={question.questionId} id={`question-${index + 1}`} className="scroll-mt-4 rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question {index + 1} · {question.maxMarks} mark{question.maxMarks === 1 ? "" : "s"} · {question.questionType.replace(/-/g, " ")}{question.critical ? " · required to pass" : ""}</p>
                <Markdown className="mt-2 font-medium">{question.prompt}</Markdown>
                {question.options.length > 0 ? (
                  <fieldset className="mt-3 grid gap-2">
                    <legend className="sr-only">Answer options for question {index + 1}</legend>
                    {question.options.map((option) => {
                      const multiple = question.questionType === "multiple-select";
                      const selected = value.split("\n").filter(Boolean);
                      return (
                        <label key={option} className="flex gap-2 text-sm text-slate-800">
                          <input type={multiple ? "checkbox" : "radio"} name={`answer-${question.questionId}`} checked={multiple ? selected.includes(option) : value === option}
                            onChange={(event) => changeAnswer(question.questionId, multiple ? (event.target.checked ? [...selected, option] : selected.filter((item) => item !== option)).join("\n") : option)} />
                          {option}
                        </label>
                      );
                    })}
                  </fieldset>
                ) : ["calculation", "data-interpretation", "fill-blank", "short-answer", "predict-output"].includes(question.questionType) ? (
                  <input aria-label={`Answer for question ${index + 1}`} value={value} onChange={(event) => changeAnswer(question.questionId, event.target.value)} className="mt-3 block min-h-10 w-full max-w-md rounded-lg border border-slate-300 px-3 font-mono text-sm" placeholder={placeholders[question.questionType] ?? "Your answer"} />
                ) : (
                  <textarea aria-label={`Answer for question ${index + 1}`} value={value} onChange={(event) => changeAnswer(question.questionId, event.target.value)} rows={["code-writing", "correct-flawed-solution"].includes(question.questionType) ? 10 : 5} className={`mt-3 w-full rounded-lg border border-slate-300 p-3 text-sm ${["code-writing", "correct-flawed-solution"].includes(question.questionType) ? "font-mono" : ""}`} placeholder={placeholders[question.questionType] ?? "Your answer"} />
                )}
                <fieldset className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <legend className="sr-only">Confidence for question {index + 1}</legend>
                  <span>How confident are you? (not graded)</span>
                  {[1, 2, 3, 4, 5].map((level) => <label key={level} className="flex items-center gap-1"><input type="radio" name={`confidence-${question.questionId}`} checked={confidence[question.questionId] === level} onChange={() => void rateConfidence(question.questionId, level)} />{level}</label>)}
                </fieldset>
              </li>
            );
          })}
        </ol>
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        {unanswered.length > 0 && <p className="mt-4 text-sm text-amber-800">{unanswered.length} question{unanswered.length === 1 ? " is" : "s are"} unanswered and will be recorded as unanswered.</p>}
        <button type="button" disabled={submitting} onClick={() => { if (window.confirm(unanswered.length ? `Submit with ${unanswered.length} unanswered question(s)?` : "Submit this examination? Answers cannot be changed afterwards.")) void submit("submit"); }} className="mt-4 min-h-10 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-60">{submitting ? "Submitting…" : "Submit examination"}</button>
      </section>
      <nav aria-label="Question navigator" className="h-fit rounded-xl border border-slate-200 bg-white p-4 xl:sticky xl:top-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Questions</p>
        <ol className="mt-2 grid grid-cols-5 gap-2">
          {attempt.questionSnapshots.map((question, index) => {
            const answered = Boolean((answers[question.questionId] ?? "").trim());
            return <li key={question.questionId}><a href={`#question-${index + 1}`} aria-label={`Question ${index + 1}, ${answered ? "answered" : "unanswered"}`} className={`flex h-9 items-center justify-center rounded-md border text-sm font-semibold ${answered ? "border-blue-700 bg-blue-50 text-blue-900" : "border-slate-300 text-slate-600"}`}>{index + 1}</a></li>;
          })}
        </ol>
        <p className="mt-3 text-xs text-slate-500">{attempt.questionSnapshots.length - unanswered.length} of {attempt.questionSnapshots.length} answered</p>
      </nav>
    </div>
  );
}
