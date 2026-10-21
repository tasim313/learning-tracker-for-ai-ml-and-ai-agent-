/**
 * End-to-end checks against the production build (`npm run build` first).
 * Starts `next start` on a temporary DATA_DIR, exercises the HTTP surface with
 * real cookies, restarts the server, and verifies data persisted.
 */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { TestServer } from "./harness";

const server = new TestServer();
const origin = server.origin;
const startServer = () => server.start();
const stopServer = () => server.stop();

before(async () => { await startServer(); });
after(async () => { await server.dispose(); });

function request(url: string, init: RequestInit & { cookie?: string } = {}) {
  const headers = new Headers(init.headers);
  if (init.cookie) headers.set("cookie", init.cookie);
  if (init.body) headers.set("content-type", "application/json");
  if (init.method && init.method !== "GET") headers.set("origin", origin);
  return fetch(`${origin}${url}`, { ...init, headers, redirect: "manual" });
}

async function register(email: string) {
  const response = await request("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password: "e2e passphrase value" }) });
  assert.equal(response.status, 201, await response.clone().text());
  const cookie = /lt_session=[^;]+/.exec(response.headers.get("set-cookie") ?? "")?.[0];
  assert.ok(cookie);
  return cookie;
}

test("public pages are reachable and private pages require sign-in", async () => {
  const landing = await request("/");
  assert.equal(landing.status, 200);
  assert.match(await landing.text(), /Create account/);
  assert.equal(landing.headers.get("x-frame-options"), "DENY");
  assert.equal(landing.headers.get("x-content-type-options"), "nosniff");

  const dashboard = await request("/dashboard");
  assert.equal(dashboard.status, 307);
  assert.match(dashboard.headers.get("location") ?? "", /\/login\?next=%2Fdashboard/);
  assert.equal((await request("/api/settings")).status, 401);
  const forged = await request("/dashboard", { cookie: "lt_session=forged" });
  assert.equal(forged.status, 307, "a forged cookie passes the optimistic proxy check but fails server validation");
  assert.equal((await request("/login")).status, 200);
});

test("a registered learner reaches their dashboard, and admin pages stay hidden from learners", async () => {
  const cookie = await register("learner-e2e@example.test");
  const dashboard = await request("/dashboard", { cookie });
  assert.equal(dashboard.status, 200);
  assert.match(await dashboard.text(), /Learning roadmap/);
  assert.equal((await request("/account", { cookie })).status, 200);
  assert.equal((await request("/admin/users", { cookie })).status, 404);
  assert.equal((await request("/api/admin/users", { cookie })).status, 403);
  const crossSite = await fetch(`${origin}/api/settings`, { method: "PATCH", headers: { cookie, origin: "https://attacker.example", "content-type": "application/json" }, body: "{}" });
  assert.equal(crossSite.status, 403);

  const admin = await register("admin@example.test");
  assert.equal((await request("/admin/users", { cookie: admin })).status, 200);
});

test("an active timer and saved records persist across a server restart", async () => {
  const cookie = await register("restart-e2e@example.test");
  const started = await request("/api/timer", { method: "POST", cookie, body: JSON.stringify({ action: "start", topicId: "topic-1", plannedSeconds: 1500 }) });
  assert.equal(started.status, 201);
  const session = await started.json() as { id: string; startedAt: string };
  const note = await request("/api/collections/notes", { method: "POST", cookie, body: JSON.stringify({ title: "Survives restart", body: "", topicId: null, tags: [] }) });
  assert.equal(note.status, 201);

  await stopServer();
  await startServer();

  const sessions = await (await request("/api/collections/learningSessions", { cookie })).json() as { id: string; state: string; startedAt: string }[];
  const restored = sessions.find((item) => item.id === session.id);
  assert.ok(restored, "session cookie and timer survive the restart");
  assert.equal(restored.state, "running");
  assert.equal(restored.startedAt, session.startedAt, "timestamps are not rewritten");
  const notes = await (await request("/api/collections/notes", { cookie })).json() as { title: string }[];
  assert.deepEqual(notes.map((item) => item.title), ["Survives restart"]);
});

test("sign-out ends the session", async () => {
  const cookie = await register("logout-e2e@example.test");
  assert.equal((await request("/api/auth/logout", { method: "POST", cookie })).status, 200);
  assert.equal((await request("/api/settings", { cookie })).status, 401);
  assert.equal((await request("/dashboard", { cookie })).status, 307);
});

test("every application page renders for a signed-in learner, and admin pages for an administrator", async () => {
  const cookie = await register("sweep-e2e@example.test");
  const learnerPages = [
    "/dashboard", "/recommendations", "/courses", "/courses/ai-engineering-foundations",
    "/courses/ai-engineering-foundations/lessons/vectors-and-dot-products",
    "/courses/ai-engineering-foundations/lessons/vectors-and-dot-products/tutorial",
    "/videos", "/videos/ai-engineering-foundations/vectors-and-dot-products/video",
    "/roadmap", "/topics", "/topics/topic-2", "/resources", "/knowledge", "/math-lab", "/diagrams", "/games", "/flashcards",
    "/timer", "/sessions", "/planner", "/revisions", "/exams", "/exam-library", "/questions", "/blueprints",
    "/active-exam", "/practical-exam", "/exam-results", "/answer-review", "/gaps", "/competency", "/exam-history",
    "/exam-analytics", "/assessments", "/projects", "/sales-agent", "/goals", "/discipline", "/rewards", "/reports",
    "/experiments", "/opportunities", "/subtopics", "/learning-tasks", "/settings", "/backup", "/account"
  ];
  const failures: string[] = [];
  for (const page of learnerPages) {
    const response = await request(page, { cookie });
    const html = await response.text();
    if (response.status !== 200 || /Application error|Internal Server Error/.test(html)) failures.push(`${page}: ${response.status}`);
  }
  assert.deepEqual(failures, []);
  assert.equal((await request("/courses/not-a-course", { cookie })).status, 404);
  assert.equal((await request("/admin/content", { cookie })).status, 404, "admin pages are hidden from learners");

  const admin = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@example.test", password: "e2e passphrase value" }) });
  const adminCookie = /lt_session=[^;]+/.exec(admin.headers.get("set-cookie") ?? "")?.[0];
  assert.ok(adminCookie);
  for (const page of ["/admin/content", "/admin/content/ai-engineering-foundations", "/admin/content/diagrams", "/admin/users", "/admin/audit"]) {
    assert.equal((await request(page, { cookie: adminCookie })).status, 200, page);
  }
});
