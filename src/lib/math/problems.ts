import { seededRandom } from "@/lib/diagrams";
import {
  bayesPosterior, binaryCrossEntropy, classificationMetrics, cosineSimilarity, dot, matMul, mean, norm, roundTo,
  sigmoid, softmax, variance
} from "@/lib/math/core";

/**
 * Parameterized practice problems. A problem is fully determined by (id, variant),
 * so the server can regenerate it to grade an answer without trusting the browser.
 */
export type ProblemLevel = "beginner" | "intermediate" | "advanced";

export type GeneratedProblem = {
  problemId: string;
  variant: number;
  prompt: string;
  answer: number;
  tolerance: number;
  /** How to present the answer, e.g. "to 4 decimal places". */
  answerFormat: string;
  hints: string[];
  steps: string[];
  exact?: string;
};

export type ProblemDefinition = {
  id: string;
  title: string;
  concept: "vectors" | "matrices" | "calculus" | "optimization" | "probability" | "statistics" | "metrics" | "neural-networks";
  level: ProblemLevel;
  topicId: string;
  commonMistakes: string[];
  generate: (variant: number) => GeneratedProblem;
};

function ints(random: () => number, count: number, min: number, max: number): number[] {
  return Array.from({ length: count }, () => min + Math.floor(random() * (max - min + 1)));
}
const fmt = (value: number, places = 4) => String(roundTo(value, places));
const vec = (values: number[]) => `[${values.join(", ")}]`;

