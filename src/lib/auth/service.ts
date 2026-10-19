import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { readDocument, updateDocument } from "@/lib/storage/document";
import { deleteUserData, loadUserData } from "@/lib/storage/user-store";
import { emailDeliveryAvailable, sendMail } from "@/lib/email/mailer";
import { consumeRateLimit, rateLimits, resetRateLimit } from "@/lib/auth/rate-limit";
import { accountsStore, recordAudit, sessionsStore, tokensStore } from "@/lib/auth/stores";
import {
  emailSchema, passwordSchema, profileSchema, toPublicUser,
  type Account, type Profile, type PublicUser, type Role, type SessionRecord
} from "@/lib/auth/schemas";

export class AuthError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "AuthError";
  }
}

export type RequestContext = { ip: string; userAgent: string; origin: string | null };

const hourMs = 3_600_000;
const dayMs = 24 * hourMs;
const absoluteSessionMs = 90 * dayMs;
const lockoutThreshold = 10;
const lockoutMs = 15 * 60_000;
const tokenLifetimes = { "verify-email": 48 * hourMs, "password-reset": hourMs } as const;
const invalidCredentials = "The email or password is incorrect.";

let dummyHash: Promise<string> | null = null;

function sessionTtlMs(): number {
  const days = Number.parseInt(process.env.SESSION_TTL_DAYS ?? "14", 10);
  return (Number.isInteger(days) && days >= 1 && days <= 90 ? days : 14) * dayMs;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

function adminEmails(): Set<string> {
  return new Set((process.env.ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));
}

function parseEmail(value: unknown): string {
  const parsed = emailSchema.safeParse(value);
  if (!parsed.success) throw new AuthError("Enter a valid email address.");
  return parsed.data;
}

function parsePassword(value: unknown, email?: string): string {
  const parsed = passwordSchema.safeParse(value);
  if (!parsed.success) throw new AuthError(parsed.error.issues[0]?.message ?? "Choose a stronger password.");
  if (email && parsed.data.trim().toLowerCase() === email) throw new AuthError("Your password must not be your email address.");
  return parsed.data;
}

export function appBaseUrl(context: Pick<RequestContext, "origin">): string | null {
  const configured = process.env.APP_URL?.trim() || process.env.RENDER_EXTERNAL_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  // Never build emailed links from request headers in production (host-header injection).
  return process.env.NODE_ENV === "production" ? null : context.origin;
}

async function findAccountByEmail(email: string): Promise<Account | undefined> {
  return (await readDocument(accountsStore())).users.find((user) => user.email === email);
}

export async function findAccountById(userId: string): Promise<Account | undefined> {
  return (await readDocument(accountsStore())).users.find((user) => user.id === userId);
}

async function createSession(userId: string, context: RequestContext): Promise<{ token: string; expiresAt: string }> {
  const token = newToken();
  const now = Date.now();
  const record: SessionRecord = {
    id: randomUUID(),
    tokenHash: hashToken(token),
    userId,
    createdAt: new Date(now).toISOString(),
    lastUsedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + sessionTtlMs()).toISOString(),
    userAgent: context.userAgent.slice(0, 200)
  };
  await updateDocument(sessionsStore(), (document) => ({
    data: { ...document, sessions: [...document.sessions.filter((session) => Date.parse(session.expiresAt) > now), record] },
    result: undefined
  }));
  return { token, expiresAt: record.expiresAt };
}

async function issueOneTimeToken(userId: string, purpose: keyof typeof tokenLifetimes): Promise<string> {
  const token = newToken();
  const now = Date.now();
  await updateDocument(tokensStore(), (document) => ({
    data: {
      ...document,
      tokens: [
        // Only the newest token of a purpose stays valid; expired and used tokens are pruned.
        ...document.tokens.filter((item) => Date.parse(item.expiresAt) > now && item.usedAt === null && !(item.userId === userId && item.purpose === purpose)),
        { tokenHash: hashToken(token), userId, purpose, createdAt: new Date(now).toISOString(), expiresAt: new Date(now + tokenLifetimes[purpose]).toISOString(), usedAt: null }
      ]
    },
    result: undefined
  }));
  return token;
}

