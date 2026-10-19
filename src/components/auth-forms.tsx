"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";

type Status = { kind: "idle" | "pending" | "error" | "success"; message?: string };

async function postJson(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "The request could not be completed.");
  return payload;
}

/** Only allow same-site relative redirects after sign-in. */
export function safeNextPath(value: string | null | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/dashboard";
}

function Field({ label, name, type = "text", autoComplete, required = true, minLength, hint }: {
  label: string; name: string; type?: string; autoComplete?: string; required?: boolean; minLength?: number; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-800">
        {label}
        <input
          name={name} type={type} autoComplete={autoComplete} required={required} minLength={minLength}
          aria-describedby={hint ? `${name}-hint` : undefined}
          className="mt-1.5 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-2 focus:outline-blue-200"
        />
      </label>
      {hint && <p id={`${name}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function StatusMessage({ status }: { status: Status }) {
  if (!status.message) return null;
  const tone = status.kind === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900";
  return <p role={status.kind === "error" ? "alert" : "status"} className={`rounded-lg border px-3 py-2 text-sm ${tone}`}>{status.message}</p>;
}

function Submit({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button type="submit" disabled={pending} className="min-h-11 w-full rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60">
      {pending ? "Please wait…" : children}
    </button>
  );
}

function formValues(event: FormEvent<HTMLFormElement>) {
  return Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
}

export function LoginForm({ next }: { next?: string }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event);
    setStatus({ kind: "pending" });
    try {
      await postJson("/api/auth/login", { email: values.email, password: values.password });
      window.location.assign(safeNextPath(next));
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Sign-in failed." });
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4" noValidate={false}>
      <Field label="Email" name="email" type="email" autoComplete="email" />
      <Field label="Password" name="password" type="password" autoComplete="current-password" />
      <StatusMessage status={status} />
      <Submit pending={status.kind === "pending"}>Sign in</Submit>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <Link href="/forgot-password" className="font-medium text-blue-800 underline-offset-2 focus-visible:underline">Forgot your password?</Link>
        <Link href="/register" className="font-medium text-blue-800 underline-offset-2 focus-visible:underline">Create an account</Link>
      </div>
    </form>
  );
}

export function RegisterForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event);
    if (values.password !== values.confirmPassword) {
      setStatus({ kind: "error", message: "The two passwords do not match." });
      return;
    }
    setStatus({ kind: "pending" });
    try {
      await postJson("/api/auth/register", { email: values.email, password: values.password, displayName: values.displayName });
      window.location.assign("/dashboard");
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Registration failed." });
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Display name (optional)" name="displayName" autoComplete="nickname" required={false} />
      <Field label="Email" name="email" type="email" autoComplete="email" />
      <Field label="Password" name="password" type="password" autoComplete="new-password" minLength={12} hint="At least 12 characters. A passphrase of several words works well." />
      <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} />
      <StatusMessage status={status} />
      <Submit pending={status.kind === "pending"}>Create account</Submit>
      <p className="text-xs leading-5 text-slate-500">
        Your learning records are private to your account. Read how data is stored and deleted in the <Link href="/privacy" className="underline">privacy notice</Link>.
      </p>
      <p className="text-sm">Already registered? <Link href="/login" className="font-medium text-blue-800 underline">Sign in</Link></p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event);
    setStatus({ kind: "pending" });
    try {
      const result = await postJson("/api/auth/password-reset/request", { email: values.email });
      setStatus({ kind: result.deliveryAvailable ? "success" : "error", message: String(result.message) });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "The request failed." });
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Account email" name="email" type="email" autoComplete="email" />
      <StatusMessage status={status} />
      <Submit pending={status.kind === "pending"}>Send reset link</Submit>
      <p className="text-sm"><Link href="/login" className="font-medium text-blue-800 underline">Back to sign in</Link></p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(event);
    if (values.password !== values.confirmPassword) {
      setStatus({ kind: "error", message: "The two passwords do not match." });
      return;
    }
    setStatus({ kind: "pending" });
    try {
      await postJson("/api/auth/password-reset/confirm", { token, password: values.password });
      setStatus({ kind: "success", message: "Your password was changed and all existing sessions were signed out. You can now sign in." });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Password reset failed." });
    }
  }
  if (!token) return <p role="alert" className="text-sm text-red-800">This reset link is incomplete. Request a new one from the <Link href="/forgot-password" className="underline">password recovery page</Link>.</p>;
  if (status.kind === "success") return <div className="space-y-4"><StatusMessage status={status} /><Link href="/login" className="inline-flex min-h-11 items-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white">Sign in</Link></div>;
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="New password" name="password" type="password" autoComplete="new-password" minLength={12} hint="At least 12 characters." />
      <Field label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} />
      <StatusMessage status={status} />
      <Submit pending={status.kind === "pending"}>Set new password</Submit>
    </form>
  );
}

/** Verification is a POST triggered by the user, so link scanners that prefetch URLs cannot consume the token. */
export function VerifyEmailForm({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  async function verify() {
    setStatus({ kind: "pending" });
    try {
      await postJson("/api/auth/verify-email", { token });
      setStatus({ kind: "success", message: "Your email address is verified." });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Verification failed." });
    }
  }
  if (!token) return <p role="alert" className="text-sm text-red-800">This verification link is incomplete.</p>;
  return (
    <div className="space-y-4">
      <StatusMessage status={status} />
      {status.kind === "success"
        ? <Link href="/dashboard" className="inline-flex min-h-11 items-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white">Go to your dashboard</Link>
        : <button type="button" onClick={verify} disabled={status.kind === "pending"} className="min-h-11 w-full rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-60">{status.kind === "pending" ? "Verifying…" : "Verify my email address"}</button>}
    </div>
  );
}
