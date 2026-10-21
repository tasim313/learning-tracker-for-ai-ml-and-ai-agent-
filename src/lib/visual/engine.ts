export type BinarySearchStep = {
  low: number;
  high: number;
  middle: number | null;
  comparison: "low" | "high" | "found" | "not-found";
  explanation: string;
};

/** Deterministic binary search trace. The original array is never mutated. */
export function binarySearchTrace(values: number[], target: number): BinarySearchStep[] {
  if (values.length > 200 || values.some((value) => !Number.isFinite(value))) throw new Error("Use at most 200 finite values.");
  if (values.some((value, index) => index > 0 && value < values[index - 1])) throw new Error("Binary search requires sorted values.");
  const steps: BinarySearchStep[] = [];
  let low = 0;
  let high = values.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (values[middle] === target) {
      steps.push({ low, high, middle, comparison: "found", explanation: `${target} equals the middle value ${values[middle]}, so the search is complete.` });
      return steps;
    }
    if (values[middle] < target) {
      steps.push({ low, high, middle, comparison: "low", explanation: `${values[middle]} is less than ${target}; discard this value and everything to its left.` });
      low = middle + 1;
    } else {
      steps.push({ low, high, middle, comparison: "high", explanation: `${values[middle]} is greater than ${target}; discard this value and everything to its right.` });
      high = middle - 1;
    }
  }
  steps.push({ low, high, middle: null, comparison: "not-found", explanation: `${target} is not in the array because the remaining search range is empty.` });
  return steps;
}

export type CodeTraceStep = { line: number; statement: string; explanation: string; variables: Record<string, string>; output: string };

/** A hand-authored trace for the displayed sample; it simulates and does not execute arbitrary code. */
export const sumLoopTrace: CodeTraceStep[] = [
  { line: 1, statement: "numbers = [10, 20, 30]", explanation: "Create a list with three values in memory.", variables: { numbers: "[10, 20, 30]" }, output: "" },
  { line: 2, statement: "total = 0", explanation: "Initialize the accumulator before the loop begins.", variables: { numbers: "[10, 20, 30]", total: "0" }, output: "" },
  { line: 4, statement: "for number in numbers:", explanation: "The loop reads the first list item, 10.", variables: { numbers: "[10, 20, 30]", total: "0", number: "10" }, output: "" },
  { line: 5, statement: "total += number", explanation: "Read total and number, then store their sum back in total.", variables: { numbers: "[10, 20, 30]", total: "10", number: "10" }, output: "" },
  { line: 4, statement: "for number in numbers:", explanation: "The loop advances to the next item, 20.", variables: { numbers: "[10, 20, 30]", total: "10", number: "20" }, output: "" },
  { line: 5, statement: "total += number", explanation: "Add 20 to the previous total of 10.", variables: { numbers: "[10, 20, 30]", total: "30", number: "20" }, output: "" },
  { line: 4, statement: "for number in numbers:", explanation: "The loop advances to the final item, 30.", variables: { numbers: "[10, 20, 30]", total: "30", number: "30" }, output: "" },
  { line: 5, statement: "total += number", explanation: "Add 30 to 30. The list is exhausted, so the loop ends.", variables: { numbers: "[10, 20, 30]", total: "60", number: "30" }, output: "" },
  { line: 7, statement: "print(total)", explanation: "Read total and write its value to the program output.", variables: { numbers: "[10, 20, 30]", total: "60", number: "30" }, output: "60" }
];

export const loginWorkflowSteps = [
  { component: "User", action: "Enter credentials", explanation: "The user submits an email and password through the sign-in form." },
  { component: "Frontend", action: "Validate input", explanation: "The browser checks required fields before making a request." },
  { component: "API", action: "Send sign-in request", explanation: "The frontend sends credentials over the authenticated application's request path." },
  { component: "Backend", action: "Validate request", explanation: "The server validates the payload and applies authentication rules." },
  { component: "Database", action: "Find account", explanation: "The server retrieves the account record needed to verify the credentials." },
  { component: "Authentication", action: "Verify password", explanation: "The server compares the submitted password with its stored password hash." },
  { component: "Backend", action: "Create session", explanation: "If credentials are valid, the server issues a session; failures return an error instead." },
  { component: "Frontend", action: "Update interface", explanation: "The interface displays the result and loads permitted pages after success." },
  { component: "User", action: "Open authorized page", explanation: "The user can reach a protected resource only when the session grants access." }
];