async function consumeOneTimeToken(token: unknown, purpose: keyof typeof tokenLifetimes): Promise<string> {
  if (typeof token !== "string" || token.length < 20 || token.length > 200) throw new AuthError("This link is invalid or has expired.");
  const tokenHash = hashToken(token);
  return updateDocument(tokensStore(), (document) => {
    const now = Date.now();
    const match = document.tokens.find((item) => item.tokenHash === tokenHash && item.purpose === purpose);
    if (!match || match.usedAt !== null || Date.parse(match.expiresAt) <= now) throw new AuthError("This link is invalid or has expired.");
    return {
      data: { ...document, tokens: document.tokens.map((item) => item === match ? { ...item, usedAt: new Date(now).toISOString() } : item) },
      result: match.userId
    };
  });
}

async function sendVerificationEmail(account: Account, context: RequestContext): Promise<boolean> {
  const base = appBaseUrl(context);
  if (!base || !emailDeliveryAvailable()) return false;
  const token = await issueOneTimeToken(account.id, "verify-email");
  const result = await sendMail({
    to: account.email,
    subject: "Verify your Learning Tracker email",
    text: `Confirm your email address by opening this link within 48 hours:\n\n${base}/verify-email?token=${token}\n\nIf you did not create an account, you can ignore this message.`
  });
  return result.delivered;
}

export async function register(input: { email: unknown; password: unknown; displayName?: unknown }, context: RequestContext) {
  consumeRateLimit(`register:ip:${context.ip}`, rateLimits.registerPerIp);
  const email = parseEmail(input.email);
  const password = parsePassword(input.password, email);
  const displayName = typeof input.displayName === "string" ? input.displayName.trim().slice(0, 80) : "";
  const passwordHash = await hash(password);
  const now = new Date().toISOString();
  const role: Role = adminEmails().has(email) ? "admin" : "learner";
  const account = await updateDocument(accountsStore(), (document) => {
    if (document.users.some((user) => user.email === email)) throw new AuthError("An account with this email already exists. Sign in or reset your password.", 409);
    const created: Account = {
      id: randomUUID(), email, passwordHash, role, emailVerifiedAt: null, createdAt: now, updatedAt: now,
      passwordChangedAt: now, lastLoginAt: now, failedLoginCount: 0, lockedUntil: null,
      profile: profileSchema.parse({ displayName })
    };
    return { data: { ...document, users: [...document.users, created] }, result: created };
  });
  try {
    await loadUserData(account.id);
  } catch (error) {
    // Do not leave an account without a usable learning workspace.
    await updateDocument(accountsStore(), (document) => ({ data: { ...document, users: document.users.filter((user) => user.id !== account.id) }, result: undefined }));
    throw error;
  }
  if (role === "admin") {
    await recordAudit({ actorUserId: account.id, action: "account.admin-granted", targetType: "account", targetId: account.id, details: "Granted at registration from ADMIN_EMAILS." });
  }
  const verificationSent = await sendVerificationEmail(account, context);
  const session = await createSession(account.id, context);
  return { user: toPublicUser(account), session, verificationSent };
}

function verificationRequired(): boolean {
  return process.env.REQUIRE_EMAIL_VERIFICATION === "true" && emailDeliveryAvailable();
}

