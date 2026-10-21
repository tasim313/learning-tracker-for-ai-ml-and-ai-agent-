import assert from "node:assert/strict";
import test from "node:test";
import { binarySearchTrace, bubbleSortTrace, equationStep, factorialTrace, fibonacciTable, loginWorkflowSteps, midpointIntegralSquares, projectilePosition, secantSlope, sumLoopTrace } from "@/lib/visual/engine";

test("binary search trace finds a value while shrinking the active range", () => {
  const trace = binarySearchTrace([3, 7, 11, 14, 18, 22, 29, 31], 22);
  assert.equal(trace.at(-1)?.comparison, "found");
  assert.deepEqual(trace.map((step) => step.middle), [3, 5]);
  assert.equal(trace[0].comparison, "low");
});

test("binary search trace reports missing values and rejects unsorted input", () => {
  assert.equal(binarySearchTrace([1, 2, 3, 4], 8).at(-1)?.comparison, "not-found");
  assert.throws(() => binarySearchTrace([2, 1], 1), /sorted/);
});

test("the displayed code example has a complete deterministic state trace", () => {
  assert.equal(sumLoopTrace.at(-1)?.output, "60");
  assert.equal(sumLoopTrace.at(-1)?.variables.total, "60");
  assert.equal(sumLoopTrace.length, 9);
});

test("equation steps preserve both-side transformations and verify the solution", () => {
  assert.equal(equationStep(4).equation, "x = 3");
  assert.match(equationStep(5).equation, /10 = 10/);
});

test("projectile model starts at the initial height and returns to ground", () => {
  const initial = projectilePosition(20, 45, 9.81, 0, 1);
  const flightTime = (20 * Math.sin(Math.PI / 4) + Math.sqrt((20 * Math.sin(Math.PI / 4)) ** 2 + 2 * 9.81)) / 9.81;
  const landing = projectilePosition(20, 45, 9.81, flightTime, 1);
  assert.equal(initial.x, 0);
  assert.equal(initial.y, 1);
  assert.ok(Math.abs(landing.y) < 1e-10);
});

test("login architecture trace moves through the application and returns to the user", () => {
  assert.equal(loginWorkflowSteps[0].component, "User");
  assert.ok(loginWorkflowSteps.some((step) => step.component === "Database"));
  assert.equal(loginWorkflowSteps.at(-1)?.component, "User");
});

test("bubble sort records comparisons and produces ascending output without changing its input", () => {
  const input = [4, 1, 3, 2];
  const trace = bubbleSortTrace(input);
  assert.deepEqual(input, [4, 1, 3, 2]);
  assert.deepEqual(trace.at(-1)?.values, [1, 2, 3, 4]);
  assert.ok(trace.some((step) => step.swapped));
});

test("factorial recursion trace reaches its base case and returns the result", () => {
  const trace = factorialTrace(5);
  assert.equal(trace.find((step) => step.n === 0)?.result, null);
  assert.equal(trace.at(-1)?.result, 120);
  assert.deepEqual(trace.at(-1)?.stack, []);
});

test("dynamic programming and calculus helpers produce valid approximations", () => {
  assert.deepEqual(fibonacciTable(7), [0, 1, 1, 2, 3, 5, 8]);
  assert.ok(Math.abs(midpointIntegralSquares(100) - 8 / 3) < 0.0001);
  assert.ok(Math.abs(secantSlope(0.5, 0.001) - 1) < 0.001);
});

test("calculus helpers reject invalid intervals and rectangle counts", () => {
  assert.throws(() => secantSlope(1, 0), /positive/);
  assert.throws(() => midpointIntegralSquares(0), /rectangles/);
});
