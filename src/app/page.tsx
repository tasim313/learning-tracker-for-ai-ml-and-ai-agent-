import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpenCheck, BrainCircuit, ClipboardCheck, Clock3, Hammer, RotateCcw, Sparkles } from "lucide-react";
import { getCurrentSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

const questions = [
  { icon: BookOpenCheck, title: "What do I know?", text: "Diagnostic and topic examinations show which subjects you can skip and which need study." },
  { icon: Hammer, title: "What can I build on my own?", text: "Practical examinations and project evidence are tracked separately from course completion." },
  { icon: RotateCcw, title: "What have I forgotten?", text: "Delayed-retention checks and spaced revision show what has faded since you last studied it." },
  { icon: BrainCircuit, title: "What should I do next?", text: "Each recommendation comes from your own recorded results and shows the reason behind it." }
];

const features = [
  { icon: Clock3, text: "A learning timer that keeps counting through refreshes, pauses, and breaks" },
  { icon: ClipboardCheck, text: "Examinations with saved question versions, automatic and manual grading, and competency checks" },
  { icon: Sparkles, text: "A 12-phase roadmap from Python foundations to building an AI Sales Employee" }
];

export default async function LandingPage() {
  if (await getCurrentSession()) redirect("/dashboard");
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Sparkles size={18} aria-hidden="true" /></span>
            Learning Tracker
          </span>
          <nav aria-label="Account" className="flex items-center gap-2">
            <Link href="/login" className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-700">Sign in</Link>
            <Link href="/register" className="inline-flex min-h-10 items-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Create account</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <section className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">AI and machine learning engineering</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Learn AI engineering based on what you can show, not hours logged.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            A structured path from Python and mathematics to production AI agents. It tracks what you understand, remember, and can build on your own.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="inline-flex min-h-11 items-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Start learning</Link>
            <Link href="/login" className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-700">I already have an account</Link>
          </div>
        </section>

        <section aria-labelledby="questions-heading" className="mt-16">
          <h2 id="questions-heading" className="text-xl font-semibold text-slate-900">Four questions the platform helps you answer</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {questions.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-xl border border-slate-200 bg-white p-5">
                <Icon size={20} className="text-blue-700" aria-hidden="true" />
                <h3 className="mt-3 text-base font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="features-heading" className="mt-14 rounded-xl border border-slate-200 bg-white p-6">
          <h2 id="features-heading" className="text-base font-semibold text-slate-900">What’s included</h2>
          <ul className="mt-4 space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-slate-700"><Icon size={18} className="mt-0.5 shrink-0 text-blue-700" aria-hidden="true" />{text}</li>
            ))}
          </ul>
          <p className="mt-5 text-xs leading-5 text-slate-500">
            Seeded examination questions are labelled as samples and have not been independently verified. Closed-book results are self-declared, not proctored. Written and practical answers are graded by a person against a rubric; no AI grading service is connected.
          </p>
        </section>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-4 px-4 py-6 text-xs text-slate-500 sm:px-6">
          <Link href="/privacy" className="underline">Privacy and data retention</Link>
        </div>
      </footer>
    </div>
  );
}