export async function login(input: { email: unknown; password: unknown }, context: RequestContext) {
  consumeRateLimit(`login:ip:${context.ip}`, rateLimits.loginPerIp);
  const emailResult = emailSchema.safeParse(input.email);
  const password = typeof input.password === "string" ? input.password.slice(0, 256) : "";
  if (!emailResult.success || !password) throw new AuthError(invalidCredentials, 401);
  const email = emailResult.data;
  consumeRateLimit(`login:email:${email}`, rateLimits.loginPerEmail);
  const account = await findAccountByEmail(email);
  if (!account) {
    dummyHash ??= hash("timing-equalization-placeholder");
    await verify(await dummyHash, password).catch(() => false);
    throw new AuthError(invalidCredentials, 401);
  }
  const valid = await verify(account.passwordHash, password).catch(() => false);
  const now = Date.now();
  if (account.lockedUntil && Date.parse(account.lockedUntil) > now) {
    throw new AuthError("Too many attempts. Please wait before trying again.", 429);
  }
  if (!valid) {
    await updateDocument(accountsStore(), (document) => ({
      data: {
        ...document,
        users: document.users.map((user) => {
          if (user.id !== account.id) return user;
          const failures = user.failedLoginCount + 1;
          return failures >= lockoutThreshold
            ? { ...user, failedLoginCount: 0, lockedUntil: new Date(now + lockoutMs).toISOString() }
            : { ...user, failedLoginCount: failures };
        })
      },
      result: undefined
    }));
    throw new AuthError(invalidCredentials, 401);
  }
  if (verificationRequired() && !account.emailVerifiedAt) {
    throw new AuthError("Verify your email address before signing in. Check your inbox for the link.", 403);
  }
  await updateDocument(accountsStore(), (document) => ({
    data: { ...document, users: document.users.map((user) => user.id === account.id ? { ...user, failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date(now).toISOString() } : user) },
    result: undefined
  }));
  resetRateLimit(`login:email:${email}`);
  const session = await createSession(account.id, context);
  return { user: toPublicUser(account), session };
}

export type ValidatedSession = { user: PublicUser; session: SessionRecord };

/** Validate a session token from the cookie. Returns null for unknown, expired, or orphaned sessions. */
export async function validateSessionToken(token: string | null | undefined, now = Date.now()): Promise<ValidatedSession | null> {
  if (!token || token.length > 200) return null;
  const tokenHash = hashToken(token);
  const document = await readDocument(sessionsStore());
  const session = document.sessions.find((item) => item.tokenHash === tokenHash);
  if (!session || Date.parse(session.expiresAt) <= now) return null;
  const account = await findAccountById(session.userId);
  if (!account) return null;
  if (now - Date.parse(session.lastUsedAt) > hourMs) {
    const expiresAt = new Date(Math.min(now + sessionTtlMs(), Date.parse(session.createdAt) + absoluteSessionMs)).toISOString();
    await updateDocument(sessionsStore(), (current) => ({
      data: { ...current, sessions: current.sessions.map((item) => item.id === session.id ? { ...item, lastUsedAt: new Date(now).toISOString(), expiresAt } : item) },
      result: undefined
    })).catch((error) => console.error("Unable to extend session.", error));
  }
  return { user: toPublicUser(account), session };
}

export async function logout(token: string | null | undefined): Promise<void> {
  if (!token) return;
  const tokenHash = hashToken(token);
  await updateDocument(sessionsStore(), (document) => ({
    data: { ...document, sessions: document.sessions.filter((session) => session.tokenHash !== tokenHash) },
    result: undefined
  }));
}

export async function listSessions(userId: string) {
  const document = await readDocument(sessionsStore());
  return document.sessions
    .filter((session) => session.userId === userId && Date.parse(session.expiresAt) > Date.now())
    .map(({ id, createdAt, lastUsedAt, expiresAt, userAgent }) => ({ id, createdAt, lastUsedAt, expiresAt, userAgent }));
}

/** Revoke one of the caller's own sessions. Session ids of other users are treated as not found. */
export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  await updateDocument(sessionsStore(), (document) => {
    if (!document.sessions.some((session) => session.id === sessionId && session.userId === userId)) throw new AuthError("Session was not found.", 404);
    return { data: { ...document, sessions: document.sessions.filter((session) => session.id !== sessionId) }, result: undefined };
  });
}

