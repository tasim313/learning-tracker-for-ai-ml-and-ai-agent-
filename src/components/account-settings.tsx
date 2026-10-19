"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";

type Profile = { displayName: string; learningGoals: string; preferredLanguage: "en" | "bn"; experienceLevel: "beginner" | "intermediate" | "advanced" };
type User = { id: string; email: string; role: string; emailVerified: boolean; createdAt: string; profile: Profile };
type SessionRow = { id: string; createdAt: string; lastUsedAt: string; expiresAt: string; userAgent: string; current: boolean };
type Notice = { tone: "error" | "success"; text: string } | null;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "The request failed.");
  return payload as T;
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function NoticeText({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return <p role={notice.tone === "error" ? "alert" : "status"} className={`mt-3 text-sm ${notice.tone === "error" ? "text-red-700" : "text-emerald-800"}`}>{notice.text}</p>;
}

const input = "mt-1.5 block min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm";
const primary = "inline-flex min-h-10 items-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-60";
const secondary = "inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 disabled:opacity-60";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function AccountSettings() {
  const [user, setUser] = useState<User | null>(null);
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loadError, setLoadError] = useState("");
  const [profileNotice, setProfileNotice] = useState<Notice>(null);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [sessionNotice, setSessionNotice] = useState<Notice>(null);
  const [verifyNotice, setVerifyNotice] = useState<Notice>(null);
  const [deleteNotice, setDeleteNotice] = useState<Notice>(null);
  const [pending, setPending] = useState("");

  const load = useCallback(async () => {
    try {
      const [account, sessionRows] = await Promise.all([
        request<{ user: User; emailDeliveryAvailable: boolean }>("/api/account"),
        request<SessionRow[]>("/api/account/sessions")
      ]);
      setUser(account.user);
      setEmailAvailable(account.emailDeliveryAvailable);
      setSessions(sessionRows);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Account details are unavailable.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setPending("profile");
    setProfileNotice(null);
    try {
      const result = await request<{ user: User }>("/api/account", { method: "PATCH", body: JSON.stringify(values) });
      setUser(result.user);
      setProfileNotice({ tone: "success", text: "Profile saved." });
    } catch (error) {
      setProfileNotice({ tone: "error", text: error instanceof Error ? error.message : "Profile was not saved." });
    } finally {
      setPending("");
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    if (values.newPassword !== values.confirmPassword) {
      setPasswordNotice({ tone: "error", text: "The new passwords do not match." });
      return;
    }
    setPending("password");
    setPasswordNotice(null);
    try {
      await request("/api/account/password", { method: "POST", body: JSON.stringify({ currentPassword: values.currentPassword, newPassword: values.newPassword }) });
      form.reset();
      setPasswordNotice({ tone: "success", text: "Password changed. Your other sessions were signed out." });
      await load();
    } catch (error) {
      setPasswordNotice({ tone: "error", text: error instanceof Error ? error.message : "Password was not changed." });
    } finally {
      setPending("");
    }
  }

  async function revoke(id: string) {
    setSessionNotice(null);
    try {
      await request(`/api/account/sessions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setSessions((rows) => rows.filter((row) => row.id !== id));
      setSessionNotice({ tone: "success", text: "Session signed out." });
    } catch (error) {
      setSessionNotice({ tone: "error", text: error instanceof Error ? error.message : "Session was not revoked." });
    }
  }

  async function resendVerification() {
    setVerifyNotice(null);
    try {
      const result = await request<{ sent: boolean }>("/api/auth/resend-verification", { method: "POST" });
      setVerifyNotice(result.sent ? { tone: "success", text: "Verification email sent. Check your inbox." } : { tone: "error", text: "The verification email could not be sent." });
    } catch (error) {
      setVerifyNotice({ tone: "error", text: error instanceof Error ? error.message : "Verification email failed." });
    }
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (!window.confirm("Permanently delete your account and all learning data? This cannot be undone.")) return;
    setPending("delete");
    setDeleteNotice(null);
    try {
      await request("/api/account", { method: "DELETE", body: JSON.stringify(values) });
      window.location.assign("/");
    } catch (error) {
      setDeleteNotice({ tone: "error", text: error instanceof Error ? error.message : "Account was not deleted." });
      setPending("");
    }
  }

  if (loadError) return <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError}</p>;
  if (!user) return <p className="text-sm text-slate-600" aria-live="polite">Loading account…</p>;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Section title="Profile and learning preferences" description="Timezone, weekly target, and study days are set on the Settings page.">
        <form onSubmit={saveProfile} className="space-y-4">
          <label className="block text-sm font-medium text-slate-800">Display name<input name="displayName" defaultValue={user.profile.displayName} maxLength={80} className={input} /></label>
          <label className="block text-sm font-medium text-slate-800">Learning goals<textarea name="learningGoals" defaultValue={user.profile.learningGoals} maxLength={2000} rows={3} className={`${input} py-2`} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-800">Preferred language
              <select name="preferredLanguage" defaultValue={user.profile.preferredLanguage} className={input}><option value="en">English</option><option value="bn">বাংলা (Bangla)</option></select>
            </label>
            <label className="block text-sm font-medium text-slate-800">Experience level
              <select name="experienceLevel" defaultValue={user.profile.experienceLevel} className={input}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select>
            </label>
          </div>
          <button type="submit" disabled={pending === "profile"} className={primary}>Save profile</button>
          <NoticeText notice={profileNotice} />
        </form>
      </Section>

      <Section title="Email and sign-in">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-slate-500">Email</dt><dd className="font-medium text-slate-900">{user.email}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-slate-500">Status</dt><dd className="font-medium text-slate-900">{user.emailVerified ? "Verified" : "Not verified"}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-slate-500">Role</dt><dd className="font-medium text-slate-900">{user.role === "admin" ? "Administrator" : "Learner"}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-slate-500">Member since</dt><dd className="font-medium text-slate-900">{formatDate(user.createdAt)}</dd></div>
        </dl>
        {!user.emailVerified && (emailAvailable
          ? <button type="button" onClick={resendVerification} className={`${secondary} mt-4`}>Send verification email</button>
          : <p className="mt-4 text-sm text-slate-600">Email delivery is not configured on this server, so verification emails cannot be sent.</p>)}
        <NoticeText notice={verifyNotice} />
      </Section>

      <Section title="Change password" description="Changing your password signs out your other sessions.">
        <form onSubmit={changePassword} className="space-y-4">
          <label className="block text-sm font-medium text-slate-800">Current password<input name="currentPassword" type="password" autoComplete="current-password" required className={input} /></label>
          <label className="block text-sm font-medium text-slate-800">New password<input name="newPassword" type="password" autoComplete="new-password" minLength={12} required className={input} /></label>
          <label className="block text-sm font-medium text-slate-800">Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required className={input} /></label>
          <button type="submit" disabled={pending === "password"} className={primary}>Change password</button>
          <NoticeText notice={passwordNotice} />
        </form>
      </Section>

      <Section title="Active sessions" description="Sign out of devices you no longer use.">
        {sessions.length === 0 ? <p className="text-sm text-slate-600">No active sessions.</p> : (
          <ul className="divide-y divide-slate-100">
            {sessions.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{row.userAgent || "Unknown device"}{row.current && <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-800">This device</span>}</p>
                  <p className="text-xs text-slate-500">Signed in {formatDate(row.createdAt)} · last active {formatDate(row.lastUsedAt)}</p>
                </div>
                {!row.current && <button type="button" onClick={() => revoke(row.id)} className={secondary}>Sign out</button>}
              </li>
            ))}
          </ul>
        )}
        <NoticeText notice={sessionNotice} />
      </Section>

      <Section title="Download your data" description="A complete JSON export of your learning records. You can restore it into this account from Backup and restore.">
        <a href="/api/backup" className={secondary} download>Download data export</a>
      </Section>

      <Section title="Delete account" description="Permanently deletes your account, all learning data, and its server backups. Download an export first if you want to keep a copy.">
        <form onSubmit={deleteAccount} className="space-y-4">
          <label className="block text-sm font-medium text-slate-800">Password<input name="password" type="password" autoComplete="current-password" required className={input} /></label>
          <label className="block text-sm font-medium text-slate-800">Type DELETE to confirm<input name="confirmation" required pattern="DELETE" className={input} /></label>
          <button type="submit" disabled={pending === "delete"} className="inline-flex min-h-10 items-center rounded-lg border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-800 disabled:opacity-60">Delete my account permanently</button>
          <NoticeText notice={deleteNotice} />
        </form>
      </Section>
    </div>
  );
}
