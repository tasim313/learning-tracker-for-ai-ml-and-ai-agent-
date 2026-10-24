import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { call, sessionCookieFrom, strongPassword, uniqueEmail, useTemporaryDataDir } from "./helpers";
import * as registerRoute from "../src/app/api/auth/register/route";
import * as loginRoute from "../src/app/api/auth/login/route";
import * as logoutRoute from "../src/app/api/auth/logout/route";
import * as resetRequestRoute from "../src/app/api/auth/password-reset/request/route";
import * as resetConfirmRoute from "../src/app/api/auth/password-reset/confirm/route";
import * as verifyRoute from "../src/app/api/auth/verify-email/route";
import * as accountRoute from "../src/app/api/account/route";
import * as passwordRoute from "../src/app/api/account/password/route";
import * as sessionsRoute from "../src/app/api/account/sessions/route";
import * as settingsRoute from "../src/app/api/settings/route";
import { clearRateLimitsForTest } from "../src/lib/auth/rate-limit";
import { validateSessionToken } from "../src/lib/auth/service";
import { consoleOutbox } from "../src/lib/email/mailer";

let dataDir: Awaited<ReturnType<typeof useTemporaryDataDir>>;
let ipCounter = 0;

before(async () => {
  Object.assign(process.env, { NODE_ENV: "test", EMAIL_PROVIDER: "console" });
  dataDir = await useTemporaryDataDir();
});
after(async () => dataDir.cleanup());
beforeEach(() => clearRateLimitsForTest());

async function register(email = uniqueEmail(), password = strongPassword) {
  ipCounter += 1;
  const response = await call(registerRoute.POST, "POST", "/api/auth/register", { body: { email, password, displayName: "Test" }, ip: `198.51.100.${ipCounter}` });
  assert.equal(response.status, 201, JSON.stringify(response.json));
  return { email, cookie: sessionCookieFrom(response.headers), user: response.json.user as { id: string } };
}

function tokenFromLatestEmail(kind: "reset-password" | "verify-email") {
  const message = [...consoleOutbox()].reverse().find((item) => item.text.includes(`/${kind}?token=`));
  assert.ok(message, `expected a ${kind} email`);
  return /token=([A-Za-z0-9_-]+)/.exec(message.text)![1];
}

test("registration validates input and rejects duplicate emails", async () => {
  const bad = await call(registerRoute.POST, "POST", "/api/auth/register", { body: { email: "not-an-email", password: strongPassword } });
  assert.equal(bad.status, 400);
  const weak = await call(registerRoute.POST, "POST", "/api/auth/register", { body: { email: uniqueEmail(), password: "short" } });
  assert.equal(weak.status, 400);
  assert.match(String(weak.json.error), /12 characters/);
  const { email } = await register();
  const duplicate = await call(registerRoute.POST, "POST", "/api/auth/register", { body: { email: email.toUpperCase(), password: strongPassword }, ip: "198.51.100.250" });
  assert.equal(duplicate.status, 409);
});

test("passwords are stored only as bcrypt hashes and sessions only as token hashes", async () => {
  const { email, cookie } = await register();
  const accounts = await readFile(path.join(dataDir.directory, "system", "accounts.json"), "utf8");
  assert.ok(!accounts.includes(strongPassword));
  assert.match(accounts, /\$2[ab]\$/);
  const token = cookie.split("=")[1];
  const sessions = await readFile(path.join(dataDir.directory, "system", "sessions.json"), "utf8");
  assert.ok(!sessions.includes(token), "raw session token must not be stored");
  assert.ok(accounts.includes(email));
});

