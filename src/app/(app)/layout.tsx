import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user } = await requireUser();
  return <AppShell user={{ email: user.email, displayName: user.profile.displayName, role: user.role, emailVerified: user.emailVerified }}>{children}</AppShell>;
}
