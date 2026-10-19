"use client";

import { useCallback, useEffect, useState } from "react";

type AccountRow = { id: string; email: string; role: "learner" | "admin"; emailVerified: boolean; createdAt: string; lastLoginAt: string | null };
type AuditRow = { id: string; at: string; actorUserId: string | null; action: string; targetType: string; targetId: string | null; details: string };

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
  const [rows, setRows] = useState<AccountRow[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(() => request<AccountRow[]>("/api/admin/users").then(setRows).catch((cause: Error) => setError(cause.message)), []);
  useEffect(() => { void load(); }, [load]);

  async function changeRole(row: AccountRow, role: AccountRow["role"]) {
    const verb = role === "admin" ? "grant administrator access to" : "remove administrator access from";
    if (!window.confirm(`Do you want to ${verb} ${row.email}? This action is recorded in the audit log.`)) return;
    setError("");
    setNotice("");
    try {
      await request("/api/admin/users", { method: "PATCH", body: JSON.stringify({ userId: row.id, role }) });
      setNotice(`Role updated for ${row.email}.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Role was not changed.");
    }
  }

  if (error && !rows) return <p role="alert" className="text-sm text-red-700">{error}</p>;
  if (!rows) return <p className="text-sm text-slate-600">Loading accounts…</p>;
  return (
    <div className="space-y-3">
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <caption className="sr-only">Registered accounts</caption>
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr><th scope="col" className="px-4 py-3">Email</th><th scope="col" className="px-4 py-3">Role</th><th scope="col" className="px-4 py-3">Verified</th><th scope="col" className="px-4 py-3">Created</th><th scope="col" className="px-4 py-3">Last sign-in</th><th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{row.email}{row.id === currentUserId && <span className="ml-2 text-xs text-slate-500">(you)</span>}</td>
                <td className="px-4 py-3">{row.role === "admin" ? "Administrator" : "Learner"}</td>
                <td className="px-4 py-3">{row.emailVerified ? "Yes" : "No"}</td>
                <td className="px-4 py-3">{new Date(row.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">{row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : "—"}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => changeRole(row, row.role === "admin" ? "learner" : "admin")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800">
                    {row.role === "admin" ? "Remove admin" : "Make admin"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
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
