"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type AccountRow = {
  id: string; email: string; displayName: string; role: "learner" | "admin" | "superuser";
  status: "active" | "inactive" | "suspended"; emailVerified: boolean; createdAt: string;
  lastLoginAt: string | null; lastLogoutAt: string | null; lastActivityAt: string | null;
  online: boolean; sessionStartedAt: string | null; currentActivity: string;
  activeLearningSeconds: number; timerFocusedSeconds: number; lessonsStarted: number;
  lessonsCompleted: number; lessonsRemaining: number; topicsCompleted: number;
  topicsInProgress: number; completedAssessments: number; assessmentAttempts: number;
  learningProgressPercent: number; goalsTotal: number; goalsCompleted: number; totalLessons: number;
};
type AccountPage = { rows: AccountRow[]; total: number; page: number; pageSize: number };
type AuditRow = { id: string; at: string; actorUserId: string | null; action: string; targetType: string; targetId: string | null; details: string };
type Overview = {
  totals: Record<string, number>;
  recentRegistrations: Pick<AccountRow, "id" | "email" | "createdAt">[];
  recentLogins: Pick<AccountRow, "id" | "email" | "lastLoginAt">[];
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const payload = await response.json().catch(() => ({})) as unknown;
  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null && "error" in payload ? String(payload.error) : "The request failed.";
    throw new Error(message);
  }
  return payload as T;
}