export type SortStep = { values: number[]; left: number; right: number; swapped: boolean; explanation: string };
export function bubbleSortTrace(input: number[]): SortStep[] {
  if (input.length > 30 || input.some((value) => !Number.isFinite(value))) throw new Error("Use at most 30 finite numbers.");
  const values = [...input];
  const steps: SortStep[] = [{ values: [...values], left: -1, right: -1, swapped: false, explanation: "Start with the input array." }];
  for (let end = values.length - 1; end > 0; end--) {
    for (let index = 0; index < end; index++) {
      const left = values[index];
      const right = values[index + 1];
      const swapped = left > right;
      if (swapped) [values[index], values[index + 1]] = [values[index + 1], values[index]];
      steps.push({ values: [...values], left: index, right: index + 1, swapped, explanation: swapped ? `${left} is greater than ${right}; swap the adjacent values.` : `${left} is not greater than ${right}; leave them in place.` });
    }
  }
  steps.push({ values: [...values], left: -1, right: -1, swapped: false, explanation: "The array is sorted in ascending order." });
  return steps;
}

export type RecursionStep = { n: number; stack: number[]; result: number | null; explanation: string };
export function factorialTrace(input: number): RecursionStep[] {
  if (!Number.isInteger(input) || input < 0 || input > 10) throw new Error("Choose a whole number from 0 to 10.");
  const steps: RecursionStep[] = [];
  const stack: number[] = [];
  for (let n = input; n >= 0; n--) {
    stack.push(n);
    steps.push({ n, stack: [...stack], result: null, explanation: n === 0 ? "Base case: 0! is 1, so the calls can return." : `Call factorial(${n - 1}) before multiplying by ${n}.` });
  }
  let result = 1;
  while (stack.length) {
    const n = stack.pop()!;
    result *= Math.max(1, n);
    steps.push({ n, stack: [...stack], result, explanation: stack.length ? `Return from factorial(${n}) and multiply the saved result by ${n}.` : `All calls returned. The final result is ${result}.` });
  }
  return steps;
}

export function fibonacciTable(size: number): number[] {
  if (!Number.isInteger(size) || size < 2 || size > 20) throw new Error("Choose a table size from 2 to 20.");
  const table = [0, 1];
  for (let index = 2; index < size; index++) table.push(table[index - 1] + table[index - 2]);
  return table;
}

export const stackTrace = [
  { action: "Start with an empty stack.", values: [] as number[] },
  { action: "Push 10 onto the top.", values: [10] },
  { action: "Push 20 onto the top.", values: [10, 20] },
  { action: "Push 30 onto the top.", values: [10, 20, 30] },
  { action: "Pop the top value, 30 (last in, first out).", values: [10, 20] },
  { action: "Read the new top value, 20.", values: [10, 20] }
];

export function secantSlope(a: number, delta: number) {
  if (!Number.isFinite(a) || !Number.isFinite(delta) || delta <= 0) throw new Error("The interval must be a positive finite number.");
  return (((a + delta) ** 2) - a ** 2) / delta;
}

export function midpointIntegralSquares(rectangles: number) {
  if (!Number.isInteger(rectangles) || rectangles < 1 || rectangles > 500) throw new Error("Use from 1 to 500 rectangles.");
  const width = 2 / rectangles;
  return Array.from({ length: rectangles }, (_, index) => ((index + 0.5) * width) ** 2 * width).reduce((sum, area) => sum + area, 0);
}

export function equationStep(step: number) {
  return [
    { equation: "2x + 4 = 10", action: "Start with the original equation.", why: "Both sides have the same value." },
    { equation: "2x + 4 − 4 = 10 − 4", action: "Subtract 4 from both sides.", why: "Doing the same operation to both sides preserves equality." },
    { equation: "2x = 6", action: "Simplify both sides.", why: "The +4 and −4 cancel." },
    { equation: "2x ÷ 2 = 6 ÷ 2", action: "Divide both sides by 2.", why: "Doing the same non-zero division to both sides preserves equality." },
    { equation: "x = 3", action: "Simplify to find x.", why: "The variable is isolated." },
    { equation: "2(3) + 4 = 10  →  10 = 10", action: "Substitute x = 3 into the original equation.", why: "The true statement verifies the solution." }
  ][Math.max(0, Math.min(5, step))];
}

export function projectilePosition(speed: number, angleDegrees: number, gravity: number, time: number, height: number) {
  const angle = angleDegrees * Math.PI / 180;
  return { x: speed * Math.cos(angle) * time, y: height + speed * Math.sin(angle) * time - 0.5 * gravity * time * time };
}
