"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Pause, Play, RotateCcw, StepBack, StepForward } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { translate } from "@/lib/i18n";
import { binarySearchTrace, bubbleSortTrace, equationStep, factorialTrace, fibonacciTable, loginWorkflowSteps, midpointIntegralSquares, projectilePosition, secantSlope, stackTrace, sumLoopTrace } from "@/lib/visual/engine";

type VisualId = "binary-search" | "sorting" | "recursion" | "dynamic-programming" | "stack" | "derivative" | "integral" | "code-trace" | "equation" | "projectile" | "login-workflow";
type SavedProgress = Record<string, { step?: number; completed?: boolean; interactions?: number; stepsVisited?: number[]; timeSpentSeconds?: number; assessments?: { result: string; at: string }[] }>;
const visualizations: { id: VisualId; label: string; summary: string }[] = [
  { id: "binary-search", label: "Binary search", summary: "Watch a sorted range shrink after each comparison." },
  { id: "sorting", label: "Bubble sort", summary: "Follow adjacent comparisons and swaps as the array becomes ordered." },
  { id: "recursion", label: "Recursion call stack", summary: "Watch factorial calls grow and return through the call stack." },
  { id: "dynamic-programming", label: "Dynamic programming table", summary: "Build Fibonacci values from the smaller results already stored." },
  { id: "stack", label: "Stack data structure", summary: "Explore push and pop with last-in, first-out behavior." },
  { id: "derivative", label: "Derivative as a tangent", summary: "Shrink a secant interval and compare its slope with the tangent slope." },
  { id: "integral", label: "Integral area approximation", summary: "Increase midpoint rectangles and compare their area with the exact integral." },
  { id: "code-trace", label: "Trace a Python loop", summary: "Follow each statement and inspect the variables it reads and changes." },
  { id: "equation", label: "Solve an equation", summary: "See why the same operation on both sides preserves equality." },
  { id: "projectile", label: "Projectile motion", summary: "Change launch speed and angle in an idealized gravity model." },
  { id: "login-workflow", label: "User login workflow", summary: "Follow a request between the user, frontend, API, backend, authentication, and database." }
];

