import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginMutation, sessionCookieName } from "@/lib/auth/cookies";

/**
 * Optimistic gate only: it checks that a session cookie is present. Every page
 * and route handler still validates the session server-side before reading data.
 */
const publicPages = new Set(["/", "/api/health", "/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/privacy"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  if (isApi && !isSameOriginMutation(request)) {
    return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  if (publicPages.has(pathname) || pathname.startsWith("/api/auth/")) return NextResponse.next();
  if (request.cookies.has(sessionCookieName())) return NextResponse.next();
  if (isApi) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)"]
};
