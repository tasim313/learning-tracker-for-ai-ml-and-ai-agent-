/**
 * Fixed-window rate limiter held in memory. This is adequate because the
 * deployment is pinned to one application instance; persistent per-account
 * lockout (accounts.json) adds protection that survives restarts.
 */
type Window = { count: number; resetAt: number };
const windows = new Map<string, Window>();

export type RateLimitRule = { limit: number; windowMs: number };

export const rateLimits = {
  loginPerIp: { limit: 30, windowMs: 15 * 60_000 },
  loginPerEmail: { limit: 10, windowMs: 15 * 60_000 },
  registerPerIp: { limit: 10, windowMs: 60 * 60_000 },
  resetPerIp: { limit: 10, windowMs: 15 * 60_000 },
  resetPerEmail: { limit: 3, windowMs: 60 * 60_000 },
  verifyPerUser: { limit: 5, windowMs: 60 * 60_000 }
} satisfies Record<string, RateLimitRule>;

export class RateLimitError extends Error {
  constructor(public retryAfterSeconds: number) {
    super("Too many attempts. Please wait before trying again.");
    this.name = "RateLimitError";
  }
}

/** Count an attempt; throws RateLimitError when the window is exhausted. */
export function consumeRateLimit(key: string, rule: RateLimitRule, now = Date.now()): void {
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + rule.windowMs });
    if (windows.size > 50_000) pruneExpired(now);
    return;
  }
  if (current.count >= rule.limit) throw new RateLimitError(Math.ceil((current.resetAt - now) / 1000));
  current.count += 1;
}

export function resetRateLimit(key: string): void {
  windows.delete(key);
}

export function clearRateLimitsForTest(): void {
  windows.clear();
}

function pruneExpired(now: number) {
  for (const [key, window] of windows) if (window.resetAt <= now) windows.delete(key);
}
