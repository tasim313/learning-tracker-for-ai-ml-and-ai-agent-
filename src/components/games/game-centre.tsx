"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Timer } from "lucide-react";
import { Markdown } from "@/components/markdown";

type Summary = { id: string; title: string; objective: string; rules: string; level: string; type: string };
type Attempt = { kind: string; itemId: string; score: number; maxScore: number; correct: boolean; mistakes: string[]; attemptedAt: string; durationSeconds: number | null; timed: boolean };
type PublicGame = Summary & {
  round: number;
  terms?: string[]; definitions?: string[]; steps?: string[];
  puzzles?: { id: string; code: string; lines?: number }[];
  scenarios?: { id: string; situation: string; options: string[] }[];
  items?: { problemId: string; variant: number; prompt: string; answerFormat: string }[];
  timeLimitSeconds?: number;
};
type Result = { score: number; maxScore: number; correct: boolean; feedback: { id: string; correct: boolean; message: string }[] };

const button = "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 disabled:opacity-40";
const input = "mt-1 block min-h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm";

function Play({ game, onFinished }: { game: PublicGame; onFinished: (result: Result) => void }) {
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [order, setOrder] = useState(game.steps ?? []);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timed, setTimed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const started = useRef(0);

  useEffect(() => {
    started.current = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function answerPayload() {
    switch (game.type) {
      case "matching": return { matches };
      case "ordering": return { order };
      case "math-sprint": return { items: (game.items ?? []).map((item, index) => ({ problemId: item.problemId, variant: item.variant, answer: answers[String(index)] ?? "" })) };
      default: return { answers };
    }
  }

  async function submit() {
    setError("");
    const response = await fetch("/api/practice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "game", gameId: game.id, answer: answerPayload(), timed, durationSeconds: elapsed }) });
    const payload = await response.json() as Result & { error?: string };
    if (!response.ok) { setError(payload.error ?? "Answers were not checked."); return; }
    setResult(payload);
    onFinished(payload);
  }

  const limit = game.timeLimitSeconds ?? 300;
  const feedbackFor = (id: string) => result?.feedback.find((item) => item.id === id);
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{game.title}</h2>
          <p className="text-sm text-slate-600"><strong>Objective:</strong> {game.objective}</p>
          <p className="text-sm text-slate-600"><strong>Rules:</strong> {game.rules}</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={timed} onChange={(event) => setTimed(event.target.checked)} disabled={Boolean(result)} /><Timer size={14} aria-hidden="true" />Optional timer</label>
      </div>
      {timed && <p className="text-sm font-medium text-slate-700" aria-live="off">Time: {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}{game.type === "math-sprint" && ` of ${Math.floor(limit / 60)}:00 target`}. Timing is for your own reference and does not change the score.</p>}

      {game.type === "matching" && (
        <ul className="space-y-3">
          {(game.terms ?? []).map((term) => (
            <li key={term}>
              <label className="block text-sm font-medium text-slate-900">{term}
                <select className={input} value={matches[term] ?? ""} onChange={(event) => setMatches({ ...matches, [term]: event.target.value })} disabled={Boolean(result)}>
                  <option value="">Choose a definition…</option>
                  {(game.definitions ?? []).map((definition) => <option key={definition} value={definition}>{definition}</option>)}
                </select>
              </label>
              {feedbackFor(term) && <p className={`mt-1 text-sm ${feedbackFor(term)!.correct ? "text-emerald-700" : "text-amber-800"}`}>{feedbackFor(term)!.message}</p>}
            </li>
          ))}
        </ul>
      )}

      {game.type === "ordering" && (
        <ol className="space-y-2">
          {order.map((step, index) => (
            <li key={step} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm">
              <span className="w-6 text-right font-mono text-slate-500">{index + 1}.</span>
              <span className="flex-1 text-slate-900">{step}</span>
              <button type="button" className={button} disabled={index === 0 || Boolean(result)} onClick={() => setOrder((current) => { const copy = [...current]; [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]]; return copy; })} aria-label={`Move “${step}” up`}><ArrowUp size={13} /></button>
              <button type="button" className={button} disabled={index === order.length - 1 || Boolean(result)} onClick={() => setOrder((current) => { const copy = [...current]; [copy[index + 1], copy[index]] = [copy[index], copy[index + 1]]; return copy; })} aria-label={`Move “${step}” down`}><ArrowDown size={13} /></button>
            </li>
          ))}
          {result && <li className="text-sm">{result.feedback.filter((item) => !item.correct).map((item) => <p key={item.id} className="text-amber-800">{item.message}</p>)}</li>}
        </ol>
      )}

      {(game.type === "code-output" || game.type === "bug-hunt") && (
        <ol className="space-y-4">
          {(game.puzzles ?? []).map((puzzle, index) => (
            <li key={puzzle.id} className="space-y-2">
              <p className="text-sm font-medium text-slate-900">{index + 1}. {game.type === "code-output" ? "What does this program print?" : "Which line contains the bug?"}</p>
              <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-sm">{puzzle.code.split("\n").map((line, lineIndex) => <div key={lineIndex}>{game.type === "bug-hunt" && <span className="mr-3 select-none text-slate-400">{lineIndex + 1}</span>}{line || " "}</div>)}</pre>
              <label className="block text-xs font-medium text-slate-700">{game.type === "code-output" ? "Output" : "Line number"}
                <input className={`${input} max-w-xs font-mono`} inputMode={game.type === "bug-hunt" ? "numeric" : "text"} value={answers[puzzle.id] ?? ""} onChange={(event) => setAnswers({ ...answers, [puzzle.id]: event.target.value })} disabled={Boolean(result)} />
              </label>
              {feedbackFor(puzzle.id) && <p className={`text-sm ${feedbackFor(puzzle.id)!.correct ? "text-emerald-700" : "text-amber-800"}`}>{feedbackFor(puzzle.id)!.message}</p>}
            </li>
          ))}
        </ol>
      )}

      {game.type === "scenario" && (
        <ol className="space-y-4">
          {(game.scenarios ?? []).map((scenario, index) => (
            <li key={scenario.id}>
              <fieldset>
                <legend className="text-sm font-medium text-slate-900">{index + 1}. {scenario.situation}</legend>
                <div className="mt-2 space-y-1">
                  {scenario.options.map((option) => <label key={option} className="flex items-start gap-2 text-sm text-slate-800"><input type="radio" className="mt-1" name={scenario.id} checked={answers[scenario.id] === option} onChange={() => setAnswers({ ...answers, [scenario.id]: option })} disabled={Boolean(result)} />{option}</label>)}
                </div>
                {feedbackFor(scenario.id) && <p className={`mt-1 text-sm ${feedbackFor(scenario.id)!.correct ? "text-emerald-700" : "text-amber-800"}`}>{feedbackFor(scenario.id)!.message}</p>}
              </fieldset>
            </li>
          ))}
        </ol>
      )}

      {game.type === "math-sprint" && (
        <ol className="space-y-4">
          {(game.items ?? []).map((item, index) => (
            <li key={`${item.problemId}-${item.variant}`}>
              <Markdown>{`${index + 1}. ${item.prompt}`}</Markdown>
              <label className="block text-xs text-slate-700">Answer ({item.answerFormat})<input className={`${input} max-w-xs`} inputMode="decimal" value={answers[String(index)] ?? ""} onChange={(event) => setAnswers({ ...answers, [String(index)]: event.target.value })} disabled={Boolean(result)} /></label>
              {feedbackFor(String(index + 1)) && <p className={`mt-1 text-sm ${feedbackFor(String(index + 1))!.correct ? "text-emerald-700" : "text-amber-800"}`}>{feedbackFor(String(index + 1))!.message}</p>}
            </li>
          ))}
        </ol>
      )}

      {result
        ? <p role="status" className="rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-900">Score: {result.score} of {result.maxScore}.{result.correct ? " Everything correct." : " Review the feedback above, then play again."}</p>
        : <button type="button" onClick={submit} className="inline-flex min-h-10 items-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white">Submit answers</button>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </section>
  );
}

export function GameCentre() {
  const [games, setGames] = useState<Summary[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [active, setActive] = useState<PublicGame | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/practice", { cache: "no-store" }).then((response) => response.json()).then((value: { games: Summary[]; attempts: Attempt[] }) => { setGames(value.games); setAttempts(value.attempts); }).catch(() => setError("Games are unavailable."));
  }, []);

  async function start(gameId: string) {
    setError("");
    const response = await fetch(`/api/practice?game=${encodeURIComponent(gameId)}`, { cache: "no-store" });
    if (!response.ok) { setError("The game could not be started."); return; }
    setActive(await response.json() as PublicGame);
    window.scrollTo({ top: 0 });
  }

  const best = (id: string) => {
    const mine = attempts.filter((item) => item.kind === "game" && item.itemId === id);
    return mine.length ? `Best ${Math.max(...mine.map((item) => item.score))}/${mine[0].maxScore} · ${mine.length} play${mine.length === 1 ? "" : "s"}` : "Not played yet";
  };
  const lastMistakes = attempts.filter((item) => item.kind === "game" && item.mistakes.length).slice(-3).reverse();

  return (
    <div className="space-y-5">
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {active && <Play key={`${active.id}-${active.round}`} game={active} onFinished={(result) => setAttempts((current) => [...current, { kind: "game", itemId: active.id, score: result.score, maxScore: result.maxScore, correct: result.correct, mistakes: result.feedback.filter((item) => !item.correct).map((item) => item.message), attemptedAt: new Date().toISOString(), durationSeconds: null, timed: false }])} />}
      {active && <button type="button" className={button} onClick={() => void start(active.id)}>Play again with a new shuffle</button>}
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {games.map((game) => (
          <li key={game.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-500">{game.type.replace(/-/g, " ")} · {game.level}</p>
            <h2 className="mt-1 text-base font-semibold text-slate-900">{game.title}</h2>
            <p className="mt-1 flex-1 text-sm text-slate-600">{game.objective}</p>
            <p className="mt-2 text-xs text-slate-500">{best(game.id)}</p>
            <button type="button" className={`${button} mt-3 w-fit`} onClick={() => void start(game.id)}>Play</button>
          </li>
        ))}
      </ul>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">Revisit recent mistakes</h2>
        {lastMistakes.length === 0 ? <p className="mt-1 text-sm text-slate-600">No mistakes recorded yet.</p> : (
          <ul className="mt-2 space-y-3 text-sm">
            {lastMistakes.map((attempt) => <li key={attempt.attemptedAt}><p className="font-medium text-slate-900">{games.find((game) => game.id === attempt.itemId)?.title ?? attempt.itemId} · {new Date(attempt.attemptedAt).toLocaleDateString()}</p><ul className="list-disc pl-5 text-slate-700">{attempt.mistakes.map((mistake) => <li key={mistake}>{mistake}</li>)}</ul></li>)}
          </ul>
        )}
      </section>
      <p className="text-xs text-slate-500">Game scores are practice. They are kept separate from formal examination results and competency status. Points are awarded only once, for the first fully correct result in each game.</p>
    </div>
  );
}
