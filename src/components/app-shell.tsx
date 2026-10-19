import Link from "next/link";
import { BookOpen, Clock3, LayoutDashboard, ListChecks, Route, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";

export type ShellUser = { email: string; displayName: string; role: "learner" | "admin"; emailVerified: boolean };

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/roadmap", label: "Learning roadmap", icon: Route },
  { href: "/topics", label: "Topics and tasks", icon: ListChecks },
  { href: "/resources", label: "Learning materials", icon: BookOpen },
  { href: "/timer", label: "Learning timer", icon: Clock3 },
  { href: "/exams", label: "Examinations", icon: BookOpen }
];

export function AppShell({ children, user }: { children: React.ReactNode; user: ShellUser }) {
  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <Sparkles size={19} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Learning Tracker</p>
            <p className="text-xs text-slate-500">AI engineering journey</p>
          </div>
        </div>
        <nav aria-label="Main navigation" className="flex gap-2 overflow-x-auto p-3 lg:flex-col lg:gap-1 lg:p-4">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <details className="px-4 pb-4 text-sm text-slate-700">
          <summary className="cursor-pointer rounded-lg px-3 py-2 font-medium focus-visible:outline-2 focus-visible:outline-blue-700">More tools</summary>
          <div className="mt-2 grid gap-1 pl-3">
            {[
              ["sessions", "Session history"], ["planner", "Daily planner"], ["resources", "Resources"],
              ["course-materials", "Course materials"],
              ["knowledge", "Knowledge base"], ["revisions", "Revision planner"], ["assessments", "Self-assessment"],
              ["questions", "Question bank"], ["exam-library", "Exam blueprints"], ["active-exam", "Active examination"],
              ["practical-exam", "Practical examination"], ["exam-results", "Exam results and grading"],
              ["answer-review", "Answer review"], ["gaps", "Learning gaps"],
              ["competency", "Competencies"], ["exam-history", "Exam history"], ["exam-analytics", "Exam analytics"],
              ["discipline", "Discipline tracker"], ["rewards", "Rewards"], ["goals", "Goals"],
              ["projects", "Projects"], ["sales-agent", "Sales agent roadmap"], ["reports", "Reports"],
              ["experiments", "AI experiment log"], ["opportunities", "Product validation"],
              ["backup", "Backup and restore"], ["settings", "Settings"], ["account", "Account and privacy"],
              ...(user.role === "admin" ? [["admin/users", "Admin: accounts"], ["admin/audit", "Admin: audit log"]] : [])
            ].map(([href, label]) => (
              <Link key={href} href={`/${href}`} className="rounded-md px-2 py-2 text-xs text-slate-600 focus-visible:outline-2 focus-visible:outline-blue-700">
                {label}
              </Link>
            ))}
          </div>
        </details>
        <div className="hidden px-4 pb-4 lg:mt-auto lg:block">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-700">
              <BookOpen size={16} aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wide">Built for evidence</span>
            </div>
            <p className="text-xs leading-5 text-slate-600">
              Track what you can explain, remember, build, and demonstrate.
            </p>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 lg:ml-64">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
          <p className="truncate text-sm font-medium text-slate-600">{user.displayName ? `${user.displayName}’s learning workspace` : "Your learning workspace"}</p>
          <div className="flex items-center gap-3">
            {user.role === "admin" && <span className="hidden items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 sm:inline-flex"><ShieldCheck size={13} aria-hidden="true" />Administrator</span>}
            <Link href="/account" className="hidden items-center gap-1 text-xs text-slate-600 focus-visible:underline sm:inline-flex"><UserRound size={14} aria-hidden="true" />{user.email}</Link>
            <SignOutButton />
          </div>
        </header>
        {!user.emailVerified && (
          <p className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-xs text-amber-900 sm:px-8">
            Your email address is not verified yet. <Link href="/account" className="font-semibold underline">Verify it from your account page</Link> so password recovery can reach you.
          </p>
        )}
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">{children}</div>
      </main>
    </div>
  );
}
