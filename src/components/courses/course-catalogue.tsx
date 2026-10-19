"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, Clock3 } from "lucide-react";

export type CatalogueCourse = {
  id: string; title: string; description: string; difficulty: string; tags: string[]; category: string; seed: boolean;
  lessonCount: number; moduleCount: number; estimatedMinutes: number; displayTitle: string;
  progress: { enrolled: boolean; status: string | null; percent: number; completedLessons: number; totalLessons: number };
};

export function CourseCatalogue({ courses }: { courses: CatalogueCourse[] }) {
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [enrolledOnly, setEnrolledOnly] = useState(false);
  const visible = useMemo(() => courses.filter((course) =>
    (!query || `${course.title} ${course.description} ${course.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())) &&
    (!difficulty || course.difficulty === difficulty) &&
    (!enrolledOnly || course.progress.enrolled)
  ), [courses, query, difficulty, enrolledOnly]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-xs font-medium text-slate-700">Search<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="mt-1 block min-h-9 w-64 max-w-full rounded-lg border border-slate-300 px-3 text-sm" /></label>
        <label className="text-xs font-medium text-slate-700">Difficulty
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="mt-1 block min-h-9 rounded-lg border border-slate-300 px-2 text-sm">
            <option value="">Any</option><option value="fundamental">Fundamental</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
          </select>
        </label>
        <label className="flex min-h-9 items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={enrolledOnly} onChange={(event) => setEnrolledOnly(event.target.checked)} />My courses only</label>
      </div>
      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">{courses.length === 0 ? "No courses are published yet." : "No courses match these filters."}</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {visible.map((course) => (
            <li key={course.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">{course.category}</span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">{course.difficulty}</span>
                {course.seed && <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-800">Introductory seed course</span>}
              </div>
              <h2 className="mt-3 text-lg font-semibold text-slate-900"><Link href={`/courses/${course.id}`} className="focus-visible:underline">{course.displayTitle}</Link></h2>
              <p className="mt-1 line-clamp-3 text-sm text-slate-600">{course.description.replace(/\*\*/g, "")}</p>
              <p className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><BookOpen size={13} aria-hidden="true" />{course.moduleCount} modules · {course.lessonCount} lessons</span><span className="inline-flex items-center gap-1"><Clock3 size={13} aria-hidden="true" />about {Math.round(course.estimatedMinutes / 60 * 10) / 10} h</span></p>
              {course.progress.enrolled && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-600"><span>{course.progress.status === "completed" ? "All lessons completed" : "Your progress"}</span><span>{course.progress.completedLessons}/{course.progress.totalLessons}</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-blue-600" style={{ width: `${course.progress.percent}%` }} /></div>
                </div>
              )}
              <Link href={`/courses/${course.id}`} className="mt-4 inline-flex min-h-9 w-fit items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-800">{course.progress.enrolled ? "Continue" : "View course"}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