export function VisualLearningEngine() {
  const language = useLanguage();
  const t = (value: string) => translate(language, value);
  const [visualId, setVisualId] = useState<VisualId>("binary-search");
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState<SavedProgress>({});
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [mode, setMode] = useState<"combined" | "text" | "visual">("combined");
  const [target, setTarget] = useState(22);
  const [sortValues, setSortValues] = useState([8, 3, 6, 1, 5]);
  const [factorialInput, setFactorialInput] = useState(4);
  const [fibSize, setFibSize] = useState(8);
  const [prediction, setPrediction] = useState("");
  const [answerMessage, setAnswerMessage] = useState("");
  const [launchSpeed, setLaunchSpeed] = useState(24);
  const [launchAngle, setLaunchAngle] = useState(52);
  const [time, setTime] = useState(0);
  const [showExplanation, setShowExplanation] = useState(true);
  const [error, setError] = useState("");
  const visualRef = useRef<HTMLElement>(null);
  const values = [3, 7, 11, 14, 18, 22, 29, 31];
  const searchSteps = useMemo(() => binarySearchTrace(values, target), [target]);
  const sortSteps = useMemo(() => bubbleSortTrace(sortValues), [sortValues]);
  const recursionSteps = useMemo(() => factorialTrace(factorialInput), [factorialInput]);
  const fibValues = useMemo(() => fibonacciTable(fibSize), [fibSize]);
  const maxStep = visualId === "binary-search" ? searchSteps.length - 1 : visualId === "sorting" ? sortSteps.length - 1 : visualId === "recursion" ? recursionSteps.length - 1 : visualId === "dynamic-programming" ? fibValues.length - 1 : visualId === "stack" ? stackTrace.length - 1 : visualId === "derivative" ? 19 : visualId === "integral" ? 18 : visualId === "code-trace" ? sumLoopTrace.length - 1 : visualId === "equation" ? 5 : visualId === "login-workflow" ? loginWorkflowSteps.length - 1 : 100;
  const currentSearch = searchSteps[Math.min(step, searchSteps.length - 1)];
  const currentCode = sumLoopTrace[Math.min(step, sumLoopTrace.length - 1)];
  const currentSort = sortSteps[Math.min(step, sortSteps.length - 1)];
  const currentRecursion = recursionSteps[Math.min(step, recursionSteps.length - 1)];
  const interval = Math.max(0.1, 2 - step * 0.1);
  const slope = secantSlope(0.5, interval);
  const rectangles = step + 2;
  const approximateArea = midpointIntegralSquares(rectangles);
  const currentEquation = equationStep(step);
  const flightTime = (launchSpeed * Math.sin(launchAngle * Math.PI / 180) + Math.sqrt((launchSpeed * Math.sin(launchAngle * Math.PI / 180)) ** 2 + 2 * 9.81 * 1)) / 9.81;
  const position = projectilePosition(launchSpeed, launchAngle, 9.81, Math.min(time, flightTime), 1);
  const maxX = Math.max(1, launchSpeed * Math.cos(launchAngle * Math.PI / 180) * flightTime);
  const maxY = Math.max(1, 1 + launchSpeed ** 2 * Math.sin(launchAngle * Math.PI / 180) ** 2 / (2 * 9.81));
  const path = Array.from({ length: 41 }, (_, index) => {
    const point = projectilePosition(launchSpeed, launchAngle, 9.81, flightTime * index / 40, 1);
    return `${index ? "L" : "M"} ${30 + point.x / maxX * 580} ${250 - point.y / maxY * 210}`;
  }).join(" ");
  const current = visualizations.find((item) => item.id === visualId)!;
  const searchExplanation = () => {
    if (!currentSearch) return t("Set a target to begin.");
    if (language !== "bn") return currentSearch.explanation;
    if (currentSearch.comparison === "found") return `লক্ষ্য ${target} মাঝের মান ${values[currentSearch.middle ?? 0]}-এর সমান; অনুসন্ধান সম্পন্ন।`;
    if (currentSearch.comparison === "not-found") return `অনুসন্ধানের পরিসর খালি, তাই ${target} তালিকায় নেই।`;
    const middleValue = values[currentSearch.middle ?? 0];
    return currentSearch.comparison === "low"
      ? `${middleValue} লক্ষ্য ${target}-এর চেয়ে ছোট; এই মান এবং এর বামের সব মান বাদ দিন।`
      : `${middleValue} লক্ষ্য ${target}-এর চেয়ে বড়; এই মান এবং এর ডানের সব মান বাদ দিন।`;
  };
  const sortExplanation = () => {
    if (language !== "bn") return currentSort.explanation;
    if (currentSort.left < 0) return t(currentSort.values.length > 1 ? "Start with the input array." : "The array is sorted in ascending order.");
    const compared = currentSort.explanation.match(/(-?\d+) (?:is greater than|is not greater than) (-?\d+)/);
    const left = compared?.[1] ?? currentSort.values[currentSort.left];
    const right = compared?.[2] ?? currentSort.values[currentSort.right];
    return currentSort.swapped ? `${left} বড় ${right}-এর চেয়ে; পাশের মান দুটি অদলবদল করুন।` : `${left} বড় নয় ${right}-এর চেয়ে; মান দুটি আগের জায়গায় রাখুন।`;
  };
  const recursionExplanation = () => {
    if (language !== "bn") return currentRecursion.explanation;
    if (currentRecursion.result !== null) return currentRecursion.stack.length ? `${currentRecursion.n}! ফেরত এসেছে; সংরক্ষিত মানের সঙ্গে গুণ করুন।` : `সব কল ফেরত এসেছে। চূড়ান্ত ফল ${currentRecursion.result}।`;
    return currentRecursion.n === 0 ? "ভিত্তি অবস্থা: 0! = 1, তাই কলগুলো ফেরত যেতে পারে।" : `factorial(${currentRecursion.n - 1}) কল শেষ হলে ${currentRecursion.n} দিয়ে গুণ হবে।`;
  };
  const stackExplanation = () => {
    if (language !== "bn") return stackTrace[step].action;
    return ["খালি স্ট্যাক দিয়ে শুরু করুন।", "শীর্ষে ১০ যোগ করুন।", "শীর্ষে ২০ যোগ করুন।", "শীর্ষে ৩০ যোগ করুন।", "শীর্ষের মান ৩০ বের করুন (শেষে ঢোকে, আগে বের হয়)।", "নতুন শীর্ষ মান ২০ পড়ুন।"][step];
  };

  useEffect(() => {
    fetch("/api/visual-progress", { cache: "no-store" }).then((response) => response.ok ? response.json() : Promise.reject(new Error(t("Progress could not be loaded."))))
      .then((payload: { progress: SavedProgress }) => { const progress = payload.progress ?? {}; setSaved(progress); setStep(Math.max(0, Math.min(searchSteps.length - 1, progress["binary-search"]?.step ?? 0))); }).catch((cause) => setError(cause instanceof Error ? cause.message : t("Progress could not be loaded."))).finally(() => setReady(true));
  // Load once for the authenticated learner. Language changes should not reset the stored position.
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setStep((old) => {
      if (old >= maxStep) { setPlaying(false); return old; }
      const next = old + 1;
      if (visualId === "projectile") setTime(flightTime * next / maxStep);
      return next;
    }), 1000 / speed);
    return () => window.clearInterval(timer);
  }, [playing, speed, maxStep, visualId, flightTime]);

  useEffect(() => {
    if (!ready) return;
    const completed = visualId === "binary-search" ? currentSearch?.comparison === "found" || currentSearch?.comparison === "not-found" : ["code-trace", "login-workflow", "sorting", "recursion", "dynamic-programming", "stack", "derivative", "integral"].includes(visualId) ? step === maxStep : visualId === "equation" ? step === 5 : time >= flightTime;
    setSaved((old) => ({ ...old, [visualId]: { step, completed } }));
    const timer = window.setTimeout(() => {
      fetch("/api/visual-progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visualId, step, completed }) })
        .then((response) => { if (!response.ok) throw new Error(); setSaved((old) => { const previous = old[visualId] ?? {}; return { ...old, [visualId]: { ...previous, step, completed, interactions: (previous.interactions ?? 0) + 1, stepsVisited: [...new Set([...(previous.stepsVisited ?? []), step])] } }; }); }).catch(() => setError(t("Progress could not be saved.")));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [visualId, step, ready, time]);

  function selectVisual(id: VisualId) {
    const limits: Record<VisualId, number> = { "binary-search": searchSteps.length - 1, sorting: sortSteps.length - 1, recursion: recursionSteps.length - 1, "dynamic-programming": fibValues.length - 1, stack: stackTrace.length - 1, derivative: 19, integral: 18, "code-trace": sumLoopTrace.length - 1, equation: 5, projectile: 100, "login-workflow": loginWorkflowSteps.length - 1 };
    const resumedStep = Math.max(0, Math.min(limits[id], saved[id]?.step ?? 0));
    setPlaying(false); setVisualId(id); setStep(resumedStep); setTime(id === "projectile" ? flightTime * resumedStep / 100 : 0); setPrediction(""); setAnswerMessage("");
  }
  function moveStep(next: number) {
    const safe = Math.max(0, Math.min(maxStep, next));
    setStep(safe);
    if (visualId === "projectile") setTime(flightTime * safe / 100);
  }
  async function checkPrediction() {
    const assessment = prediction.trim() === "60" ? "correct" : "incorrect";
    setAnswerMessage(t(assessment === "correct" ? "Correct: the three values sum to 60." : "Try again: follow each update to total."));
    try {
      const response = await fetch("/api/visual-progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visualId, step, completed: false, assessment }) });
      if (!response.ok) throw new Error();
      setSaved((old) => ({ ...old, [visualId]: { ...old[visualId], interactions: (old[visualId]?.interactions ?? 0) + 1, assessments: [...(old[visualId]?.assessments ?? []), { result: assessment, at: new Date().toISOString() }] } }));
    } catch { setError(t("Progress could not be saved.")); }
  }

  return (
    <section className="space-y-4" aria-labelledby="visual-engine-title">
      <header className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{t("Interactive visual learning")}</p>
        <h2 id="visual-engine-title" className="mt-1 text-xl font-semibold text-slate-900">{t("Explore how a concept works")}</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{t("Choose a worked example, connect the explanation to its visual state, then step through the changes. Code is traced with a fixed, reviewed example; arbitrary code is not executed.")}</p>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t("Visual examples")}>
          {visualizations.map((item) => <button key={item.id} type="button" aria-pressed={visualId === item.id} onClick={() => selectVisual(item.id)} className={`rounded-lg border px-3 py-2 text-sm font-medium ${visualId === item.id ? "border-blue-700 bg-blue-50 text-blue-900" : "border-slate-300 bg-white text-slate-700"}`}>{t(item.label)}</button>)}
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("Learning view")}>
          {(["combined", "text", "visual"] as const).map((item) => <button type="button" key={item} aria-pressed={mode === item} onClick={() => setMode(item)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${mode === item ? "bg-blue-700 text-white" : "border border-slate-300 text-slate-700"}`}>{t(item === "combined" ? "Text + visual" : item === "text" ? "Text only" : "Visual only")}</button>)}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("Animation controls")}>
          <button type="button" className="rounded-md border p-2 disabled:opacity-40" aria-label={t("Restart")} title={t("Restart")} onClick={() => { setPlaying(false); setStep(0); setTime(0); }}><RotateCcw size={16} /></button>
          <button type="button" className="rounded-md border p-2 disabled:opacity-40" aria-label={t("Step backward")} onClick={() => moveStep(step - 1)} disabled={step === 0}><StepBack size={16} /></button>
          <button type="button" className="rounded-md border p-2" aria-label={t(playing ? "Pause" : "Play")} onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
          <button type="button" className="rounded-md border p-2 disabled:opacity-40" aria-label={t("Step forward")} onClick={() => moveStep(step + 1)} disabled={step >= maxStep}><StepForward size={16} /></button>
          <label className="flex items-center gap-2 text-xs">{t("Speed")}<select value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="rounded-md border border-slate-300 p-1.5"><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select></label>
          <button type="button" className="rounded-md border p-2" title={t("Full screen")} aria-label={t("Full screen")} onClick={() => void visualRef.current?.requestFullscreen?.()}><Maximize2 size={16} /></button>
        </div>
      </div>

      <div className={`grid items-start gap-4 ${mode === "combined" ? "lg:grid-cols-2" : "grid-cols-1"}`}>
        {mode !== "visual" && <article className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div><h3 className="font-semibold text-slate-900">{t(current.label)}</h3><p className="mt-1 text-sm text-slate-600">{t(current.summary)}</p></div>
          {visualId === "binary-search" && <><p className="text-sm leading-6 text-slate-700">{t("Binary search works on sorted data. At each step it checks the middle value and removes the half that cannot contain the target.")}</p><div className="flex flex-wrap gap-2">{[["Check the middle value", 0], ["Discard half the range", Math.min(1, searchSteps.length - 1)], ["Reach the target", Math.max(0, searchSteps.length - 1)]].map(([label, index]) => <button key={String(label)} type="button" onClick={() => moveStep(Number(index))} className="rounded-md bg-blue-50 px-2 py-1 text-left text-xs text-blue-900 underline">{t(String(label))}</button>)}</div><details className="rounded-md bg-slate-50 p-3"><summary className="cursor-pointer text-xs font-semibold">{t("Pseudocode (select a line to inspect its visual step)")}</summary><div className="mt-2 space-y-1 font-mono text-xs">{["low = 0; high = n − 1", "while low ≤ high", "middle = floor((low + high) / 2)", "if values[middle] = target: found", "if values[middle] < target: low = middle + 1", "else: high = middle − 1"].map((line, index) => { const mappedStep = Math.min(index < 3 ? 0 : index === 4 ? Math.max(0, searchSteps.findIndex((item) => item.comparison === "low")) : index === 5 ? Math.max(0, searchSteps.findIndex((item) => item.comparison === "high")) : Math.max(0, searchSteps.findIndex((item) => item.comparison === "found")), searchSteps.length - 1); return <button type="button" key={line} onClick={() => moveStep(mappedStep)} className={`block w-full rounded px-2 py-1 text-left ${currentSearch && ((index === 4 && currentSearch.comparison === "low") || (index === 5 && currentSearch.comparison === "high") || (index === 3 && currentSearch.comparison === "found") || (index < 3 && currentSearch.comparison !== "found") ) ? "bg-blue-100" : ""}`}>{line}</button>; })}</div></details><label className="flex items-center gap-2 text-sm">{t("Target value")}<input type="number" value={target} onChange={(event) => { setTarget(Number(event.target.value)); setStep(0); }} className="w-24 rounded-md border px-2 py-1" /></label><p className="text-xs text-slate-500">{t("Sorted input")}: {values.join(", ")} · {t("Complexity")}: O(log n)</p></>}
          {visualId === "sorting" && <><p className="text-sm leading-6 text-slate-700">{t("Bubble sort repeatedly compares neighboring values and swaps them when they are out of order. The largest remaining value moves to the end of each pass.")}</p><label className="block text-sm">{t("Input values (five numbers)")}<div className="mt-1 flex flex-wrap gap-2">{sortValues.map((value, index) => <input key={index} aria-label={`${t("Value")} ${index + 1}`} type="number" min="0" max="30" value={value} onChange={(event) => setSortValues((old) => old.map((item, position) => position === index ? Math.max(0, Math.min(30, Number(event.target.value))) : item))} className="w-16 rounded-md border px-2 py-1" />)}</div></label><div className="flex gap-2">{[["Compare neighbors", 1], ["Watch a swap", Math.min(2, sortSteps.length - 1)], ["Reach sorted output", sortSteps.length - 1]].map(([label, index]) => <button key={String(label)} type="button" onClick={() => moveStep(Number(index))} className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-900 underline">{t(String(label))}</button>)}</div><p className="text-xs text-slate-500">{t("Complexity")}: O(n²) comparisons in the worst case · {t("Space")}: O(1)</p></>}
          {visualId === "recursion" && <><p className="text-sm leading-6 text-slate-700">{t("Factorial calls itself with a smaller input until it reaches the base case 0! = 1. Then the call stack returns values in reverse order.")}</p><label className="block text-sm">{t("Input n")}: {factorialInput}<input type="range" min="0" max="6" value={factorialInput} onChange={(event) => { setFactorialInput(Number(event.target.value)); setStep(0); }} className="block w-full" /></label><p className="text-xs text-slate-500">{t("Call stack")}: factorial(n) → factorial(n−1) → … → factorial(0)</p></>}
          {visualId === "dynamic-programming" && <><p className="text-sm leading-6 text-slate-700">{t("Fibonacci dynamic programming stores each result once and builds the next value from the two previous table entries.")}</p><label className="block text-sm">{t("Table size")}: {fibSize}<input type="range" min="2" max="12" value={fibSize} onChange={(event) => { setFibSize(Number(event.target.value)); setStep(0); }} className="block w-full" /></label><p className="text-xs text-slate-500">{t("Rule")}: F(n) = F(n−1) + F(n−2) · {t("Time")}: O(n) · {t("Space")}: O(n)</p></>}
          {visualId === "stack" && <p className="text-sm leading-6 text-slate-700">{t("A stack uses last in, first out order. Push adds to the top; pop removes from the top.")}</p>}
          {visualId === "derivative" && <><p className="text-sm leading-6 text-slate-700">{t("For f(x) = x² at x = 0.5, compare the average slope from x to x + h with the tangent slope. As h approaches zero, the secant slope approaches the derivative f′(0.5) = 1.")}</p><label className="block text-sm">h = {interval.toFixed(1)}<input type="range" min="0" max="19" value={step} onChange={(event) => setStep(Number(event.target.value))} className="block w-full" /></label><p className="text-xs text-slate-500">{t("Average slope")}: {slope.toFixed(2)} · {t("Tangent slope")}: 1</p></>}
          {visualId === "integral" && <><p className="text-sm leading-6 text-slate-700">{t("Approximate the area under f(x) = x² from 0 to 2 with midpoint rectangles. The exact integral is 8/3 square units.")}</p><label className="block text-sm">{t("Rectangles")}: {rectangles}<input type="range" min="0" max="18" value={step} onChange={(event) => setStep(Number(event.target.value))} className="block w-full" /></label><p className="text-xs text-slate-500">{t("Approximate area")}: {approximateArea.toFixed(4)} · {t("Exact area")}: 2.6667</p></>}
          {visualId === "code-trace" && <><p className="text-sm leading-6 text-slate-700">{t("Select a code line to inspect its trace. Each step shows the values read, the variable changed, and the next loop action.")}</p><pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-sm text-slate-100"><code>{["numbers = [10, 20, 30]", "total = 0", "", "for number in numbers:", "    total += number", "", "print(total)"].map((line, index) => <button type="button" key={index} onClick={() => { const position = sumLoopTrace.findIndex((item) => item.line === index + 1); if (position >= 0) moveStep(position); }} className={`block w-full whitespace-pre text-left ${currentCode.line === index + 1 ? "bg-blue-800 text-white" : "text-slate-200"}`} aria-current={currentCode.line === index + 1 ? "step" : undefined}>{String(index + 1).padStart(2, " ")}  {line || " "}</button>)}</code></pre><p className="text-xs text-amber-800">{t("This is a deterministic trace of the displayed example; the platform does not execute arbitrary code.")}</p><label className="flex items-center gap-2 text-sm">{t("Predict the output")}<input value={prediction} onChange={(event) => setPrediction(event.target.value)} className="w-28 rounded-md border px-2 py-1" inputMode="numeric" /><button type="button" className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => void checkPrediction()}>{t("Check")}</button></label>{answerMessage && <p role="status" className="text-sm">{answerMessage}</p>}</>}
          {visualId === "equation" && <><p className="text-sm leading-6 text-slate-700">{t("Solve 2x + 4 = 10 by applying the same reversible operation to both sides.")}</p><div className="space-y-2">{["Original equation", "Subtract 4 from both sides", "Simplify", "Divide both sides by 2", "Isolate x", "Verify in the original equation"].map((label, index) => <button type="button" key={label} onClick={() => moveStep(index)} className={`block w-full rounded-md px-3 py-2 text-left text-sm ${step === index ? "bg-blue-50 ring-1 ring-blue-500" : "bg-slate-50"}`}>{index + 1}. {t(label)}</button>)}</div><p className="text-xs text-slate-500">{t("Each operation is mirrored on both sides, preserving equality.")}</p></>}
          {visualId === "projectile" && <><p className="text-sm leading-6 text-slate-700">{t("This idealized model ignores air resistance and uses constant gravitational acceleration. Change the launch inputs to update the trajectory.")}</p><label className="block text-sm">{t("Initial speed")}: {launchSpeed} m/s<input type="range" min="8" max="40" value={launchSpeed} onChange={(event) => { setLaunchSpeed(Number(event.target.value)); setTime(0); setStep(0); }} className="block w-full" /></label><label className="block text-sm">{t("Launch angle")}: {launchAngle}°<input type="range" min="10" max="80" value={launchAngle} onChange={(event) => { setLaunchAngle(Number(event.target.value)); setTime(0); setStep(0); }} className="block w-full" /></label><p className="text-xs text-slate-500">{t("Flight time")}: {flightTime.toFixed(2)} s · {t("Range")}: {maxX.toFixed(1)} m · g = 9.81 m/s²</p></>}
          {visualId === "login-workflow" && <><p className="text-sm leading-6 text-slate-700">{t("Follow the request path and select a component to inspect its responsibility. This is a general architecture example; individual deployments may differ.")}</p><div className="flex flex-wrap gap-2">{loginWorkflowSteps.map((item, index) => <button type="button" key={index} onClick={() => moveStep(index)} className={`rounded-md px-2 py-1 text-xs ${index === step ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-900"}`}>{t(item.component)}</button>)}</div></>}
        </article>}

        {mode !== "text" && <section ref={visualRef} className="min-h-[360px] space-y-3 rounded-xl border border-slate-200 bg-white p-5" aria-label={t("Visualization state")}>
          <div className="flex items-center justify-between"><h3 className="font-semibold text-slate-900">{t("Live visualization")}</h3><span className="text-xs text-slate-500">{visualId === "projectile" ? `${time.toFixed(1)} s` : `${t("Step")} ${step + 1} / ${maxStep + 1}`}</span></div>
          {visualId === "binary-search" && <><div className="flex flex-wrap justify-center gap-2 py-12" role="list" aria-label={t("Sorted values")}>{values.map((value, index) => { const active = currentSearch && index >= currentSearch.low && index <= currentSearch.high; const middle = index === currentSearch?.middle; const found = middle && currentSearch?.comparison === "found"; return <div key={index} className={`grid h-14 w-14 place-items-center rounded-lg border-2 text-sm font-semibold transition-colors motion-reduce:transition-none ${found ? "border-emerald-600 bg-emerald-100" : middle ? "border-amber-500 bg-amber-100" : active ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-100 text-slate-400"}`} aria-label={`${t("Index")} ${index}: ${value}${middle ? `, ${t("middle")}` : ""}`}>{value}</div>; })}</div><p className="text-center text-sm font-medium">{searchExplanation()}</p><p className="text-center text-xs text-slate-500">{t("Current range")}: {currentSearch && currentSearch.low <= currentSearch.high ? `${currentSearch.low}–${currentSearch.high}` : t("empty")} · {t("Target")}: {target}</p></>}
          {visualId === "sorting" && <><div className="flex h-64 items-end justify-center gap-3 border-b border-l border-slate-400 px-4" role="img" aria-label={`${t("Array state")}: ${currentSort.values.join(", ")}`}>{currentSort.values.map((value, index) => <div key={`${index}-${value}`} className={`flex w-12 items-start justify-center rounded-t-md pt-2 text-sm font-semibold text-slate-900 transition-all motion-reduce:transition-none ${index === currentSort.left || index === currentSort.right ? currentSort.swapped ? "bg-amber-300" : "bg-blue-300" : "bg-emerald-300"}`} style={{ height: `${Math.max(12, value / 30 * 220)}px` }}>{value}</div>)}</div><p className="text-center text-sm">{sortExplanation()}</p><p className="text-center font-mono text-xs text-slate-600">{currentSort.values.join(" → ")}</p></>}
          {visualId === "recursion" && <><div className="flex min-h-52 flex-col-reverse justify-end gap-2 overflow-y-auto" aria-label={t("Recursive call stack")}>{currentRecursion.stack.map((value, index) => <div key={`${index}-${value}`} className="mx-auto w-3/4 rounded-md border border-blue-300 bg-blue-50 p-2 text-center font-mono text-sm">factorial({value})</div>)}{currentRecursion.stack.length === 0 && <p className="text-center text-sm text-slate-500">{t("Call stack is empty; all calls returned.")}</p>}</div><p className="text-center text-sm">{recursionExplanation()}</p><p className="text-center font-semibold">{currentRecursion.result === null ? t("Waiting for return") : `${t("Current result")}: ${currentRecursion.result}`}</p></>}
          {visualId === "dynamic-programming" && <><div className="grid grid-cols-4 gap-2 sm:grid-cols-6" aria-label={t("Fibonacci state table")}>{fibValues.map((value, index) => <button key={index} type="button" onClick={() => moveStep(index)} aria-current={index === step ? "step" : undefined} className={`rounded-lg border p-3 text-center ${index === step ? "border-blue-700 bg-blue-100" : index < step ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}><span className="block text-xs text-slate-500">F({index})</span><span className="font-mono font-semibold">{value}</span></button>)}</div><p className="text-sm">{step < 2 ? t("Base values: F(0) = 0 and F(1) = 1.") : `F(${step}) = F(${step - 1}) + F(${step - 2}) = ${fibValues[step - 1]} + ${fibValues[step - 2]} = ${fibValues[step]}`}</p><p className="text-xs text-slate-500">{t("Previously computed values are reused instead of recomputing recursive branches.")}</p></>}
          {visualId === "stack" && <><div className="flex min-h-64 flex-col-reverse items-center justify-start gap-2" aria-label={t("Stack state")}>{stackTrace[step].values.map((value, index) => <div key={index} className="w-40 rounded-md border border-blue-400 bg-blue-50 p-3 text-center font-mono">{value}{index === stackTrace[step].values.length - 1 ? ` · ${t("top")}` : ""}</div>)}{stackTrace[step].values.length === 0 && <p className="mt-20 text-sm text-slate-500">{t("Empty stack")}</p>}</div><p className="text-center text-sm">{stackExplanation()}</p></>}
          {visualId === "derivative" && <><svg viewBox="0 0 640 280" role="img" aria-label={t("Secant and tangent lines on f of x equals x squared")} className="w-full rounded-lg bg-sky-50"><path d="M 40 250 H 610 M 180 20 V 255" stroke="#94a3b8"/><path d={Array.from({ length: 81 }, (_, index) => { const x = -1 + index * 4 / 80; return `${index ? "L" : "M"} ${40 + (x + 1) / 4 * 560} ${250 - x * x / 9 * 210}`; }).join(" ")} fill="none" stroke="#2563eb" strokeWidth="3"/><line x1={40 + (0.5 + interval + 1) / 4 * 560} y1={250 - (0.5 + interval) ** 2 / 9 * 210} x2={40 + 1.5 / 4 * 560} y2={250 - 0.25 / 9 * 210} stroke="#ea580c" strokeWidth="3"/><line x1={40 + 1.5 / 4 * 560} y1={250 - 0.25 / 9 * 210} x2={40 + 3.5 / 4 * 560} y2={250 - 2.25 / 9 * 210} stroke="#16a34a" strokeWidth="3"/><line x1="40" y1="250" x2="610" y2="250" stroke="#64748b"/><circle cx={40 + 1.5 / 4 * 560} cy={250 - 0.25 / 9 * 210} r="6" fill="#ea580c"/></svg><p className="text-center text-sm">{t("Secant slope")}: {slope.toFixed(2)} → {t("Derivative")}: 1 at x = 0.5</p></>}
          {visualId === "integral" && <><svg viewBox="0 0 640 280" role="img" aria-label={t("Midpoint rectangle approximation under x squared")} className="w-full rounded-lg bg-sky-50"><path d="M 40 250 H 610 M 40 20 V 252" stroke="#94a3b8"/><path d={Array.from({ length: 81 }, (_, index) => { const x = index * 2 / 80; return `${index ? "L" : "M"} ${40 + x / 2 * 560} ${250 - x * x / 4 * 210}`; }).join(" ")} fill="none" stroke="#2563eb" strokeWidth="3"/>{Array.from({ length: rectangles }, (_, index) => { const width = 560 / rectangles; const midpoint = (index + 0.5) * 2 / rectangles; const height = midpoint ** 2 / 4 * 210; return <rect key={index} x={40 + index * width} y={250 - height} width={width} height={height} fill="#60a5fa66" stroke="#2563eb"/>; })}</svg><p className="text-center text-sm">{t("Midpoint sum")}: {approximateArea.toFixed(4)} · 8/3 ≈ 2.6667</p></>}
          {visualId === "code-trace" && <><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{Object.entries(currentCode.variables).map(([name, value]) => <p key={name}><span className="text-sky-300">{name}</span> = {value}</p>)}</div><div className="rounded-lg border bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-500">{t("Current operation")}</p><p className="mt-2 font-mono text-sm">{currentCode.statement}</p><p className="mt-2 text-sm">{t(currentCode.explanation)}</p>{currentCode.output && <p className="mt-2 rounded bg-emerald-100 p-2 font-mono">{t("Output")}: {currentCode.output}</p>}</div></div><p className="text-xs text-slate-500">{t("Reads")}: {currentCode.line === 5 ? "total, number" : currentCode.line === 4 ? "numbers" : currentCode.line === 7 ? "total" : t("shown variables")} · {t("Step")} {step + 1} / {sumLoopTrace.length}</p></>}
          {visualId === "equation" && <div className="grid min-h-64 place-content-center text-center"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{t(currentEquation.action)}</p><p className="my-6 font-mono text-2xl font-semibold text-slate-900 sm:text-3xl" aria-live="polite">{currentEquation.equation}</p><p className="max-w-lg text-sm text-slate-600">{t(currentEquation.why)}</p></div>}
          {visualId === "projectile" && <><svg viewBox="0 0 640 280" role="img" aria-label={t("Idealized projectile trajectory")} className="w-full rounded-lg bg-sky-50"><path d="M 28 250 H 620 M 30 20 V 252" stroke="#64748b" strokeWidth="2"/><path d={path} fill="none" stroke="#2563eb" strokeWidth="4"/><circle cx={30 + position.x / maxX * 580} cy={250 - position.y / maxY * 210} r="9" fill="#ea580c"/><text x="540" y="270" fill="#334155" fontSize="12">x (m)</text><text x="35" y="30" fill="#334155" fontSize="12">y (m)</text></svg><label className="block text-sm">{t("Simulation time")}: {time.toFixed(1)} s<input type="range" min="0" max={flightTime} step="0.05" value={Math.min(time, flightTime)} onChange={(event) => setTime(Number(event.target.value))} className="block w-full" /></label><p className="text-xs text-slate-600">x = {position.x.toFixed(1)} m · y = {position.y.toFixed(1)} m. {t("The curve updates from the ideal projectile equations.")}</p></>}
          {visualId === "login-workflow" && <><div className="grid gap-2 sm:grid-cols-3" aria-label={t("System components")}>{["User", "Frontend", "API", "Backend", "Database", "Authentication"].map((component) => { const active = loginWorkflowSteps[step].component === component; const visited = loginWorkflowSteps.slice(0, step + 1).some((item) => item.component === component); return <button key={component} type="button" onClick={() => { const index = loginWorkflowSteps.findIndex((item) => item.component === component); moveStep(index); }} className={`rounded-lg border p-3 text-sm font-semibold ${active ? "border-blue-700 bg-blue-100 text-blue-950" : visited ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>{t(component)}</button>; })}</div><div className="rounded-lg bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-500">{t("Step")} {step + 1}: {t(loginWorkflowSteps[step].action)}</p><p className="mt-2 text-sm">{t(loginWorkflowSteps[step].explanation)}</p><p className="mt-2 text-xs text-slate-500">{t("Next")} → {t(loginWorkflowSteps[Math.min(step + 1, maxStep)].component)}</p></div></>}
          <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={showExplanation} onChange={(event) => setShowExplanation(event.target.checked)} />{t("Show explanation")}</label>
          {showExplanation && <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-950" aria-live="polite">{visualId === "binary-search" ? searchExplanation() : visualId === "sorting" ? sortExplanation() : visualId === "recursion" ? recursionExplanation() : visualId === "dynamic-programming" ? t("The highlighted table entry is the current subproblem result.") : visualId === "stack" ? stackExplanation() : visualId === "derivative" ? t("The orange secant line approaches the tangent as h shrinks.") : visualId === "integral" ? t("More midpoint rectangles generally improve this approximation for the smooth curve shown.") : t(visualId === "code-trace" ? currentCode.explanation : visualId === "equation" ? currentEquation.why : visualId === "login-workflow" ? loginWorkflowSteps[step].explanation : "Gravity changes vertical velocity while horizontal velocity stays constant in this ideal model.")}</p>}
          {error && <p role="status" className="text-xs text-amber-800">{error}</p>}
        </section>}
      </div>
      {ready && saved[visualId]?.completed && <p className="text-xs font-medium text-emerald-700">{t("This visualization is marked explored. Try the prediction question or change the inputs to continue learning.")}</p>}
      {ready && saved[visualId] && <p className="text-xs text-slate-500">{t("Progress record")}: {saved[visualId].stepsVisited?.length ?? 0} {t("steps visited")} · {saved[visualId].interactions ?? 0} {t("interactions")} · {Math.floor((saved[visualId].timeSpentSeconds ?? 0) / 60)} {t("minutes logged")} · {saved[visualId].assessments?.length ?? 0} {t("prediction attempts")}</p>}
    </section>
  );
}
