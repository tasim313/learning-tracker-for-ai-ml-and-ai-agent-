"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { contentRequest, type ContentOverview } from "@/components/admin/content-api";

export function ContentManager() {
  const [overview, setOverview] = useState<ContentOverview | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(() => contentRequest<ContentOverview>().then(setOverview).catch((cause: Error) => setError(cause.message)), []);
  useEffect(() => { void load(); }, [load]);

  async function run(body: Record<string, unknown>, success: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setError("");
    setNotice("");
    try {
      await contentRequest(body);
      setNotice(success);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed.");
    }
  }

  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = String(form.get("id") ?? "").trim();
    const title = String(form.get("title") ?? "").trim();
    await run({
      action: "save-course",
      course: { id, title, description: "", difficulty: "beginner", updatedAt: new Date().toISOString(), modules: [{ id: "module-1", title: "Module 1", lessons: [] }] }
    }, `Draft course "${title}" created. Open it to add lessons.`);
  }

  if (!overview) return error ? <p role="alert" className="text-sm text-red-700">{error}</p> : <p className="text-sm text-slate-600">Loading content…</p>;
  return (
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{notice}</p>}
      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <caption className="sr-only">Courses and their publishing status</caption>
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th scope="col" className="px-4 py-3">Course</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3">Lessons</th><th scope="col" className="px-4 py-3">Last edited</th><th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {overview.courses.map((course) => {
              const published = overview.published[course.id];
              const draftChanged = published && Date.parse(course.updatedAt) > Date.parse(published.publishedAt);
              return (
                <tr key={course.id}>
                  <td className="px-4 py-3"><p className="font-medium text-slate-900">{course.title}</p><p className="font-mono text-xs text-slate-500">{course.id}{course.seed ? " · seed" : ""}</p></td>
                  <td className="px-4 py-3">{published ? <>Published v{published.version}<span className="block text-xs text-slate-500">{new Date(published.publishedAt).toLocaleString()}{draftChanged ? " · draft has unpublished changes" : ""}</span></> : "Draft (not visible to learners)"}</td>
                  <td className="px-4 py-3">{course.modules.reduce((total, module) => total + module.lessons.length, 0)}</td>
                  <td className="px-4 py-3 text-xs">{new Date(course.updatedAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link href={`/admin/content/${course.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800">Edit and preview</Link>
                      <button type="button" className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => run({ action: "publish", id: course.id }, `Published "${course.title}".`, `Publish the current draft of "${course.title}"? Learners will see it immediately; the previous version is kept in history.`)}>{published ? "Publish changes" : "Publish"}</button>
                      {published && <button type="button" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800" onClick={() => run({ action: "unpublish", id: course.id }, `Unpublished "${course.title}".`, `Hide "${course.title}" from learners? Their progress is kept.`)}>Unpublish</button>}
                      {!published && <button type="button" className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-800" onClick={() => run({ action: "delete-course", id: course.id }, "Draft deleted.", `Permanently delete the draft "${course.title}"?`)}>Delete draft</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">Create a course</h2>
        <form onSubmit={createCourse} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium text-slate-700">Course id (lowercase-with-hyphens)<input name="id" required pattern="[a-z0-9][a-z0-9-]{0,79}" className="mt-1 block min-h-9 rounded-lg border border-slate-300 px-3 text-sm" /></label>
          <label className="text-xs font-medium text-slate-700">Title<input name="title" required maxLength={200} className="mt-1 block min-h-9 w-72 max-w-full rounded-lg border border-slate-300 px-3 text-sm" /></label>
          <button type="submit" className="min-h-9 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white">Create draft</button>
        </form>
      </section>
      <p className="text-sm text-slate-600">Shared diagrams ({overview.diagrams.length}) are managed in the <Link href="/admin/content/diagrams" className="text-blue-800 underline">diagram library</Link>.</p>
    </div>
  );
}
