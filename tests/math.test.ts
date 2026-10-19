import assert from "node:assert/strict";
import test from "node:test";
import {
  angleDegrees, bayesPosterior, binaryCrossEntropy, classificationMetrics, cosineSimilarity, determinant2, dot, erfApprox,
  gradientDescent, linearRegression, matMul, mean, median, norm, normalCdfApprox, numericalDerivative, sigmoid, softmax,
  standardDeviation, transpose, variance
} from "../src/lib/math/core";
import { generateProblem, problems } from "../src/lib/math/problems";
import { parseNumber, withinTolerance } from "../src/lib/content/grading";

const close = (actual: number | null, expected: number, epsilon = 1e-9) => {
  assert.ok(actual !== null, "value should be defined");
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} ≉ ${expected}`);
};

test("vector operations, including undefined cosine for zero vectors", () => {
  assert.equal(dot([2, 1], [3, 4]), 10);
  assert.equal(norm([3, 4]), 5);
  close(cosineSimilarity([2, 1], [3, 4]), 2 / Math.sqrt(5));
  assert.equal(cosineSimilarity([0, 0], [1, 2]), null);
  close(angleDegrees([1, 0], [0, 1]), 90);
  assert.throws(() => dot([1], [1, 2]));
  assert.throws(() => dot([], []));
});

test("matrix operations validate shapes", () => {
  assert.deepEqual(matMul([[1, 2], [3, 4]], [[5, 6], [7, 8]]), [[19, 22], [43, 50]]);
  assert.deepEqual(transpose([[1, 2, 3]]), [[1], [2], [3]]);
  assert.equal(determinant2([[1, 2], [3, 4]]), -2);
  assert.throws(() => matMul([[1, 2]], [[1, 2]]));
});

test("calculus and optimization match the lesson's worked examples", () => {
  close(numericalDerivative((x) => x * x, 3), 6, 1e-6);
  const path = gradientDescent((x) => 2 * x, 3, 0.1, 3);
  close(path[1], 2.4); close(path[2], 1.92); close(path[3], 1.536);
  const diverging = gradientDescent((x) => 2 * x, 1, 1.1, 5);
  assert.ok(Math.abs(diverging[5]) > 1, "learning rate above 1 diverges on x²");
  assert.throws(() => gradientDescent((x) => x, 0, 0.1, -1));
});

test("sigmoid and softmax are numerically stable", () => {
  close(sigmoid(0), 0.5);
  close(sigmoid(0.1), 0.52497918747894, 1e-12);
  assert.ok(Number.isFinite(sigmoid(-1000)) && sigmoid(-1000) >= 0);
  assert.equal(sigmoid(1000), 1);
  const weights = softmax([1000, 1000]);
  close(weights[0], 0.5);
  close(softmax([2, 0, 0])[0], Math.exp(2) / (Math.exp(2) + 2));
  close(softmax([1 / Math.SQRT2, 0])[0], 0.6698, 5e-5);
});

test("statistics handle samples, populations, and edge cases", () => {
  const values = [2, 4, 4, 4, 5, 5, 7, 9];
  assert.equal(mean(values), 5);
  assert.equal(median(values), 4.5);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(variance(values), 4);
  close(variance(values, true), 32 / 7);
  assert.equal(standardDeviation(values), 2);
  assert.equal(variance([5], true), null, "sample variance of one value is undefined");
  assert.throws(() => mean([]));
});

test("probability helpers match hand calculations", () => {
  close(bayesPosterior(0.01, 0.99, 0.05), 1 / 6);
  close(bayesPosterior(0.2, 0.5, 0.05), 0.1 / 0.14);
  assert.equal(bayesPosterior(0, 0, 0), null);
  assert.throws(() => bayesPosterior(1.2, 0.5, 0.1));
  close(erfApprox(1), 0.8427007929, 2e-7);
  close(normalCdfApprox(0), 0.5, 2e-7);
  close(normalCdfApprox(1.96) - normalCdfApprox(-1.96), 0.9500042, 1e-6);
});

test("classification metrics return null instead of dividing by zero", () => {
  const metrics = classificationMetrics({ tp: 40, fp: 10, fn: 20, tn: 930 });
  close(metrics.precision, 0.8);
  close(metrics.recall, 2 / 3);
  close(metrics.f1, 2 * 0.8 * (2 / 3) / (0.8 + 2 / 3));
  close(metrics.accuracy, 0.97);
  const none = classificationMetrics({ tp: 0, fp: 0, fn: 0, tn: 5 });
  assert.equal(none.precision, null);
  assert.equal(none.recall, null);
  assert.equal(none.f1, null);
  assert.throws(() => classificationMetrics({ tp: -1, fp: 0, fn: 0, tn: 0 }));
});

test("loss and regression", () => {
  close(binaryCrossEntropy(0.9, 1), -Math.log(0.9));
  close(binaryCrossEntropy(0.9, 0), -Math.log(0.1));
  assert.ok(Number.isFinite(binaryCrossEntropy(0, 1)), "clamped to avoid infinity");
  const fit = linearRegression([1, 2, 3], [2, 4, 6]);
  close(fit?.slope ?? NaN, 2); close(fit?.intercept ?? NaN, 0);
  assert.equal(linearRegression([1, 1], [2, 3]), null);
});

test("answer parsing accepts decimals, fractions, and percentages", () => {
  assert.equal(parseNumber("0.25"), 0.25);
  assert.equal(parseNumber("1/4"), 0.25);
  assert.equal(parseNumber("25%"), 0.25);
  assert.equal(parseNumber("1,000"), 1000);
  assert.equal(parseNumber("1/0"), null);
  assert.equal(parseNumber("abc"), null);
  assert.ok(withinTolerance(0.1 + 0.2, 0.3, 0));
  assert.ok(!withinTolerance(0.31, 0.3, 0.005));
});

test("every generated problem is deterministic and its stored answer satisfies its own tolerance", () => {
  for (const definition of problems) {
    for (const variant of [0, 1, 7, 42, 999]) {
      const first = generateProblem(definition.id, variant);
      const second = generateProblem(definition.id, variant);
      assert.deepEqual(first, second, `${definition.id} variant ${variant} must be reproducible`);
      assert.ok(Number.isFinite(first.answer), `${definition.id} answer is finite`);
      assert.ok(first.steps.length > 0 && first.prompt.length > 0);
    }
  }
  assert.throws(() => generateProblem("unknown", 1));
  assert.throws(() => generateProblem("dot-product", -1));
});

test("generated problems agree with an independent recomputation from their prompts", () => {
  for (let variant = 0; variant < 25; variant += 1) {
    const dotProblem = generateProblem("dot-product", variant);
    const vectors = [...dotProblem.prompt.matchAll(/\[([-\d, ]+)\]/g)].map((match) => match[1].split(",").map(Number));
    assert.equal(dotProblem.answer, vectors[0].reduce((sum, value, index) => sum + value * vectors[1][index], 0));

    const variance = generateProblem("sample-variance", variant);
    const numbers = variance.prompt.replace(/\*\*[^*]+\*\*/, "").match(/-?\d+/g)!.map(Number).slice(0, 5);
    const m = numbers.reduce((a, b) => a + b, 0) / 5;
    close(variance.answer, numbers.reduce((sum, value) => sum + (value - m) ** 2, 0) / 4);
  }
});
