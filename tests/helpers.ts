import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/** Run each test file against its own empty DATA_DIR. */
export async function useTemporaryDataDir(): Promise<{ directory: string; cleanup: () => Promise<void> }> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "learning-tracker-test-"));
  const previous = process.env.DATA_DIR;
  process.env.DATA_DIR = directory;
  return {
    directory,
    cleanup: async () => {
      if (previous === undefined) delete process.env.DATA_DIR;
      else process.env.DATA_DIR = previous;
      await rm(directory, { recursive: true, force: true });
    }
  };
}

type Handler = (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>;

export type CallOptions = {
  cookie?: string;
  body?: unknown;
  params?: Record<string, string>;
  /** Defaults to a same-origin request. Pass null to omit the Origin header, or a foreign origin. */
  origin?: string | null;
  ip?: string;
};

const base = "http://localhost:3000";

/** Invoke a Next.js route handler the same way the framework does. */
export async function call(handler: unknown, method: string, url: string, options: CallOptions = {}) {
  const headers: Record<string, string> = { host: "localhost:3000", "user-agent": "test-agent", "x-forwarded-for": options.ip ?? "203.0.113.10" };
  if (options.origin !== null) headers.origin = options.origin ?? base;
  if (options.cookie) headers.cookie = options.cookie;
  if (options.body !== undefined) headers["content-type"] = "application/json";
  const request = new Request(`${base}${url}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const response = await (handler as Handler)(request, { params: Promise.resolve(options.params ?? {}) });
  const text = await response.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: response.status, json: json as Record<string, unknown> & unknown[], headers: response.headers };
}

export function sessionCookieFrom(headers: Headers): string {
  const header = headers.get("set-cookie") ?? "";
  const match = /(lt_session|__Host-lt_session)=([^;]*)/.exec(header);
  if (!match || !match[2]) throw new Error("Response did not set a session cookie.");
  return `${match[1]}=${match[2]}`;
}

let counter = 0;
export function uniqueEmail(prefix = "learner") {
  counter += 1;
  return `${prefix}${counter}-${Date.now()}@example.test`;
}

export const strongPassword = "correct horse battery staple";
