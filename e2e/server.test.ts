/**
 * End-to-end checks against the production build (`npm run build` first).
 * Starts `next start` on a temporary DATA_DIR, exercises the HTTP surface with
 * real cookies, restarts the server, and verifies data persisted.
 */
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

const port = 3900 + Math.floor(Math.random() * 90);
const origin = `http://localhost:${port}`;
let dataDir = "";
let server: ChildProcess | null = null;

async function startServer() {
  server = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "start", "-p", String(port)], {
    env: { ...process.env, NODE_ENV: "production", DATA_DIR: dataDir, COOKIE_SECURE: "false", ADMIN_EMAILS: "admin@example.test", EMAIL_PROVIDER: "none" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let log = "";
  server.stdout?.on("data", (chunk) => { log += String(chunk); });
  server.stderr?.on("data", (chunk) => { log += String(chunk); });
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not start.\n${log}`);
}

async function stopServer() {
  if (!server) return;
  const exited = new Promise((resolve) => server?.once("exit", resolve));
  server.kill("SIGTERM");
  await exited;
  server = null;
}

before(async () => {
  dataDir = await mkdtemp(path.join(os.tmpdir(), "learning-tracker-e2e-"));
  await startServer();
});
after(async () => {
  await stopServer();
  await rm(dataDir, { recursive: true, force: true });
});

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