async function revokeAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
  await updateDocument(sessionsStore(), (document) => ({
    data: { ...document, sessions: document.sessions.filter((session) => session.userId !== userId || session.id === exceptSessionId) },
    result: undefined
  }));
}

async function setPassword(userId: string, password: string): Promise<void> {
  const passwordHash = await hash(password);
  const now = new Date().toISOString();
  await updateDocument(accountsStore(), (document) => {
    if (!document.users.some((user) => user.id === userId)) throw new AuthError("Account was not found.", 404);
    return {
      data: { ...document, users: document.users.map((user) => user.id === userId ? { ...user, passwordHash, passwordChangedAt: now, updatedAt: now, failedLoginCount: 0, lockedUntil: null } : user) },
      result: undefined
    };
  });
}

export async function changePassword(userId: string, currentSessionId: string, input: { currentPassword: unknown; newPassword: unknown }) {
  const account = await findAccountById(userId);
  if (!account) throw new AuthError("Account was not found.", 404);
  const ok = typeof input.currentPassword === "string" && await verify(account.passwordHash, input.currentPassword).catch(() => false);
  if (!ok) throw new AuthError("Your current password is incorrect.", 403);
  const password = parsePassword(input.newPassword, account.email);
  await setPassword(userId, password);
  await revokeAllSessions(userId, currentSessionId);
}

/** Always resolves without revealing whether the email has an account. */
export async function requestPasswordReset(input: { email: unknown }, context: RequestContext): Promise<{ deliveryAvailable: boolean }> {
  consumeRateLimit(`reset:ip:${context.ip}`, rateLimits.resetPerIp);
  const deliveryAvailable = emailDeliveryAvailable() && appBaseUrl(context) !== null;
  const parsed = emailSchema.safeParse(input.email);
  if (!parsed.success) return { deliveryAvailable };
  consumeRateLimit(`reset:email:${parsed.data}`, rateLimits.resetPerEmail);
  const account = await findAccountByEmail(parsed.data);
  if (!account || !deliveryAvailable) return { deliveryAvailable };
  const token = await issueOneTimeToken(account.id, "password-reset");
  await sendMail({
    to: account.email,
    subject: "Reset your Learning Tracker password",
    text: `A password reset was requested for this account. Open this link within 1 hour to choose a new password:\n\n${appBaseUrl(context)}/reset-password?token=${token}\n\nIf you did not request this, you can ignore this message; your password is unchanged.`
  });
  return { deliveryAvailable };
}

/** Create a reset link for an account without email delivery (operator CLI). */
export async function createPasswordResetLink(email: string, baseUrl: string): Promise<string> {
  const account = await findAccountByEmail(parseEmail(email));
  if (!account) throw new AuthError("No account uses that email address.", 404);
  const token = await issueOneTimeToken(account.id, "password-reset");
  return `${baseUrl.replace(/\/+$/, "")}/reset-password?token=${token}`;
}

export async function resetPassword(input: { token: unknown; password: unknown }): Promise<void> {
  parsePassword(input.password); // reject weak passwords before the single-use token is consumed
  const userId = await consumeOneTimeToken(input.token, "password-reset");
  const account = await findAccountById(userId);
  if (!account) throw new AuthError("This link is invalid or has expired.");
  await setPassword(userId, parsePassword(input.password, account.email));
  await revokeAllSessions(userId);
}

export async function resendVerification(userId: string, context: RequestContext): Promise<boolean> {
  consumeRateLimit(`verify:user:${userId}`, rateLimits.verifyPerUser);
  const account = await findAccountById(userId);
  if (!account) throw new AuthError("Account was not found.", 404);
  if (account.emailVerifiedAt) return true;
  return sendVerificationEmail(account, context);
}