test("session cookie is HttpOnly and SameSite=Lax", async () => {
  ipCounter += 1;
  const response = await call(registerRoute.POST, "POST", "/api/auth/register", { body: { email: uniqueEmail(), password: strongPassword }, ip: `198.51.100.${ipCounter}` });
  const header = response.headers.get("set-cookie") ?? "";
  assert.match(header, /HttpOnly/i);
  assert.match(header, /SameSite=lax/i);
  assert.match(header, /Path=\//);
});

test("login accepts correct credentials and rejects wrong ones with a generic message", async () => {
  const { email } = await register();
  const wrong = await call(loginRoute.POST, "POST", "/api/auth/login", { body: { email, password: "incorrect password!!" } });
  assert.equal(wrong.status, 401);
  const unknown = await call(loginRoute.POST, "POST", "/api/auth/login", { body: { email: uniqueEmail(), password: strongPassword } });
  assert.equal(unknown.status, 401);
  assert.equal(wrong.json.error, unknown.json.error, "unknown and wrong-password responses must be indistinguishable");
  const ok = await call(loginRoute.POST, "POST", "/api/auth/login", { body: { email, password: strongPassword } });
  assert.equal(ok.status, 200);
  assert.equal((ok.json.user as Record<string, unknown>).passwordHash, undefined);
  sessionCookieFrom(ok.headers);
});

test("protected APIs reject anonymous, invalid, and cross-site requests", async () => {
  assert.equal((await call(settingsRoute.GET, "GET", "/api/settings")).status, 401);
  assert.equal((await call(settingsRoute.GET, "GET", "/api/settings", { cookie: "lt_session=forged-token-value" })).status, 401);
  const { cookie } = await register();
  assert.equal((await call(settingsRoute.GET, "GET", "/api/settings", { cookie })).status, 200);
  const crossSite = await call(settingsRoute.PATCH, "PATCH", "/api/settings", { cookie, origin: "https://evil.example", body: { timezone: "UTC", weeklyHours: 5, studyDays: [] } });
  assert.equal(crossSite.status, 403);
  const noOrigin = await call(settingsRoute.PATCH, "PATCH", "/api/settings", { cookie, origin: null, body: { timezone: "UTC", weeklyHours: 5, studyDays: [] } });
  assert.equal(noOrigin.status, 403);
});

test("logout revokes the session on the server", async () => {
  const { cookie } = await register();
  const out = await call(logoutRoute.POST, "POST", "/api/auth/logout", { cookie });
  assert.equal(out.status, 200);
  assert.match(out.headers.get("set-cookie") ?? "", /Max-Age=0/i);
  assert.equal((await call(settingsRoute.GET, "GET", "/api/settings", { cookie })).status, 401);
});

test("sessions expire after the idle lifetime", async () => {
  const { cookie } = await register();
  const token = cookie.split("=")[1];
  assert.ok(await validateSessionToken(token));
  assert.equal(await validateSessionToken(token, Date.now() + 15 * 24 * 3600_000), null);
});

test("login is rate limited per email and accounts lock after repeated failures", async () => {
  const { email } = await register();
  const statuses: number[] = [];
  for (let attempt = 0; attempt < 11; attempt += 1) {
    statuses.push((await call(loginRoute.POST, "POST", "/api/auth/login", { body: { email, password: "wrong password value" }, ip: `192.0.2.${attempt}` })).status);
  }
  assert.deepEqual(statuses.slice(0, 10), Array(10).fill(401));
  assert.equal(statuses[10], 429);
  clearRateLimitsForTest();
  // The persistent lockout survives the in-memory limiter being cleared (e.g. a restart).
  const locked = await call(loginRoute.POST, "POST", "/api/auth/login", { body: { email, password: strongPassword } });
  assert.equal(locked.status, 429);
});

test("password reset sends a single-use link, changes the password, and revokes sessions", async () => {
  const { email, cookie } = await register();
  const unknown = await call(resetRequestRoute.POST, "POST", "/api/auth/password-reset/request", { body: { email: uniqueEmail() } });
  const known = await call(resetRequestRoute.POST, "POST", "/api/auth/password-reset/request", { body: { email } });
  assert.equal(unknown.status, 200);
  assert.equal(known.json.message, unknown.json.message, "response must not reveal whether the account exists");
  const token = tokenFromLatestEmail("reset-password");
  const weak = await call(resetConfirmRoute.POST, "POST", "/api/auth/password-reset/confirm", { body: { token, password: "short" } });
  assert.equal(weak.status, 400);
  const newPassword = "a completely different passphrase";
  // A rejected weak password does not consume the link.
  const fresh = token;
  assert.equal((await call(resetConfirmRoute.POST, "POST", "/api/auth/password-reset/confirm", { body: { token: fresh, password: newPassword } })).status, 200);
  assert.equal((await call(resetConfirmRoute.POST, "POST", "/api/auth/password-reset/confirm", { body: { token: fresh, password: newPassword } })).status, 400, "token is single use");
  assert.equal((await call(settingsRoute.GET, "GET", "/api/settings", { cookie })).status, 401, "existing sessions are revoked");
  assert.equal((await call(loginRoute.POST, "POST", "/api/auth/login", { body: { email, password: strongPassword } })).status, 401);
  assert.equal((await call(loginRoute.POST, "POST", "/api/auth/login", { body: { email, password: newPassword } })).status, 200);
});

test("email verification marks the account verified", async () => {
  const { cookie } = await register();
  const token = tokenFromLatestEmail("verify-email");
  assert.equal((await call(accountRoute.GET, "GET", "/api/account", { cookie })).json.user && ((await call(accountRoute.GET, "GET", "/api/account", { cookie })).json.user as { emailVerified: boolean }).emailVerified, false);
  assert.equal((await call(verifyRoute.POST, "POST", "/api/auth/verify-email", { body: { token } })).status, 200);
  const account = await call(accountRoute.GET, "GET", "/api/account", { cookie });
  assert.equal((account.json.user as { emailVerified: boolean }).emailVerified, true);
  assert.equal((await call(verifyRoute.POST, "POST", "/api/auth/verify-email", { body: { token: "x".repeat(43) } })).status, 400);
});

test("changing the password requires the current password and revokes other sessions", async () => {
  const { email, cookie } = await register();
  const second = sessionCookieFrom((await call(loginRoute.POST, "POST", "/api/auth/login", { body: { email, password: strongPassword } })).headers);
  const listed = await call(sessionsRoute.GET, "GET", "/api/account/sessions", { cookie });
  assert.equal(listed.json.length, 2);
  assert.equal((await call(passwordRoute.POST, "POST", "/api/account/password", { cookie, body: { currentPassword: "wrong wrong wrong", newPassword: "another long passphrase" } })).status, 403);
  assert.equal((await call(passwordRoute.POST, "POST", "/api/account/password", { cookie, body: { currentPassword: strongPassword, newPassword: "another long passphrase" } })).status, 200);
  assert.equal((await call(settingsRoute.GET, "GET", "/api/settings", { cookie })).status, 200, "current session stays valid");
  assert.equal((await call(settingsRoute.GET, "GET", "/api/settings", { cookie: second })).status, 401, "other sessions are revoked");
});

test("profile updates are validated", async () => {
  const { cookie } = await register();
  const ok = await call(accountRoute.PATCH, "PATCH", "/api/account", { cookie, body: { displayName: "Learner", preferredLanguage: "bn", experienceLevel: "intermediate" } });
  assert.equal(ok.status, 200);
  assert.equal((ok.json.user as { profile: { preferredLanguage: string } }).profile.preferredLanguage, "bn");
  const bad = await call(accountRoute.PATCH, "PATCH", "/api/account", { cookie, body: { preferredLanguage: "xx" } });
  assert.equal(bad.status, 400);
});

test("account deletion requires the password and removes all of the user's data", async () => {
  const { cookie, user } = await register();
  assert.ok((await readdir(path.join(dataDir.directory, "users"))).includes(user.id));
  assert.equal((await call(accountRoute.DELETE, "DELETE", "/api/account", { cookie, body: { password: strongPassword, confirmation: "nope" } })).status, 400);
  assert.equal((await call(accountRoute.DELETE, "DELETE", "/api/account", { cookie, body: { password: "wrong password!!", confirmation: "DELETE" } })).status, 403);
  assert.equal((await call(accountRoute.DELETE, "DELETE", "/api/account", { cookie, body: { password: strongPassword, confirmation: "DELETE" } })).status, 200);
  assert.ok(!(await readdir(path.join(dataDir.directory, "users"))).includes(user.id));
  assert.equal((await call(settingsRoute.GET, "GET", "/api/settings", { cookie })).status, 401);
  const accounts = await readFile(path.join(dataDir.directory, "system", "accounts.json"), "utf8");
  assert.ok(!accounts.includes(user.id));
});
