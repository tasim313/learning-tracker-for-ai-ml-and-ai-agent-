/**
 * Browser-level tests of critical workflows, driving the locally installed Google
 * Chrome through playwright-core (no browser download). Skipped when Chrome is not
 * available. Run after `npm run build`: `npm run test:e2e`.
 */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { TestServer } from "./harness";

const server = new TestServer();
let browser: Browser | null = null;
let context: BrowserContext;
let page: Page;
const problems: string[] = [];

before(async () => {
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    browser = null;
    return;
  }
  await server.start();
  context = await browser.newContext({ baseURL: server.origin, timezoneId: "UTC" });
  page = await context.newPage();
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    // Third-party embeds (for example YouTube's player) can log their own errors; only the app's errors count.
    if (message.type() === "error" && !/youtube|googlevideo|ytimg|doubleclick/i.test(`${message.location().url} ${message.text()}`)) problems.push(`console: ${message.text()} @ ${message.location().url}`);
  });
  page.on("dialog", (dialog) => void dialog.accept());
});

after(async () => {
  await browser?.close();
  await server.dispose();
});

function requireBrowser(t: { skip: (message: string) => void }) {
  if (!browser) { t.skip("Google Chrome is not installed; browser tests skipped."); return false; }
  return true;
}

function assertNoProblems(step: string) {
  const found = problems.splice(0);
  assert.deepEqual(found, [], `${step} produced browser errors`);
}

test("register through the UI and land on a working dashboard", async (t) => {
  if (!requireBrowser(t)) return;
  await page.goto("/register");
  await page.getByLabel("Display name (optional)").fill("Browser Tester");
  await page.getByLabel("Email").fill("browser@example.test");
  await page.getByLabel("Password", { exact: true }).fill("browser passphrase value");
  await page.getByLabel("Confirm password").fill("browser passphrase value");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { name: /Learn by building/ }).waitFor();
  assertNoProblems("dashboard");
});

test("the learning timer survives a page refresh and records pause and finish", async (t) => {
  if (!requireBrowser(t)) return;
  await page.goto("/timer");
  await page.getByLabel("Learning topic").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Start learning" }).click();
  await page.getByRole("heading", { name: "Active learning session" }).waitFor();
  await page.waitForTimeout(2200);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Resume", exact: true }).waitFor();
  const focused = await page.locator("p.font-mono").first().textContent();
  assert.match(focused ?? "", /^00:00:0[1-9]$/, "focused time comes from saved timestamps after reload");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByRole("button", { name: "Finish session" }).click();
  await page.getByText("Session finished and saved.").waitFor();
  assertNoProblems("timer");
});

test("a lesson knowledge check is graded and a diagram renders in visualize mode", async (t) => {
  if (!requireBrowser(t)) return;
  await page.goto("/courses/ai-engineering-foundations/lessons/vectors-and-dot-products");
  await page.getByRole("heading", { name: "Vectors, dot products, and similarity" }).waitFor();
  const check = page.getByRole("region", { name: "Knowledge check · after the lesson" });
  await check.getByLabel("Answer to question 1").fill("1");
  await check.getByLabel("90°").check();
  await check.getByLabel("False").check();
  await check.getByRole("button", { name: "Check answers" }).click();
  await check.getByText("3 of 3 correct").waitFor();

  await page.goto("/courses/ai-engineering-foundations/lessons/derivatives-and-gradient-descent");
  await page.getByRole("button", { name: "Visualize" }).click();
  await page.locator(".react-flow__node").first().waitFor();
  await page.getByRole("button", { name: "Reveal step by step" }).click();
  await page.getByText(/Step 1 of \d+/).waitFor();
  await page.reload();
  assert.equal(await page.getByRole("button", { name: "Visualize" }).getAttribute("aria-pressed"), "true", "the chosen learning mode is remembered");
  assertNoProblems("lesson");
});

test("an examination keeps draft answers across a refresh and is graded on submission", async (t) => {
  if (!requireBrowser(t)) return;
  await page.goto("/exams");
  await page.getByRole("button", { name: /Start knowledge check|Try the build challenge/ }).first().click();
  await page.getByRole("heading", { name: /Before you start/ }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Begin examination" }).isDisabled(), true, "rules must be acknowledged first");
  await page.getByRole("checkbox", { name: /I have read/ }).check();
  await page.getByRole("button", { name: "Begin examination" }).click();
  await page.waitForURL("**/active-exam");
  const textareas = page.locator("textarea, input[type=text]");
  await textareas.first().waitFor();
  await textareas.first().fill("my draft answer");
  await page.getByText("All answers saved").waitFor();
  await page.reload();
  await page.locator("textarea, input[type=text]").first().waitFor();
  const saved = await page.locator("textarea, input[type=text]").first().inputValue();
  assert.equal(saved, "my draft answer");
  await page.getByRole("button", { name: /Submit/ }).first().click();
  await page.waitForURL("**/exam-results");
  assertNoProblems("examination");
});

test("flashcards, maths practice, games, and the diagram studio work end to end", async (t) => {
  if (!requireBrowser(t)) return;
  await page.goto("/flashcards");
  await page.getByLabel("Front (question or term)").fill("What is recall?");
  await page.getByLabel("Back (answer)").fill("TP / (TP + FN)");
  await page.getByRole("button", { name: "Add card" }).click();
  await page.getByRole("button", { name: "Show answer" }).click();
  await page.getByRole("button", { name: "Good" }).click();
  await page.getByText("No cards are due").waitFor();

  await page.goto("/math-lab");
  await page.getByRole("button", { name: /^Dot product/ }).click();
  await page.getByLabel("Answer", { exact: true }).fill("0.123");
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.getByText("Worked solution").waitFor();
  await page.getByRole("tab", { name: "Gradient descent" }).click();
  await page.getByRole("img", { name: /Gradient descent iterates/ }).waitFor();

  await page.goto("/games");
  await page.getByRole("listitem").filter({ hasText: "Decide: AI sales agent safety" }).getByRole("button", { name: "Play" }).click();
  await page.getByLabel("Offer up to 15% and escalate the 30% request to a human").check();
  await page.getByRole("button", { name: "Submit answers" }).click();
  await page.getByText(/Score: 1 of 4/).waitFor();

  await page.goto("/diagrams");
  await page.locator(".react-flow__node").first().waitFor();
  await page.getByRole("button", { name: "Check answers" }).click();
  await page.getByText(/of \d+ correct/).waitFor();
  assertNoProblems("practice tools");
});

test("signing out from the header ends the session", async (t) => {
  if (!requireBrowser(t)) return;
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/login");
  await page.goto("/dashboard");
  await page.waitForURL("**/login?next=%2Fdashboard");
  assertNoProblems("sign out");
});
