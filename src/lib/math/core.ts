/**
 * Calculation utilities for the Mathematics Learning Lab. All are pure and unit-tested.
 * Functions that use numerical approximations say so in their names or comments.
 */

export type Vector = number[];
export type Matrix = number[][];

function assertSameLength(a: Vector, b: Vector) {
  if (a.length !== b.length) throw new Error("Vectors must have the same length.");
  if (a.length === 0) throw new Error("Vectors must not be empty.");
}

export function dot(a: Vector, b: Vector): number {
  assertSameLength(a, b);
  return a.reduce((total, value, index) => total + value * b[index], 0);
}

export function norm(a: Vector): number {
  return Math.sqrt(dot(a, a));
}

/** Cosine similarity; null when either vector has zero length (the angle is undefined). */
export function cosineSimilarity(a: Vector, b: Vector): number | null {
  const lengths = norm(a) * norm(b);
  return lengths === 0 ? null : dot(a, b) / lengths;
}

export function angleDegrees(a: Vector, b: Vector): number | null {
  const cosine = cosineSimilarity(a, b);
  return cosine === null ? null : Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
}

export function matMul(a: Matrix, b: Matrix): Matrix {
  if (!a.length || !b.length || a[0].length !== b.length) throw new Error("Inner dimensions must match (columns of A = rows of B).");
  return a.map((row) => b[0].map((_, column) => row.reduce((total, value, k) => total + value * b[k][column], 0)));
}

export function transpose(a: Matrix): Matrix {
  return a[0].map((_, column) => a.map((row) => row[column]));
}

export function determinant2(a: Matrix): number {
  if (a.length !== 2 || a[0].length !== 2 || a[1].length !== 2) throw new Error("A 2×2 matrix is required.");
  return a[0][0] * a[1][1] - a[0][1] * a[1][0];
}

/** Numerical derivative by central difference — an approximation with error of order h². */
export function numericalDerivative(f: (x: number) => number, x: number, h = 1e-5): number {
  return (f(x + h) - f(x - h)) / (2 * h);
}

/** Gradient descent on a one-dimensional function given its derivative. Returns every iterate including x0. */
export function gradientDescent(derivative: (x: number) => number, x0: number, learningRate: number, steps: number): number[] {
  if (!Number.isInteger(steps) || steps < 0 || steps > 10_000) throw new Error("Steps must be an integer from 0 to 10,000.");
  const path = [x0];
  let x = x0;
  for (let step = 0; step < steps; step += 1) {
    x = x - learningRate * derivative(x);
    path.push(x);
    if (!Number.isFinite(x)) break;
  }
  return path;
}

export function sigmoid(z: number): number {
  // Branches avoid overflow of exp for large |z|.
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z);
  return e / (1 + e);
}

/** Numerically stable softmax (subtracts the maximum before exponentiating). */
export function softmax(scores: number[]): number[] {
  if (!scores.length) throw new Error("At least one score is required.");
  const max = Math.max(...scores);
  const exps = scores.map((score) => Math.exp(score - max));
  const total = exps.reduce((sum, value) => sum + value, 0);
  return exps.map((value) => value / total);
}

export function mean(values: number[]): number {
  if (!values.length) throw new Error("At least one value is required.");
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function median(values: number[]): number {
  if (!values.length) throw new Error("At least one value is required.");
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Variance. `sample: true` divides by n − 1 (Bessel's correction); null for a sample of one value. */
export function variance(values: number[], sample = false): number | null {
  const m = mean(values);
  const denominator = sample ? values.length - 1 : values.length;
  if (denominator <= 0) return null;
  return values.reduce((sum, value) => sum + (value - m) ** 2, 0) / denominator;
}

export function standardDeviation(values: number[], sample = false): number | null {
  const v = variance(values, sample);
  return v === null ? null : Math.sqrt(v);
}

export function normalPdf(x: number, mu = 0, sigma = 1): number {
  if (sigma <= 0) throw new Error("Standard deviation must be positive.");
  return Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
}

/** Error function, Abramowitz & Stegun 7.1.26 — a numerical approximation with absolute error below 1.5e-7. */
export function erfApprox(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}

/** Normal CDF via erfApprox — a numerical approximation. */
export function normalCdfApprox(x: number, mu = 0, sigma = 1): number {
  if (sigma <= 0) throw new Error("Standard deviation must be positive.");
  return 0.5 * (1 + erfApprox((x - mu) / (sigma * Math.SQRT2)));
}

export function bayesPosterior(prior: number, likelihood: number, falsePositiveRate: number): number | null {
  for (const value of [prior, likelihood, falsePositiveRate]) if (!(value >= 0 && value <= 1)) throw new Error("Probabilities must be between 0 and 1.");
  const evidence = likelihood * prior + falsePositiveRate * (1 - prior);
  return evidence === 0 ? null : likelihood * prior / evidence;
}

export type Confusion = { tp: number; fp: number; fn: number; tn: number };

/** Classification metrics; each is null when its denominator is zero (undefined, not 0). */
export function classificationMetrics({ tp, fp, fn, tn }: Confusion) {
  for (const value of [tp, fp, fn, tn]) if (!Number.isInteger(value) || value < 0) throw new Error("Counts must be non-negative integers.");
  const precision = tp + fp ? tp / (tp + fp) : null;
  const recall = tp + fn ? tp / (tp + fn) : null;
  const total = tp + fp + fn + tn;
  const f1 = precision !== null && recall !== null && precision + recall > 0 ? 2 * precision * recall / (precision + recall) : null;
  return { precision, recall, f1, accuracy: total ? (tp + tn) / total : null, specificity: tn + fp ? tn / (tn + fp) : null };
}

/** Binary cross-entropy for one prediction; p is clamped to avoid log(0). */
export function binaryCrossEntropy(p: number, y: 0 | 1, epsilon = 1e-12): number {
  const clamped = Math.min(1 - epsilon, Math.max(epsilon, p));
  return -(y * Math.log(clamped) + (1 - y) * Math.log(1 - clamped));
}

/** Ordinary least squares for y = slope·x + intercept. Null when all x are equal. */
export function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number } | null {
  assertSameLength(xs, ys);
  const mx = mean(xs);
  const my = mean(ys);
  const sxx = xs.reduce((sum, x) => sum + (x - mx) ** 2, 0);
  if (sxx === 0) return null;
  const slope = xs.reduce((sum, x, index) => sum + (x - mx) * (ys[index] - my), 0) / sxx;
  return { slope, intercept: my - slope * mx };
}

export function roundTo(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON * Math.sign(value)) * factor) / factor;
}
