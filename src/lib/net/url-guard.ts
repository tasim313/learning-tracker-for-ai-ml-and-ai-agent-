import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Server-side request forgery protection for outbound link checks. Only http(s)
 * URLs on standard ports are allowed, and every resolved address must be public.
 * A residual DNS-rebinding window exists between this check and the request; the
 * check endpoint is rate-limited and only reports reachability, never page content.
 */

function ipv4Private(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19))
    || a >= 224;
}

export function isPublicAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return !ipv4Private(ip);
  if (version === 6) {
    const lower = ip.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
    if (mapped) return !ipv4Private(mapped[1]);
    return !(lower === "::" || lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb") || lower.startsWith("ff") || lower.startsWith("64:ff9b"));
  }
  return false;
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("The link is not a valid URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Only http and https links can be checked.");
  if (url.username || url.password) throw new Error("Links with embedded credentials cannot be checked.");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("Only standard web ports can be checked.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) throw new Error("Private network addresses cannot be checked.");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => { throw new Error("The link's domain could not be resolved."); });
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) throw new Error("Private network addresses cannot be checked.");
  return url;
}

export type AvailabilityResult = { availability: "available" | "unavailable" | "needs-check"; statusCode: number | null; checkedAt: string; detail: string };

/** HEAD (falling back to GET) with manual redirect handling, re-validating every hop. */
export async function checkAvailability(raw: string, fetcher: typeof fetch = fetch): Promise<AvailabilityResult> {
  const checkedAt = new Date().toISOString();
  let current = raw;
  try {
    for (let hop = 0; hop < 4; hop += 1) {
      const url = await assertPublicUrl(current);
      let response = await fetcher(url, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "LearningTracker-LinkCheck/1.0" } });
      if (response.status === 405 || response.status === 501) {
        response = await fetcher(url, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "LearningTracker-LinkCheck/1.0" } });
        await response.body?.cancel().catch(() => undefined);
      }
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) { current = new URL(location, url).toString(); continue; }
      if (response.status < 300) return { availability: "available", statusCode: response.status, checkedAt, detail: "The link responded successfully." };
      if (response.status === 404 || response.status === 410) return { availability: "unavailable", statusCode: response.status, checkedAt, detail: "The page was not found." };
      return { availability: "needs-check", statusCode: response.status, checkedAt, detail: `The site answered with HTTP ${response.status}; it may block automated checks. Open it to confirm.` };
    }
    return { availability: "needs-check", statusCode: null, checkedAt, detail: "Too many redirects." };
  } catch (error) {
    return { availability: "needs-check", statusCode: null, checkedAt, detail: error instanceof Error && !/abort|timeout/i.test(error.message) ? error.message : "The site did not respond in time." };
  }
}