export async function verifyEmail(input: { token: unknown }): Promise<void> {
  const userId = await consumeOneTimeToken(input.token, "verify-email");
  const now = new Date().toISOString();
  await updateDocument(accountsStore(), (document) => ({
    data: { ...document, users: document.users.map((user) => user.id === userId ? { ...user, emailVerifiedAt: user.emailVerifiedAt ?? now, updatedAt: now } : user) },
    result: undefined
  }));
}

export async function updateProfile(userId: string, input: unknown): Promise<PublicUser> {
  const current = await findAccountById(userId);
  if (!current) throw new AuthError("Account was not found.", 404);
  const parsed = profileSchema.safeParse({ ...current.profile, ...(typeof input === "object" && input !== null ? input : {}) });
  if (!parsed.success) throw new AuthError(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
  const profile: Profile = parsed.data;
  return updateDocument(accountsStore(), (document) => {
    const account = document.users.find((user) => user.id === userId);
    if (!account) throw new AuthError("Account was not found.", 404);
    const updated = { ...account, profile, updatedAt: new Date().toISOString() };
    return { data: { ...document, users: document.users.map((user) => user.id === userId ? updated : user) }, result: toPublicUser(updated) };
  });
}

/** Permanently delete the account, all learning data and backups, sessions, and tokens. */
export async function deleteAccount(userId: string, input: { password: unknown; confirmation: unknown }): Promise<void> {
  const account = await findAccountById(userId);
  if (!account) throw new AuthError("Account was not found.", 404);
  if (input.confirmation !== "DELETE") throw new AuthError("Type DELETE to confirm permanent account deletion.");
  const ok = typeof input.password === "string" && await verify(account.passwordHash, input.password).catch(() => false);
  if (!ok) throw new AuthError("Your password is incorrect.", 403);
  if (account.role === "admin") {
    const admins = (await readDocument(accountsStore())).users.filter((user) => user.role === "admin");
    if (admins.length === 1) throw new AuthError("Assign another administrator before deleting the only administrator account.", 409);
  }
  await revokeAllSessions(userId);
  await updateDocument(tokensStore(), (document) => ({ data: { ...document, tokens: document.tokens.filter((token) => token.userId !== userId) }, result: undefined }));
  await deleteUserData(userId);
  await updateDocument(accountsStore(), (document) => ({ data: { ...document, users: document.users.filter((user) => user.id !== userId) }, result: undefined }));
  await recordAudit({ actorUserId: null, action: "account.deleted", targetType: "account", targetId: userId, details: "Account and all learning data deleted by the account holder." });
}

/** Account metadata for administrators. Learning records are deliberately not included. */
export async function listAccountsForAdmin() {
  const document = await readDocument(accountsStore());
  return document.users.map((user) => ({
    id: user.id, email: user.email, role: user.role, emailVerified: user.emailVerifiedAt !== null,
    createdAt: user.createdAt, lastLoginAt: user.lastLoginAt
  }));
}

export async function setAccountRole(actor: PublicUser, targetUserId: string, requestedRole: unknown): Promise<void> {
  if (actor.role !== "admin") throw new AuthError("Administrator access is required.", 403);
  if (requestedRole !== "admin" && requestedRole !== "learner") throw new AuthError("Unknown role.");
  const role: Role = requestedRole;
  await updateDocument(accountsStore(), (document) => {
    const target = document.users.find((user) => user.id === targetUserId);
    if (!target) throw new AuthError("Account was not found.", 404);
    if (target.role === "admin" && role === "learner" && document.users.filter((user) => user.role === "admin").length === 1) {
      throw new AuthError("At least one administrator must remain.", 409);
    }
    return { data: { ...document, users: document.users.map((user) => user.id === targetUserId ? { ...user, role, updatedAt: new Date().toISOString() } : user) }, result: undefined };
  });
  await recordAudit({ actorUserId: actor.id, action: "account.role-changed", targetType: "account", targetId: targetUserId, details: `Role set to ${role}.` });
}
