import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy and data retention" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link href="/" className="text-sm font-medium text-blue-800 underline">← Back</Link>
      <h1 className="mt-4 text-3xl font-semibold text-slate-900">Privacy and data retention</h1>
      <div className="mt-6 space-y-5 text-sm leading-7 text-slate-700">
        <section>
          <h2 className="text-base font-semibold text-slate-900">What is stored</h2>
          <p>Account data: your email address, an Argon2id hash of your password (never the password itself), your role, optional profile fields, and sign-in timestamps. Learning data: the roadmap, sessions, notes, examination answers and results, projects, and other records you create. Session cookies hold a random token; only a SHA-256 hash of it is stored on the server.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-slate-900">Who can see it</h2>
          <p>Your learning records are stored in a file that belongs to your account, and every request is checked against your signed-in session. Other learners cannot read them. Administrators manage accounts and shared course content. They see account metadata (email, role, creation and last sign-in dates) but have no feature for reading your notes, answers, or learning history. Administrative actions are recorded in an audit log.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-slate-900">Backups and retention</h2>
          <p>The server keeps a limited number of automatic snapshots of your learning data (by default seven) so it can recover from mistakes or corruption. You can download a complete export of your data at any time from your account page.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-slate-900">Deleting your account</h2>
          <p>Deleting your account permanently removes your learning data, its snapshots, your sessions, and your account record. An audit entry recording that an account identifier was deleted is kept, with no email address or learning content. Copies you downloaded yourself are not affected.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-slate-900">Email</h2>
          <p>Email is used only for address verification and password recovery, and only when the operator has configured an email provider.</p>
        </section>
      </div>
    </main>
  );
}
