import Link from "next/link";
import { Menu, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { AppNav, type NavGroup } from "@/components/app-nav";
import { SignOutButton } from "@/components/sign-out-button";

export type ShellUser = { email: string; displayName: string; role: "learner" | "admin"; emailVerified: boolean };

const learnerGroups: NavGroup[] = [
  { label: "Learn", links: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/recommendations", label: "What to learn next" },
    { href: "/courses", label: "Course catalogue" },
    { href: "/videos", label: "Video lessons" },
    { href: "/roadmap", label: "Learning roadmap" },
    { href: "/topics", label: "Topics and tasks" },
    { href: "/resources", label: "Resource library" },
    { href: "/knowledge", label: "Knowledge base" }
  ] },
  { label: "Practise", links: [
    { href: "/math-lab", label: "Mathematics lab" },
    { href: "/diagrams", label: "Diagram studio" },
    { href: "/games", label: "Games and challenges" },
    { href: "/flashcards", label: "Flashcards" },
    { href: "/timer", label: "Learning timer" },
    { href: "/sessions", label: "Session history" },
    { href: "/planner", label: "Daily and weekly planner" },
    { href: "/revisions", label: "Revision planner" }
  ] },
  { label: "Assess", links: [
    { href: "/exams", label: "Examination dashboard" },
    { href: "/exam-library", label: "Examination library" },
    { href: "/questions", label: "Question bank" },
    { href: "/blueprints", label: "Blueprint editor" },
    { href: "/active-exam", label: "Active examination" },
    { href: "/practical-exam", label: "Practical examination" },
    { href: "/exam-results", label: "Results and grading" },
    { href: "/answer-review", label: "Answer review" },
    { href: "/gaps", label: "Learning gaps" },
    { href: "/competency", label: "Competency" },
    { href: "/exam-history", label: "Examination history" },
    { href: "/exam-analytics", label: "Examination analytics" },
    { href: "/assessments", label: "Self-assessment" }
  ] },
  { label: "Build and grow", links: [
    { href: "/projects", label: "Projects and portfolio" },
    { href: "/sales-agent", label: "AI Sales Employee roadmap" },
    { href: "/goals", label: "Goals and aspirations" },
    { href: "/discipline", label: "Discipline tracker" },
    { href: "/rewards", label: "Rewards and achievements" },
    { href: "/reports", label: "Reports and analytics" },
    { href: "/experiments", label: "AI experiment log" },
    { href: "/opportunities", label: "Product validation" }
  ] },
  { label: "Account", links: [
    { href: "/settings", label: "Settings" },
    { href: "/backup", label: "Backup and restore" },
    { href: "/account", label: "Account and privacy" }
  ] }
];

const adminGroup: NavGroup = { label: "Administration", links: [
  { href: "/admin/content", label: "Content and publishing" },
  { href: "/admin/content/diagrams", label: "Diagram library" },
  { href: "/admin/users", label: "Accounts" },
  { href: "/admin/audit", label: "Audit log" }
] };

export function AppShell({ children, user }: { children: React.ReactNode; user: ShellUser }) {
  const groups = user.role === "admin" ? [...learnerGroups, adminGroup] : learnerGroups;
  const brand = (
    <Link href="/dashboard" className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Sparkles size={19} aria-hidden="true" /></span>
      <span><span className="block text-sm font-semibold text-slate-900">Learning Tracker</span><span className="block text-xs text-slate-500">AI engineering journey</span></span>
    </Link>
  );
  return (
    <div className="min-h-screen lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-sm">Skip to content</a>
      <aside className="hidden border-r border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        {brand}
        <div className="flex-1 overflow-y-auto"><AppNav groups={groups} /></div>
      </aside>
      <div className="border-b border-slate-200 bg-white lg:hidden">
        <details>
          <summary className="flex h-14 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold text-slate-900">
            <span className="flex items-center gap-2"><Sparkles size={17} className="text-blue-700" aria-hidden="true" />Learning Tracker</span>
            <span className="flex items-center gap-1 text-slate-700"><Menu size={18} aria-hidden="true" />Menu</span>
          </summary>
          <div className="max-h-[70vh] overflow-y-auto border-t border-slate-100"><AppNav groups={groups} /></div>
        </details>
      </div>
      <main id="main" className="min-w-0 flex-1 lg:ml-64">
        <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-2 sm:px-8">
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
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">{children}</div>
      </main>
    </div>
  );
}