export function AdminAccounts({ currentUserId }: { currentUserId: string }) {
  const [pageData, setPageData] = useState<AccountPage | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [online, setOnline] = useState("");
  const [page, setPage] = useState(1);
  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: "25", sort: "createdAt" });
    if (query.trim()) params.set("q", query.trim());
    if (status) params.set("status", status);
    if (role) params.set("role", role);
    if (online) params.set("online", online);
    try {
      setPageData(await request<AccountPage>(`/api/admin/users?${params}`));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Accounts could not be loaded.");
    }
  }, [online, page, query, role, status]);
  useEffect(() => { void load(); }, [load]);

  async function updateAccount(row: AccountRow, change: { role?: "admin" | "learner"; status?: "active" | "inactive" | "suspended" }) {
    const label = change.role ? (change.role === "admin" ? "grant administrator access to" : "remove administrator access from") : `set the account status to ${change.status} for`;
    if (!window.confirm(`Do you want to ${label} ${row.email}? This action is recorded in the audit log.`)) return;
    setError("");
    setNotice("");
    try {
      await request("/api/admin/users", { method: "PATCH", body: JSON.stringify({ userId: row.id, ...change }) });
      setNotice(`Account updated for ${row.email}.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Account was not changed.");
    }
  }

  if (error && !pageData) return <p role="alert" className="text-sm text-red-700">{error}</p>;
  if (!pageData) return <p className="text-sm text-slate-600">Loading accounts…</p>;
  const rows = pageData.rows;
  return (
    <div className="space-y-3">
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-medium text-slate-600">Search email, name, or ID<input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} className="mt-1 block min-h-10 w-full rounded border border-slate-300 px-3 text-sm" /></label>
        <label className="text-xs font-medium text-slate-600">Account status<select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }} className="mt-1 block min-h-10 w-full rounded border border-slate-300 px-3 text-sm"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select></label>
        <label className="text-xs font-medium text-slate-600">Role<select value={role} onChange={(event) => { setPage(1); setRole(event.target.value); }} className="mt-1 block min-h-10 w-full rounded border border-slate-300 px-3 text-sm"><option value="">All roles</option><option value="learner">Learner</option><option value="admin">Administrator</option><option value="superuser">Superuser</option></select></label>
        <label className="text-xs font-medium text-slate-600">Presence<select value={online} onChange={(event) => { setPage(1); setOnline(event.target.value); }} className="mt-1 block min-h-10 w-full rounded border border-slate-300 px-3 text-sm"><option value="">Online and offline</option><option value="true">Online</option><option value="false">Offline</option></select></label>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <caption className="sr-only">Registered accounts</caption>
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr><th scope="col" className="px-4 py-3">Account</th><th scope="col" className="px-4 py-3">Presence</th><th scope="col" className="px-4 py-3">Progress</th><th scope="col" className="px-4 py-3">Learning time</th><th scope="col" className="px-4 py-3">Status / role</th><th scope="col" className="px-4 py-3">Manage</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3"><p className="font-medium text-slate-900">{row.displayName || row.email}{row.id === currentUserId && <span className="ml-2 text-xs text-slate-500">(you)</span>}</p><p className="text-xs text-slate-600">{row.email}</p><p className="text-xs text-slate-500">Joined {new Date(row.createdAt).toLocaleDateString()} · verified {row.emailVerified ? "yes" : "no"}</p></td>
                <td className="px-4 py-3"><span className={row.online ? "font-semibold text-emerald-700" : "text-slate-600"}>{row.online ? "Online" : "Offline"}</span><p className="mt-1 max-w-48 truncate text-xs text-slate-500">{row.currentActivity || (row.lastActivityAt ? `Last seen ${new Date(row.lastActivityAt).toLocaleString()}` : "Never active")}</p></td>
                <td className="px-4 py-3">{row.learningProgressPercent}% lessons · {row.lessonsCompleted}/{row.totalLessons}<p className="text-xs text-slate-500">{row.topicsCompleted} topics · {row.completedAssessments} assessments</p></td>
                <td className="px-4 py-3">{Math.floor(row.activeLearningSeconds / 60)} min active<p className="text-xs text-slate-500">{Math.floor(row.timerFocusedSeconds / 60)} min timer</p></td>
                <td className="px-4 py-3"><span className="capitalize">{row.status}</span><p className="text-xs text-slate-500">{row.role}</p></td>
                <td className="space-y-2 px-4 py-3">
                  <Link href={`/admin/users/${encodeURIComponent(row.id)}`} className="block text-xs font-semibold text-blue-800 underline">Profile and history</Link>
                  {row.role !== "superuser" && <><select aria-label={`Change status for ${row.email}`} value={row.status} onChange={(event) => void updateAccount(row, { status: event.target.value as AccountRow["status"] })} className="min-h-8 max-w-32 rounded border border-slate-300 px-2 text-xs"><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select>
                    <button type="button" onClick={() => void updateAccount(row, { role: row.role === "admin" ? "learner" : "admin" })} className="block rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-800">{row.role === "admin" ? "Remove admin" : "Make admin"}</button></>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No accounts match these filters.</p>}
      <div className="flex items-center justify-between text-sm text-slate-600"><span>{pageData.total} accounts · Page {pageData.page}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="min-h-9 rounded border border-slate-300 px-3 disabled:opacity-50">Previous</button><button type="button" disabled={page * pageData.pageSize >= pageData.total} onClick={() => setPage((value) => value + 1)} className="min-h-9 rounded border border-slate-300 px-3 disabled:opacity-50">Next</button></div></div>
    </div>
  );
}

export function AdminOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void request<Overview>("/api/admin/overview").then(setData).catch((cause: Error) => setError(cause.message)); }, []);
  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-sm text-slate-600">Loading platform analytics…</p>;
  const metrics: [string, string][] = [
    ["Registered users", String(data.totals.users)],
    ["Active accounts", String(data.totals.active)],
    ["Inactive or suspended", String(data.totals.inactive)],
    ["Online now", String(data.totals.online)],
    ["Offline", String(data.totals.offline)],
    ["Actively learning now", String(data.totals.activeLearning)],
    ["Active learning time", `${(data.totals.activeLearningSeconds / 3600).toFixed(1)} hours`],
    ["Completed lessons", String(data.totals.completedLessons)],
    ["Completed topics", String(data.totals.completedTopics)],
    ["Completed assessments", String(data.totals.completedAssessments)],
    ["Users with incomplete goals", String(data.totals.usersWithIncompleteGoals)],
    ["Daily / weekly / monthly active", `${data.totals.dailyActive} / ${data.totals.weeklyActive} / ${data.totals.monthlyActive}`]
  ];
  return <div className="space-y-6">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p></div>)}</section>
    <p className="text-xs leading-5 text-slate-500">Online means an active, unexpired session with a heartbeat inside the configured presence timeout (120 seconds by default). Actively learning additionally requires a visible, focused learning route and recent interaction. Learning progress is completed lessons divided by lessons in published courses; timer focus minutes are shown separately in account profiles to avoid double-counting.</p>
    <section className="grid gap-4 lg:grid-cols-2">
      <RecentAccounts title="Recent registrations" rows={data.recentRegistrations.map((row) => ({ id: row.id, email: row.email, at: row.createdAt }))} />
      <RecentAccounts title="Recent sign-ins" rows={data.recentLogins.flatMap((row) => row.lastLoginAt ? [{ id: row.id, email: row.email, at: row.lastLoginAt }] : [])} />
    </section>
    <Link href="/admin/users" className="inline-flex min-h-10 items-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white">Manage accounts</Link>
  </div>;
}

function RecentAccounts({ title, rows }: { title: string; rows: { id: string; email: string; at: string }[] }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">{title}</h2>{rows.length ? <ul className="mt-3 divide-y divide-slate-100">{rows.map((row) => <li key={`${row.id}-${row.at}`} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><Link href={`/admin/users/${encodeURIComponent(row.id)}`} className="text-blue-800 underline">{row.email}</Link><time className="text-slate-500">{new Date(row.at).toLocaleString()}</time></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">No records yet.</p>}</section>;
}

type AdminDetail = {
  account: { id: string; email: string; role: string; profile: { displayName: string } };
  accountStatus: string;
  lastLoginAt: string | null;
  lastLogoutAt: string | null;
  sessions: { id: string; createdAt: string; lastUsedAt: string; expiresAt: string; endedAt: string | null; activeLearningSeconds: number; currentActivity: string }[];
  learningEvents: { at: string; type: string; courseId: string | null; lessonId: string | null; topicId?: string | null; status: string; scorePercent?: number | null }[];
  learningData: {
    lessonProgress: { id: string; courseId: string; lessonId: string; startedAt: string; completedAt: string | null; lastMode: string; completedBlockIds: string[] }[];
    assessments: unknown[];
    examinationAttempts: unknown[];
    topics: { id: string; title: string; status: string; completedAt: string | null; confidence: number | null }[];
    goals: { id: string; title: string; targetDate: string | null; completed: boolean }[];
  };
};

export function AdminUserDetail({ userId }: { userId: string }) {
  const [data, setData] = useState<AdminDetail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void request<AdminDetail>(`/api/admin/users?userId=${encodeURIComponent(userId)}`).then(setData).catch((cause: Error) => setError(cause.message)); }, [userId]);
  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-sm text-slate-600">Loading learner profile…</p>;
  return <div className="space-y-5">
    <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
      <p><span className="text-slate-500">Name</span><br /><strong>{data.account.profile.displayName || "—"}</strong></p>
      <p><span className="text-slate-500">Email</span><br /><strong>{data.account.email}</strong></p>
      <p><span className="text-slate-500">Status / role</span><br /><strong className="capitalize">{data.accountStatus} / {data.account.role}</strong></p>
      <p><span className="text-slate-500">Last login / logout</span><br /><strong>{data.lastLoginAt ? new Date(data.lastLoginAt).toLocaleString() : "—"} / {data.lastLogoutAt ? new Date(data.lastLogoutAt).toLocaleString() : "—"}</strong></p>
      <p><span className="text-slate-500">Lessons / assessments</span><br /><strong>{data.learningData.lessonProgress.filter((lesson) => lesson.completedAt).length}/{data.learningData.lessonProgress.length} lessons completed / {data.learningData.assessments.length + data.learningData.examinationAttempts.length} assessment records</strong></p>
      <p><span className="text-slate-500">Topics completed / in progress</span><br /><strong>{data.learningData.topics.filter((topic) => topic.status === "completed").length} / {data.learningData.topics.filter((topic) => topic.status === "in-progress").length}</strong></p>
    </section>
    <section className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Lesson progress</h2>{data.learningData.lessonProgress.length ? <ul className="mt-3 space-y-2">{data.learningData.lessonProgress.map((lesson) => <li key={lesson.id} className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-medium">Lesson {lesson.lessonId} · {lesson.completedAt ? "Completed" : "In progress"}</p><p className="mt-1 text-xs text-slate-600">Course {lesson.courseId} · {lesson.lastMode} · {lesson.completedBlockIds.length} content blocks visited</p><time className="text-xs text-slate-500">{new Date(lesson.completedAt ?? lesson.startedAt).toLocaleString()}</time></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No lesson progress.</p>}</section>
      <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Topics and goals</h2><h3 className="mt-3 text-sm font-medium">Topics</h3>{data.learningData.topics.length ? <ul className="mt-2 space-y-1 text-sm">{data.learningData.topics.map((topic) => <li key={topic.id} className="flex justify-between gap-3"><span>{topic.title}</span><span className="shrink-0 text-slate-500">{topic.status}</span></li>)}</ul> : <p className="mt-1 text-sm text-slate-500">No topics.</p>}<h3 className="mt-4 text-sm font-medium">Goals</h3>{data.learningData.goals.length ? <ul className="mt-2 space-y-1 text-sm">{data.learningData.goals.map((goal) => <li key={goal.id} className="flex justify-between gap-3"><span>{goal.title}{goal.targetDate ? ` · due ${goal.targetDate}` : ""}</span><span className="shrink-0 text-slate-500">{goal.completed ? "Completed" : "In progress"}</span></li>)}</ul> : <p className="mt-1 text-sm text-slate-500">No goals.</p>}</section>
    </section>
    <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Authentication sessions</h2>{data.sessions.length ? <div className="mt-3 space-y-2">{data.sessions.map((session) => <article key={session.id} className="rounded-lg bg-slate-50 p-3 text-sm"><p>Started {new Date(session.createdAt).toLocaleString()} · {session.endedAt ? `ended ${new Date(session.endedAt).toLocaleString()}` : `last seen ${new Date(session.lastUsedAt).toLocaleString()}`}</p><p className="mt-1 text-xs text-slate-600">{Math.floor(session.activeLearningSeconds / 60)} active-learning minutes · {session.currentActivity || "Not currently learning"}</p></article>)}</div> : <p className="mt-2 text-sm text-slate-500">No session history.</p>}</section>
    <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Learning activity timeline</h2>{data.learningEvents.length ? <ol className="mt-3 space-y-2">{data.learningEvents.map((event, index) => <li key={`${event.type}-${event.at}-${index}`} className="rounded-lg border border-slate-100 p-3 text-sm"><time className="text-xs text-slate-500">{new Date(event.at).toLocaleString()}</time><p className="mt-1 font-medium text-slate-800">{event.type.replaceAll(".", " ")} · {event.status}{event.scorePercent !== undefined && event.scorePercent !== null ? ` · ${event.scorePercent}%` : ""}</p><p className="text-xs text-slate-600">{event.lessonId ? `Lesson ${event.lessonId}` : event.topicId ? `Topic ${event.topicId}` : ""}</p></li>)}</ol> : <p className="mt-2 text-sm text-slate-500">No lesson or assessment events have been recorded.</p>}</section>
  </div>;
}

export function AdminAuditLog() {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void request<AuditRow[]>("/api/admin/audit").then(setRows).catch((cause: Error) => setError(cause.message)); }, []);
  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>;
  if (!rows) return <p className="text-sm text-slate-600">Loading audit log…</p>;
  if (rows.length === 0) return <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No administrative actions have been recorded yet.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <caption className="sr-only">Administrative audit log, newest first</caption>
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr><th scope="col" className="px-4 py-3">When</th><th scope="col" className="px-4 py-3">Action</th><th scope="col" className="px-4 py-3">Actor</th><th scope="col" className="px-4 py-3">Target</th><th scope="col" className="px-4 py-3">Details</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="whitespace-nowrap px-4 py-3">{new Date(row.at).toLocaleString()}</td>
              <td className="px-4 py-3 font-medium text-slate-900">{row.action}</td>
              <td className="px-4 py-3 font-mono text-xs">{row.actorUserId ?? "account holder"}</td>
              <td className="px-4 py-3 font-mono text-xs">{row.targetType}{row.targetId ? `: ${row.targetId}` : ""}</td>
              <td className="px-4 py-3 text-slate-600">{row.details}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
