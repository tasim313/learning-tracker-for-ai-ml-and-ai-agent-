import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isSameOriginMutation, readCookie, secureCookies, sessionCookieName } from "@/lib/auth/cookies";
import { RateLimitError } from "@/lib/auth/rate-limit";
import type { PublicUser, SessionRecord } from "@/lib/auth/schemas";
import { AuthError, validateSessionToken, type RequestContext } from "@/lib/auth/service";
import { StorageError } from "@/lib/storage/file-store";

export function sessionTokenFrom(request: Request): string | null {
  return readCookie(request.headers.get("cookie"), sessionCookieName());
}

export function requestContext(request: Request): RequestContext {
  // Render's proxy appends the connecting client address as the last X-Forwarded-For entry;
  // earlier entries are client-supplied and not trusted for rate limiting.
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").map((value) => value.trim()).filter(Boolean);
  let origin: string | null;
  try {
    origin = new URL(request.url).origin;
  } catch {
    origin = null;
  }
  return {
    ip: forwarded?.at(-1) ?? request.headers.get("x-real-ip") ?? "unknown",
    userAgent: request.headers.get("user-agent") ?? "",
    origin
  };
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: string): NextResponse {
  response.cookies.set({
    name: sessionCookieName(),
    value: token,
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt)
  });
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set({ name: sessionCookieName(), value: "", httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}

export function jsonError(message: string, status = 400, headers?: Record<string, string>) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof RateLimitError) return jsonError(error.message, 429, { "Retry-After": String(error.retryAfterSeconds) });
  if (error instanceof AuthError) return jsonError(error.message, error.status);
  if (error instanceof StorageError) {
    if (error.status >= 500) console.error("Storage operation failed.", error);
    return jsonError(error.status >= 500 ? `${error.message} Nothing was saved.` : error.message, error.status);
  }
  if (error instanceof ZodError) return jsonError(error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
  if (error instanceof SyntaxError) return jsonError("Request body must be valid JSON.");
  if (error instanceof Error) return jsonError(error.message);
  console.error("Unexpected request failure.", error);
  return jsonError("The request could not be completed.", 500);
}

export type AuthedHandlerArgs<P> = {
  request: Request;
  params: P;
  user: PublicUser;
  session: SessionRecord;
};

type RouteContext<P> = { params: Promise<P> };

/**
 * Wrap a route handler so it always runs with an authenticated user derived
 * from the server-side session. Request bodies are never trusted for identity.
 */
export function withUser<P = Record<string, never>>(
  handler: (args: AuthedHandlerArgs<P>) => Promise<Response>,
  options: { role?: "admin" } = {}
) {
  return async (request: Request, context: RouteContext<P>): Promise<Response> => {
    try {
      if (!isSameOriginMutation(request)) return jsonError("Cross-site request rejected.", 403);
      const validated = await validateSessionToken(sessionTokenFrom(request));
      if (!validated) return jsonError("Sign in to continue.", 401);
      if (options.role === "admin" && validated.user.role !== "admin") return jsonError("Administrator access is required.", 403);
      const params = await context.params;
      const response = await handler({ request, params, user: validated.user, session: validated.session });
      response.headers.set("Cache-Control", "no-store");
      return response;
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/** For unauthenticated endpoints (sign-in, registration, recovery). */
export function withPublic(handler: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    try {
      if (!isSameOriginMutation(request)) return jsonError("Cross-site request rejected.", 403);
      const response = await handler(request);
      response.headers.set("Cache-Control", "no-store");
      return response;
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 20 * 1024 * 1024) throw new Error("Request body is too large.");
  const payload = await request.json() as unknown;
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) throw new Error("Request body must be a JSON object.");
  return payload as Record<string, unknown>;
}
