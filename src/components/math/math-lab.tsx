"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Markdown } from "@/components/markdown";
import { Plot } from "@/components/math/plot";
import {
  angleDegrees, bayesPosterior, classificationMetrics, cosineSimilarity, dot, gradientDescent, mean, median, norm,
  normalCdfApprox, normalPdf, roundTo, sigmoid, standardDeviation, variance
} from "@/lib/math/core";

const input = "mt-1 block min-h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm";
const fmt = (value: number | null, places = 4) => value === null || !Number.isFinite(value) ? "undefined" : String(roundTo(value, places));

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return (
    <label className="block text-xs font-medium text-slate-700">
      <span className="flex justify-between"><span>{label}</span><span className="font-mono">{value}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 w-full accent-blue-700" />
    </label>
  );
}

function Panel({ title, intuition, children }: { title: string; intuition: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{intuition}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function VectorsExplorer() {
  const [a, setA] = useState([3, 1]);
  const [b, setB] = useState([1, 2]);
  return (
    <Panel title="Vectors and similarity" intuition="Drag the sliders to change two vectors. The dot product grows when vectors point the same way; cosine similarity ignores length and keeps only direction.">
      <div className="grid gap-5 md:grid-cols-[1fr_1.3fr]">
        <div className="space-y-3">
          <Slider label="a₁" value={a[0]} min={-4} max={4} step={0.5} onChange={(value) => setA([value, a[1]])} />
          <Slider label="a₂" value={a[1]} min={-4} max={4} step={0.5} onChange={(value) => setA([a[0], value])} />
          <Slider label="b₁" value={b[0]} min={-4} max={4} step={0.5} onChange={(value) => setB([value, b[1]])} />
          <Slider label="b₂" value={b[1]} min={-4} max={4} step={0.5} onChange={(value) => setB([b[0], value])} />
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm" aria-live="polite">
            <dt className="text-slate-500">a · b</dt><dd className="font-mono">{a[0]}·{b[0]} + {a[1]}·{b[1]} = {fmt(dot(a, b))}</dd>
            <dt className="text-slate-500">‖a‖, ‖b‖</dt><dd className="font-mono">{fmt(norm(a))}, {fmt(norm(b))}</dd>
            <dt className="text-slate-500">cosine</dt><dd className="font-mono">{fmt(cosineSimilarity(a, b))}</dd>
            <dt className="text-slate-500">angle</dt><dd className="font-mono">{fmt(angleDegrees(a, b), 1)}°</dd>
          </dl>
          <p className="text-xs text-slate-500">Values are rounded to 4 decimal places. Cosine similarity is undefined when a vector has zero length.</p>
        </div>
        <Plot xRange={[-4.5, 4.5]} yRange={[-4.5, 4.5]} arrows={[{ x: a[0], y: a[1], color: "#1d4ed8", label: "a" }, { x: b[0], y: b[1], color: "#c2410c", label: "b" }]} label={`Vectors a = (${a.join(", ")}) and b = (${b.join(", ")}) drawn from the origin`} />
      </div>
    </Panel>
  );
}

const functions = {
  square: { label: "x²", f: (x: number) => x * x, d: (x: number) => 2 * x },
  cubic: { label: "x³ − 3x", f: (x: number) => x ** 3 - 3 * x, d: (x: number) => 3 * x * x - 3 },
  sigmoid: { label: "σ(x)", f: sigmoid, d: (x: number) => sigmoid(x) * (1 - sigmoid(x)) },
  sine: { label: "sin x", f: Math.sin, d: Math.cos }
};

function DerivativeExplorer() {
  const [name, setName] = useState<keyof typeof functions>("square");
  const [x0, setX0] = useState(1);
  const fn = functions[name];
  const slope = fn.d(x0);
  const y0 = fn.f(x0);
  return (
    <Panel title="Derivatives as slopes" intuition="The derivative at a point is the slope of the tangent line there: how fast the function is changing. Gradient descent uses this slope to choose a direction.">
      <div className="grid gap-5 md:grid-cols-[1fr_1.3fr]">
        <div className="space-y-3">
          <label className="block text-xs font-medium text-slate-700">Function
            <select className={input} value={name} onChange={(event) => setName(event.target.value as keyof typeof functions)}>
              {Object.entries(functions).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
            </select>
          </label>
          <Slider label="x₀" value={x0} min={-3} max={3} step={0.1} onChange={setX0} />
          <p className="text-sm" aria-live="polite">f({fmt(x0, 2)}) = <span className="font-mono">{fmt(y0)}</span>, f′({fmt(x0, 2)}) = <span className="font-mono">{fmt(slope)}</span></p>
          <p className="text-xs text-slate-500">The tangent line is y = f(x₀) + f′(x₀)(x − x₀). Derivatives here use exact formulas.</p>
        </div>
        <Plot xRange={[-3.5, 3.5]} yRange={[-4, 6]} curves={[{ f: fn.f, color: "#1d4ed8", label: fn.label }, { f: (x) => y0 + slope * (x - x0), color: "#c2410c", label: "tangent", dashed: true }]} points={[{ x: x0, y: y0, color: "#c2410c", label: `slope ${fmt(slope, 2)}` }]} label={`Graph of ${fn.label} with its tangent line at x = ${x0}`} />
      </div>
    </Panel>
  );
}

function GradientDescentExplorer() {
  const [rate, setRate] = useState(0.1);
  const [start, setStart] = useState(3);
  const [steps, setSteps] = useState(8);
  const path = useMemo(() => gradientDescent((x) => 2 * x, start, rate, steps), [rate, start, steps]);
  const diverged = !Number.isFinite(path.at(-1)!) || Math.abs(path.at(-1)!) > Math.abs(start) + 1e-9;
  return (
    <Panel title="Gradient descent" intuition="Minimize f(x) = x². Each step moves x ← x − η·f′(x). Try a learning rate above 1 to see the iterates overshoot and diverge.">
      <div className="grid gap-5 md:grid-cols-[1fr_1.3fr]">
        <div className="space-y-3">
          <Slider label="Learning rate η" value={rate} min={0.05} max={1.2} step={0.05} onChange={setRate} />
          <Slider label="Start x₀" value={start} min={-4} max={4} step={0.5} onChange={setStart} />
          <Slider label="Steps" value={steps} min={1} max={20} step={1} onChange={setSteps} />
          <p className={`text-sm font-medium ${diverged ? "text-amber-800" : "text-emerald-800"}`} aria-live="polite">{diverged ? "The iterates are moving away from the minimum (divergence)." : `After ${steps} steps, x ≈ ${fmt(path.at(-1)!)}.`}</p>
          <details className="text-xs"><summary className="cursor-pointer font-semibold text-slate-700">Iterates table</summary><ol className="mt-1 grid grid-cols-2 gap-x-3 font-mono" start={0}>{path.map((value, index) => <li key={index}>x{index} = {fmt(value)}</li>)}</ol></details>
        </div>
        <Plot xRange={[-4.5, 4.5]} yRange={[-1, 16]} curves={[{ f: (x) => x * x, color: "#1d4ed8", label: "f(x) = x²" }]} points={path.slice(0, 21).map((value, index) => ({ x: Math.max(-4.4, Math.min(4.4, value)), y: value * value, color: index === 0 ? "#c2410c" : "#0f766e", label: index === 0 ? "start" : undefined }))} label={`Gradient descent iterates on x squared with learning rate ${rate}`} />
      </div>
    </Panel>
  );
}

function BayesExplorer() {
  const [prior, setPrior] = useState(0.01);
  const [sensitivity, setSensitivity] = useState(0.99);
  const [fpr, setFpr] = useState(0.05);
  const posterior = bayesPosterior(prior, sensitivity, fpr);
  const population = 10_000;
  const sick = prior * population;
  return (
    <Panel title="Bayes' theorem" intuition="Natural frequencies make Bayes intuitive: imagine 10,000 people and count who tests positive.">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <Slider label="Prevalence P(D)" value={prior} min={0.001} max={0.5} step={0.001} onChange={setPrior} />
          <Slider label="Sensitivity P(+|D)" value={sensitivity} min={0.5} max={1} step={0.01} onChange={setSensitivity} />
          <Slider label="False-positive rate P(+|¬D)" value={fpr} min={0} max={0.5} step={0.01} onChange={setFpr} />
        </div>
        <div className="space-y-2 text-sm" aria-live="polite">
          <p>Of {population.toLocaleString()} people, about <strong>{fmt(sick, 1)}</strong> have the condition and <strong>{fmt(sick * sensitivity, 1)}</strong> of them test positive.</p>
          <p>Of the {fmt(population - sick, 1)} without it, <strong>{fmt((population - sick) * fpr, 1)}</strong> test positive anyway.</p>
          <p className="rounded-lg bg-blue-50 p-3">P(D | +) = {fmt(sick * sensitivity, 1)} / ({fmt(sick * sensitivity, 1)} + {fmt((population - sick) * fpr, 1)}) ≈ <strong className="font-mono">{fmt(posterior)}</strong></p>
        </div>
      </div>
    </Panel>
  );
}

function NormalExplorer() {
  const [mu, setMu] = useState(0);
  const [sigma, setSigma] = useState(1);
  const [a, setA] = useState(-1);
  const [b, setB] = useState(1);
  const low = Math.min(a, b);
  const high = Math.max(a, b);
  const probability = normalCdfApprox(high, mu, sigma) - normalCdfApprox(low, mu, sigma);
  return (
    <Panel title="The normal distribution" intuition="Change the mean and standard deviation, then find the probability of landing between two values (the area under the curve).">
      <div className="grid gap-5 md:grid-cols-[1fr_1.3fr]">
        <div className="space-y-3">
          <Slider label="Mean μ" value={mu} min={-2} max={2} step={0.1} onChange={setMu} />
          <Slider label="Standard deviation σ" value={sigma} min={0.3} max={2.5} step={0.1} onChange={setSigma} />
          <Slider label="a" value={a} min={-4} max={4} step={0.1} onChange={setA} />
          <Slider label="b" value={b} min={-4} max={4} step={0.1} onChange={setB} />
          <p className="text-sm" aria-live="polite">P({fmt(low, 1)} &lt; X &lt; {fmt(high, 1)}) ≈ <span className="font-mono">{fmt(probability)}</span></p>
          <p className="text-xs text-slate-500">Computed with a numerical approximation of the error function (absolute error below 1.5 × 10⁻⁷), not an exact closed form.</p>
        </div>
        <Plot xRange={[-4.5, 4.5]} yRange={[0, Math.max(0.5, normalPdf(mu, mu, sigma) * 1.15)]} curves={[{ f: (x) => normalPdf(x, mu, sigma), color: "#1d4ed8", label: `N(${mu}, ${sigma}²)` }]} points={[{ x: low, y: 0, color: "#c2410c", label: "a" }, { x: high, y: 0, color: "#c2410c", label: "b" }]} label={`Normal density with mean ${mu} and standard deviation ${sigma}`} />
      </div>
    </Panel>
  );
}

function StatsExplorer() {
  const [text, setText] = useState("2, 4, 4, 4, 5, 5, 7, 9");
  const values = text.split(/[,\s]+/).map(Number).filter((value) => text.trim() !== "" && Number.isFinite(value));
  const valid = values.length > 0;
  return (
    <Panel title="Descriptive statistics" intuition="Enter numbers to see measures of centre and spread. The sample variance divides by n − 1; the population variance divides by n.">
      <label className="block text-xs font-medium text-slate-700">Values (comma or space separated)<input className={input} value={text} onChange={(event) => setText(event.target.value)} /></label>
      {valid ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4" aria-live="polite">
          <dt className="text-slate-500">n</dt><dd className="font-mono">{values.length}</dd>
          <dt className="text-slate-500">mean</dt><dd className="font-mono">{fmt(mean(values))}</dd>
          <dt className="text-slate-500">median</dt><dd className="font-mono">{fmt(median(values))}</dd>
          <dt className="text-slate-500">population variance</dt><dd className="font-mono">{fmt(variance(values))}</dd>
          <dt className="text-slate-500">sample variance</dt><dd className="font-mono">{fmt(variance(values, true))}</dd>
          <dt className="text-slate-500">population SD</dt><dd className="font-mono">{fmt(standardDeviation(values))}</dd>
          <dt className="text-slate-500">sample SD</dt><dd className="font-mono">{fmt(standardDeviation(values, true))}</dd>
        </dl>
      ) : <p role="alert" className="mt-2 text-sm text-amber-800">Enter at least one number.</p>}
    </Panel>
  );
}

function MetricsExplorer() {
  const [counts, setCounts] = useState({ tp: 40, fp: 10, fn: 20, tn: 930 });
  const metrics = classificationMetrics(counts);
  return (
    <Panel title="Evaluation metrics" intuition="Change the confusion matrix and watch how accuracy can stay high while recall falls on an imbalanced dataset.">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          {(["tp", "fp", "fn", "tn"] as const).map((key) => (
            <label key={key} className="block text-xs font-medium text-slate-700">{key.toUpperCase()}<input type="number" min={0} step={1} className={input} value={counts[key]} onChange={(event) => setCounts({ ...counts, [key]: Math.max(0, Math.floor(Number(event.target.value) || 0)) })} /></label>
          ))}
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm" aria-live="polite">
          <dt className="text-slate-500">precision</dt><dd className="font-mono">{fmt(metrics.precision)}</dd>
          <dt className="text-slate-500">recall</dt><dd className="font-mono">{fmt(metrics.recall)}</dd>
          <dt className="text-slate-500">F1</dt><dd className="font-mono">{fmt(metrics.f1)}</dd>
          <dt className="text-slate-500">accuracy</dt><dd className="font-mono">{fmt(metrics.accuracy)}</dd>
          <dt className="text-slate-500">specificity</dt><dd className="font-mono">{fmt(metrics.specificity)}</dd>
        </dl>
      </div>
      <p className="mt-2 text-xs text-slate-500">A metric is shown as “undefined” when its denominator is zero, rather than as 0.</p>
    </Panel>
  );
}

type ProblemSummary = { id: string; title: string; concept: string; level: string; commonMistakes: string[] };
type ActiveProblem = { problemId: string; variant: number; title: string; level: string; prompt: string; answerFormat: string; hints: string[] };
type CheckResult = { correct: boolean; expected: number; exact: string | null; steps: string[]; commonMistakes: string[]; note: string | null };

function Practice() {
  const [catalogue, setCatalogue] = useState<ProblemSummary[]>([]);
  const [attempts, setAttempts] = useState<{ itemId: string; correct: boolean; kind: string }[]>([]);
  const [level, setLevel] = useState("beginner");
  const [problem, setProblem] = useState<ActiveProblem | null>(null);
  const [answer, setAnswer] = useState("");
  const [work, setWork] = useState("");
  const [hints, setHints] = useState(0);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/practice", { cache: "no-store" }).then((response) => response.json()).then((value: { problems: ProblemSummary[]; attempts: typeof attempts }) => { setCatalogue(value.problems); setAttempts(value.attempts); }).catch(() => setError("Practice problems are unavailable."));
  }, []);

  async function load(problemId: string) {
    setError("");
    setResult(null);
    setAnswer("");
    setWork("");
    setHints(0);
    const response = await fetch(`/api/practice?problem=${encodeURIComponent(problemId)}`, { cache: "no-store" });
    if (!response.ok) { setError("The problem could not be generated."); return; }
    setProblem(await response.json() as ActiveProblem);
  }

  async function check(event: FormEvent) {
    event.preventDefault();
    if (!problem) return;
    setError("");
    const response = await fetch("/api/practice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "math", problemId: problem.problemId, variant: problem.variant, answer, work }) });
    const payload = await response.json() as CheckResult & { error?: string };
    if (!response.ok) { setError(payload.error ?? "The answer was not checked."); return; }
    setResult(payload);
    setAttempts((current) => [...current, { itemId: problem.problemId, correct: payload.correct, kind: "math" }]);
  }

  const stats = (id: string) => {
    const mine = attempts.filter((item) => item.kind === "math" && item.itemId === id);
    return mine.length ? `${mine.filter((item) => item.correct).length}/${mine.length} correct` : "not attempted";
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="practice-heading">
      <h2 id="practice-heading" className="text-lg font-semibold text-slate-900">Practice problems</h2>
      <p className="mt-1 text-sm text-slate-600">Each problem is generated with new numbers. Show your work, check your answer on the server, then compare with the step-by-step solution.</p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Level">
        {["beginner", "intermediate", "advanced"].map((item) => <button key={item} type="button" aria-pressed={level === item} onClick={() => setLevel(item)} className={`min-h-9 rounded-lg border px-3 text-xs font-semibold ${level === item ? "border-blue-700 bg-blue-50 text-blue-900" : "border-slate-300 text-slate-700"}`}>{item}</button>)}
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {catalogue.filter((item) => item.level === level).map((item) => (
          <li key={item.id}><button type="button" onClick={() => void load(item.id)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm"><span className="font-medium text-slate-900">{item.title}</span><span className="block text-xs text-slate-500">{item.concept} · {stats(item.id)}</span></button></li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      {problem && (
        <form onSubmit={check} className="mt-5 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{problem.title} · {problem.level}</p>
          <Markdown>{problem.prompt}</Markdown>
          <p className="text-xs text-slate-600">Answer format: {problem.answerFormat}. Fractions like 1/6 and percentages like 16.7% are accepted.</p>
          <label className="block text-xs font-medium text-slate-700">Your working (saved with the attempt)<textarea rows={3} className={`${input} py-2 font-mono`} value={work} onChange={(event) => setWork(event.target.value)} /></label>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-medium text-slate-700">Answer<input className={`${input} w-40`} value={answer} onChange={(event) => setAnswer(event.target.value)} required inputMode="decimal" disabled={Boolean(result)} /></label>
            {!result && <button type="submit" className="min-h-9 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white">Check</button>}
            {!result && hints < problem.hints.length && <button type="button" className="min-h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800" onClick={() => setHints((value) => value + 1)}>Hint</button>}
            <button type="button" className="min-h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800" onClick={() => void load(problem.problemId)}>New numbers</button>
          </div>
          {problem.hints.slice(0, hints).map((hint) => <p key={hint} className="text-sm text-slate-700">Hint: {hint}</p>)}
          {result && (
            <div className={`rounded-lg border p-3 text-sm ${result.correct ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`} role="status">
              <p className="font-semibold">{result.correct ? "Correct." : "Not yet."} {result.note}</p>
              <p className="mt-1">Expected ≈ <span className="font-mono">{fmt(result.expected)}</span>{result.exact ? ` (exact: ${result.exact})` : ""}</p>
              <p className="mt-2 font-semibold">Worked solution</p>
              <ol className="list-decimal space-y-1 pl-5">{result.steps.map((step) => <li key={step}>{step}</li>)}</ol>
              {work && <><p className="mt-2 font-semibold">Your working</p><pre className="whitespace-pre-wrap font-mono text-xs">{work}</pre></>}
              {result.commonMistakes.length > 0 && <><p className="mt-2 font-semibold">Common mistakes to check</p><ul className="list-disc pl-5">{result.commonMistakes.map((item) => <li key={item}>{item}</li>)}</ul></>}
            </div>
          )}
        </form>
      )}
    </section>
  );
}

const sections = [
  { id: "practice", label: "Practice", component: Practice },
  { id: "vectors", label: "Vectors", component: VectorsExplorer },
  { id: "derivatives", label: "Derivatives", component: DerivativeExplorer },
  { id: "gradient-descent", label: "Gradient descent", component: GradientDescentExplorer },
  { id: "bayes", label: "Probability", component: BayesExplorer },
  { id: "normal", label: "Distributions", component: NormalExplorer },
  { id: "statistics", label: "Statistics", component: StatsExplorer },
  { id: "metrics", label: "Metrics", component: MetricsExplorer }
];

export function MathLab() {
  const [active, setActive] = useState("practice");
  const Section = sections.find((section) => section.id === active)?.component ?? Practice;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Mathematics topics">
        {sections.map((section) => (
          <button key={section.id} type="button" role="tab" aria-selected={active === section.id} onClick={() => setActive(section.id)}
            className={`min-h-9 rounded-lg border px-3 text-xs font-semibold ${active === section.id ? "border-blue-700 bg-blue-50 text-blue-900" : "border-slate-300 bg-white text-slate-700"}`}>{section.label}</button>
        ))}
      </div>
      <div role="tabpanel"><Section /></div>
    </div>
  );
}