export const problems: ProblemDefinition[] = [
  {
    id: "dot-product", title: "Dot product", concept: "vectors", level: "beginner", topicId: "workbook-LRN-003",
    commonMistakes: ["Adding instead of multiplying matching elements", "Dropping the sign of negative products"],
    generate(variant) {
      const random = seededRandom(variant + 101);
      const a = ints(random, 3, -5, 5);
      const b = ints(random, 3, -5, 5);
      const products = a.map((value, index) => value * b[index]);
      return {
        problemId: this.id, variant, prompt: `Compute $\\mathbf{a}\\cdot\\mathbf{b}$ for $\\mathbf{a} = ${vec(a)}$ and $\\mathbf{b} = ${vec(b)}$.`,
        answer: dot(a, b), tolerance: 0, answerFormat: "an exact integer", hints: ["Multiply matching elements, then add the three products."],
        steps: [`Products: ${products.map((value, index) => `${a[index]}·${b[index]} = ${value}`).join(", ")}`, `Sum: ${products.join(" + ").replace(/\+ -/g, "− ")} = ${dot(a, b)}`]
      };
    }
  },
  {
    id: "vector-norm", title: "Vector length (L2 norm)", concept: "vectors", level: "beginner", topicId: "workbook-LRN-003",
    commonMistakes: ["Forgetting the square root", "Summing absolute values (that is the L1 norm)"],
    generate(variant) {
      const random = seededRandom(variant + 202);
      const a = ints(random, 3, -6, 6);
      const squares = a.map((value) => value * value);
      const total = squares.reduce((sum, value) => sum + value, 0);
      return {
        problemId: this.id, variant, prompt: `Compute $\\lVert ${vec(a)} \\rVert$ to 2 decimal places.`,
        answer: norm(a), tolerance: 0.005, answerFormat: "2 decimal places", exact: `√${total}`, hints: ["Square each element, add, then take the square root."],
        steps: [`Squares: ${squares.join(", ")}`, `Sum: ${total}`, `√${total} ≈ ${fmt(norm(a), 4)} (exact: √${total})`]
      };
    }
  },
  {
    id: "cosine-similarity", title: "Cosine similarity", concept: "vectors", level: "intermediate", topicId: "workbook-LRN-013",
    commonMistakes: ["Dividing by the sum of lengths instead of the product", "Using the dot product alone as similarity"],
    generate(variant) {
      const random = seededRandom(variant + 303);
      let a = ints(random, 2, -4, 5);
      let b = ints(random, 2, -4, 5);
      if (norm(a) === 0) a = [1, 2];
      if (norm(b) === 0) b = [2, 1];
      const value = cosineSimilarity(a, b)!;
      return {
        problemId: this.id, variant, prompt: `Compute the cosine similarity of $${vec(a)}$ and $${vec(b)}$ to 3 decimal places.`,
        answer: value, tolerance: 0.0005, answerFormat: "3 decimal places", hints: ["cos θ = (a·b) / (‖a‖‖b‖)."],
        steps: [`a·b = ${dot(a, b)}`, `‖a‖ = ${fmt(norm(a))}, ‖b‖ = ${fmt(norm(b))}`, `${dot(a, b)} / (${fmt(norm(a))} × ${fmt(norm(b))}) ≈ ${fmt(value, 4)}`]
      };
    }
  },
  {
    id: "matrix-entry", title: "Matrix multiplication entry", concept: "matrices", level: "intermediate", topicId: "workbook-LRN-003",
    commonMistakes: ["Multiplying row by row instead of row by column", "Multiplying element-wise"],
    generate(variant) {
      const random = seededRandom(variant + 404);
      const a = [ints(random, 2, -3, 4), ints(random, 2, -3, 4)];
      const b = [ints(random, 2, -3, 4), ints(random, 2, -3, 4)];
      const row = Math.floor(random() * 2);
      const column = Math.floor(random() * 2);
      const product = matMul(a, b);
      const show = (m: number[][]) => `\\begin{bmatrix} ${m.map((r) => r.join(" & ")).join(" \\\\ ")} \\end{bmatrix}`;
      return {
        problemId: this.id, variant, prompt: `For $A = ${show(a)}$ and $B = ${show(b)}$, what is entry (row ${row + 1}, column ${column + 1}) of $AB$?`,
        answer: product[row][column], tolerance: 0, answerFormat: "an exact integer", hints: [`Take row ${row + 1} of A and column ${column + 1} of B, and compute their dot product.`],
        steps: [`Row ${row + 1} of A: ${vec(a[row])}`, `Column ${column + 1} of B: ${vec(b.map((r) => r[column]))}`, `${a[row][0]}·${b[0][column]} + ${a[row][1]}·${b[1][column]} = ${product[row][column]}`]
      };
    }
  },
  {
    id: "polynomial-derivative", title: "Derivative of a quadratic", concept: "calculus", level: "beginner", topicId: "workbook-LRN-005",
    commonMistakes: ["Forgetting that the derivative of a constant is 0", "Not multiplying by the exponent"],
    generate(variant) {
      const random = seededRandom(variant + 505);
      const [a, b, c, x] = ints(random, 4, -5, 5);
      const answer = 2 * a * x + b;
      return {
        problemId: this.id, variant, prompt: `For $f(x) = ${a}x^2 + ${b}x + ${c}$, compute $f'(${x})$.`.replace(/\+ -/g, "- "),
        answer, tolerance: 0, answerFormat: "an exact integer", hints: ["The derivative of ax² + bx + c is 2ax + b."],
        steps: [`f'(x) = ${2 * a}x + ${b}`, `f'(${x}) = ${2 * a}·${x} + ${b} = ${answer}`]
      };
    }
  },
  {
    id: "gradient-descent", title: "Gradient descent steps", concept: "optimization", level: "intermediate", topicId: "workbook-LRN-005",
    commonMistakes: ["Adding the gradient instead of subtracting it", "Using the learning rate only once across several steps"],
    generate(variant) {
      const random = seededRandom(variant + 606);
      const m = ints(random, 1, -3, 3)[0];
      const x0 = m + ints(random, 1, 2, 5)[0];
      const rates = [0.1, 0.2, 0.25];
      const eta = rates[Math.floor(random() * rates.length)];
      const steps = 2;
      let x = x0;
      const lines: string[] = [];
      for (let step = 0; step < steps; step += 1) {
        const gradient = 2 * (x - m);
        const next = x - eta * gradient;
        lines.push(`x${step + 1} = ${fmt(x)} − ${eta}·${fmt(gradient)} = ${fmt(next)}`);
        x = next;
      }
      return {
        problemId: this.id, variant, prompt: `Minimize $f(x) = (x - ${m})^2$ with gradient descent, starting at $x_0 = ${x0}$ with learning rate $\\eta = ${eta}$. What is $x_2$? Give 4 decimal places.`.replace("- -", "+ "),
        answer: x, tolerance: 0.00005, answerFormat: "4 decimal places", hints: [`f'(x) = 2(x − ${m}).`, "Apply x ← x − η f'(x) twice."],
        steps: [`f'(x) = 2(x − ${m})`, ...lines]
      };
    }
  },
  {
    id: "bayes", title: "Bayes' theorem", concept: "probability", level: "intermediate", topicId: "workbook-LRN-004",
    commonMistakes: ["Reporting the sensitivity P(+|D) as P(D|+)", "Ignoring false positives from the larger negative group"],
    generate(variant) {
      const random = seededRandom(variant + 707);
      const prior = [0.01, 0.02, 0.05, 0.1][Math.floor(random() * 4)];
      const sensitivity = [0.9, 0.95, 0.99][Math.floor(random() * 3)];
      const fpr = [0.02, 0.05, 0.1][Math.floor(random() * 3)];
      const posterior = bayesPosterior(prior, sensitivity, fpr)!;
      return {
        problemId: this.id, variant, prompt: `A condition has prevalence ${prior}. A test has sensitivity ${sensitivity} and false-positive rate ${fpr}. What is $P(\\text{condition} \\mid +)$ to 3 decimal places?`,
        answer: posterior, tolerance: 0.0005, answerFormat: "3 decimal places", hints: ["P(+) = sensitivity·prior + FPR·(1 − prior)."],
        steps: [`Numerator: ${sensitivity}·${prior} = ${fmt(sensitivity * prior, 6)}`, `P(+) = ${fmt(sensitivity * prior, 6)} + ${fpr}·${fmt(1 - prior)} = ${fmt(sensitivity * prior + fpr * (1 - prior), 6)}`, `Posterior ≈ ${fmt(posterior, 4)}`]
      };
    }
  },
  {
    id: "sample-variance", title: "Sample variance", concept: "statistics", level: "beginner", topicId: "workbook-LRN-004",
    commonMistakes: ["Dividing by n instead of n − 1 for a sample", "Forgetting to square deviations"],
    generate(variant) {
      const random = seededRandom(variant + 808);
      const values = ints(random, 5, 1, 12);
      const m = mean(values);
      const result = variance(values, true)!;
      return {
        problemId: this.id, variant, prompt: `Compute the **sample** variance of ${values.join(", ")} to 2 decimal places.`,
        answer: result, tolerance: 0.005, answerFormat: "2 decimal places", hints: ["Subtract the mean, square, add, and divide by n − 1 = 4."],
        steps: [`Mean = ${fmt(m)}`, `Squared deviations: ${values.map((value) => fmt((value - m) ** 2)).join(", ")}`, `Sum / 4 = ${fmt(result)}`]
      };
    }
  },
  {
    id: "f1-score", title: "Precision, recall, and F1", concept: "metrics", level: "beginner", topicId: "workbook-LRN-010",
    commonMistakes: ["Swapping FP and FN", "Taking the arithmetic mean instead of the harmonic mean"],
    generate(variant) {
      const random = seededRandom(variant + 909);
      const [tp, fp, fn] = [ints(random, 1, 10, 60)[0], ints(random, 1, 1, 30)[0], ints(random, 1, 1, 30)[0]];
      const metrics = classificationMetrics({ tp, fp, fn, tn: 100 });
      return {
        problemId: this.id, variant, prompt: `TP = ${tp}, FP = ${fp}, FN = ${fn}. Compute the F1 score to 3 decimal places.`,
        answer: metrics.f1!, tolerance: 0.0005, answerFormat: "3 decimal places", hints: ["Compute precision and recall first.", "F1 = 2PR / (P + R)."],
        steps: [`Precision = ${tp}/(${tp}+${fp}) = ${fmt(metrics.precision!)}`, `Recall = ${tp}/(${tp}+${fn}) = ${fmt(metrics.recall!)}`, `F1 = ${fmt(metrics.f1!)}`]
      };
    }
  },
  {
    id: "sigmoid", title: "Sigmoid activation", concept: "neural-networks", level: "beginner", topicId: "topic-3",
    commonMistakes: ["Using e^z instead of e^−z", "Forgetting the bias in z"],
    generate(variant) {
      const random = seededRandom(variant + 1001);
      const w = ints(random, 2, -3, 3);
      const x = ints(random, 2, -2, 3);
      const b = ints(random, 1, -2, 2)[0];
      const z = dot(w, x) + b;
      return {
        problemId: this.id, variant, prompt: `A neuron has weights $${vec(w)}$, bias ${b}, and input $${vec(x)}$. Compute $\\sigma(z)$ to 4 decimal places.`,
        answer: sigmoid(z), tolerance: 0.00005, answerFormat: "4 decimal places", hints: ["z = w·x + b.", "σ(z) = 1 / (1 + e^(−z))."],
        steps: [`z = ${dot(w, x)} + ${b} = ${z}`, `σ(${z}) = 1 / (1 + e^(${-z})) ≈ ${fmt(sigmoid(z))}`]
      };
    }
  },
  {
    id: "softmax", title: "Softmax weight", concept: "neural-networks", level: "advanced", topicId: "workbook-LRN-015",
    commonMistakes: ["Normalizing raw scores instead of their exponentials", "Forgetting that weights sum to 1"],
    generate(variant) {
      const random = seededRandom(variant + 1102);
      const scores = ints(random, 3, -2, 3);
      const weights = softmax(scores);
      return {
        problemId: this.id, variant, prompt: `Compute the softmax weight of the **first** score in $${vec(scores)}$ to 4 decimal places.`,
        answer: weights[0], tolerance: 0.00005, answerFormat: "4 decimal places", hints: ["softmax(s)_i = e^{s_i} / Σ_j e^{s_j}."],
        steps: [`Exponentials: ${scores.map((score) => `e^${score} ≈ ${fmt(Math.exp(score))}`).join(", ")}`, `Sum ≈ ${fmt(scores.reduce((sum, score) => sum + Math.exp(score), 0))}`, `Weight ≈ ${fmt(weights[0])}`]
      };
    }
  },
  {
    id: "log-loss", title: "Binary cross-entropy", concept: "neural-networks", level: "advanced", topicId: "workbook-LRN-005",
    commonMistakes: ["Using log base 10 instead of the natural log", "Using p when the label is 0 (use 1 − p)"],
    generate(variant) {
      const random = seededRandom(variant + 1203);
      const p = [0.1, 0.2, 0.3, 0.6, 0.7, 0.8, 0.9][Math.floor(random() * 7)];
      const y = random() < 0.5 ? 0 : 1;
      const loss = binaryCrossEntropy(p, y);
      return {
        problemId: this.id, variant, prompt: `A model predicts $p = ${p}$ for the positive class and the true label is $y = ${y}$. Compute the binary cross-entropy (natural log) to 4 decimal places.`,
        answer: loss, tolerance: 0.00005, answerFormat: "4 decimal places", hints: ["L = −[y ln p + (1 − y) ln(1 − p)]."],
        steps: [y === 1 ? `y = 1, so L = −ln(${p})` : `y = 0, so L = −ln(1 − ${p}) = −ln(${roundTo(1 - p, 2)})`, `L ≈ ${fmt(loss)}`]
      };
    }
  },
  {
    id: "sigmoid-chain-rule", title: "Chain rule through a sigmoid", concept: "calculus", level: "advanced", topicId: "topic-3",
    commonMistakes: ["Forgetting the inner derivative w", "Using σ(z) instead of σ(z)(1 − σ(z))"],
    generate(variant) {
      const random = seededRandom(variant + 1304);
      const [w, b, x] = ints(random, 3, -2, 2);
      const z = w * x + b;
      const s = sigmoid(z);
      const answer = s * (1 - s) * w;
      return {
        problemId: this.id, variant, prompt: `Let $g(x) = \\sigma(${w}x + ${b})$. Compute $g'(${x})$ to 4 decimal places.`.replace("+ -", "- "),
        answer, tolerance: 0.00005, answerFormat: "4 decimal places", hints: ["σ'(z) = σ(z)(1 − σ(z)).", "Multiply by the derivative of the inside, w."],
        steps: [`z = ${w}·${x} + ${b} = ${z}`, `σ(z) ≈ ${fmt(s)}`, `g'(x) = σ(z)(1 − σ(z))·${w} ≈ ${fmt(answer)}`]
      };
    }
  }
];

export function getProblem(problemId: string): ProblemDefinition | undefined {
  return problems.find((problem) => problem.id === problemId);
}

export function generateProblem(problemId: string, variant: number): GeneratedProblem {
  const problem = getProblem(problemId);
  if (!problem) throw new Error("Unknown practice problem.");
  if (!Number.isInteger(variant) || variant < 0 || variant > 1_000_000) throw new Error("Invalid problem variant.");
  return problem.generate(variant);
}
