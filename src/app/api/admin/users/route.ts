import { NextResponse } from "next/server";
import { readJsonObject, withUser } from "@/lib/auth/http";
import { listAccountsForAdmin, readAdminUserDetail, setAccountRole, setAccountStatus } from "@/lib/auth/service";

export const GET = withUser(async ({ request }) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  if (userId) return NextResponse.json(await readAdminUserDetail(userId));
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const status = url.searchParams.get("status");
  const role = url.searchParams.get("role");
  const online = url.searchParams.get("online");
  const sort = url.searchParams.get("sort") ?? "createdAt";
  const direction = url.searchParams.get("direction") === "asc" ? 1 : -1;
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("pageSize") ?? "25", 10) || 25));
  const accounts = await listAccountsForAdmin();
  const filtered = accounts.filter((account) =>
    (!q || `${account.email} ${account.displayName} ${account.id}`.toLowerCase().includes(q))
    && (!status || account.status === status)
    && (!role || account.role === role)
    && (!online || account.online === (online === "true"))
  );
  filtered.sort((a, b) => {
    const left = String(a[sort as keyof typeof a] ?? "");
    const right = String(b[sort as keyof typeof b] ?? "");
    return left.localeCompare(right, undefined, { numeric: true }) * direction;
  });
  return NextResponse.json({
    rows: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
    page,
    pageSize
  });
}, { role: "admin" });

export const PATCH = withUser(async ({ request, user }) => {
  const body = await readJsonObject(request);
  if (typeof body.userId !== "string") throw new Error("Account id is required.");
  if ("status" in body) await setAccountStatus(user, body.userId, body.status);
  else await setAccountRole(user, body.userId, body.role);
  return NextResponse.json({ updated: true });
}, { role: "admin" });
