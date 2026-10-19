/** Shared by the proxy (edge-safe, no Node APIs) and route handlers. */
export function secureCookies(): boolean {
  const configured = process.env.COOKIE_SECURE?.trim().toLowerCase();
  if (configured === "true") return true;
  if (configured === "false") return false;
  return process.env.NODE_ENV === "production";
}

/** `__Host-` prefix requires Secure, Path=/ and no Domain, which pins the cookie to this exact host. */
export function sessionCookieName(): string {
  return secureCookies() ? "__Host-lt_session" : "lt_session";
}

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence in addition to SameSite=Lax: state-changing requests must come
 * from this site's own origin.
 */
export function isSameOriginMutation(request: Request): boolean {
  if (safeMethods.has(request.method.toUpperCase())) return true;
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin) {
    try {
      return host !== null && new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  return request.headers.get("sec-fetch-site") === "same-origin";
}
