"use client";

import { useState } from "react";
import courseCatalog from "@/data/course-materials.json";

type Course = typeof courseCatalog.courses[number];
type Material = Course["items"][number];
type MaterialKind = "Slides" | "Video" | "Practice" | "Reading" | "Resource";

const filters = ["All content", "Slides", "Videos", "Practice", "Reading", "Other resources"] as const;

function materialKind(material: Material): MaterialKind {
  const text = `${material.title} ${material.url}`.toLowerCase();
  if (text.includes("youtube.com") || text.includes("youtu.be") || text.includes("recording") || text.includes("lecture playlist")) return "Video";
  if (text.includes("slide") || text.includes("presentation/")) return "Slides";
  if (text.includes("practice") || text.includes("problem") || text.includes("quiz") || text.includes("assignment") || text.includes("colab.") || text.includes("simulation") || text.includes("form")) return "Practice";
  if (text.includes("book") || text.includes("chapter") || text.includes("notes") || text.includes("article") || text.includes("blog") || text.includes("career advice") || text.includes("curriculum") || text.includes("syllabus")) return "Reading";
  return "Resource";
}

function kindLabel(kind: MaterialKind) {
  return kind === "Video" ? "Videos" : kind === "Resource" ? "Other resources" : kind;
}

export function CourseLibrary() {
  const [selectedCourseId, setSelectedCourseId] = useState(courseCatalog.courses[0]?.courseCode ?? "");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All content");
  const [query, setQuery] = useState("");
  const courses = courseCatalog.courses as Course[];
  const selectedCourse = courses.find((course) => course.courseCode === selectedCourseId) ?? courses[0];
  if (!selectedCourse) return <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">No course materials are available.</p>;
  const normalizedQuery = query.trim().toLowerCase();
  const visibleItems = selectedCourse.items
    .filter((item) => filter === "All content" || kindLabel(materialKind(item)) === filter)
    .filter((item) => !normalizedQuery || `${item.title} ${item.scheduledDate} ${item.status} ${item.notes ?? ""} ${item.url}`.toLowerCase().includes(normalizedQuery))
    .sort((a, b) => a.row - b.row);
  const counts = {
    total: selectedCourse.items.length,
    links: selectedCourse.items.filter((item) => Boolean(item.url)).length,
    videos: selectedCourse.items.filter((item) => materialKind(item) === "Video").length,
    slides: selectedCourse.items.filter((item) => materialKind(item) === "Slides").length
  };

  return <div className="space-y-5">
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap gap-3">
        <Metric label="Catalog entries" value={String(counts.total)} />
        <Metric label="Linked resources" value={String(counts.links)} />
        <Metric label="Slides and lecture decks" value={String(counts.slides)} />
        <Metric label="Video resources" value={String(counts.videos)} />
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-600">Imported course references are shown as provided in the shared spreadsheet. Mandatory and reference labels are copied from that sheet; they do not indicate your completion. Links open the original files and still require the access granted by their owner.</p>
    </section>

    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-base font-semibold text-slate-900">Courses and resource collections</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {courses.map((course) => <button key={course.courseCode} type="button" aria-pressed={selectedCourse.courseCode === course.courseCode} onClick={() => { setSelectedCourseId(course.courseCode); setFilter("All content"); setQuery(""); }} className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${selectedCourse.courseCode === course.courseCode ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white text-slate-700"}`}>{course.courseCode === "PAST-COURSES" ? "Past semesters" : course.courseCode === "ACADEMIC-RESOURCES" ? "Academic resources" : course.courseCode}</button>)}
      </div>
      <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{selectedCourse.courseTitle}</h3>
          <p className="mt-1 text-sm text-slate-600">{selectedCourse.semester} · Source tab: {selectedCourse.sourceSheet}</p>
        </div>
        <label className="text-xs font-medium text-slate-600">
          Search this collection
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Topic, date, or material" className="mt-1 block min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm sm:w-72" />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" aria-label="Filter materials">
        {filters.map((option) => <button key={option} type="button" aria-pressed={filter === option} onClick={() => setFilter(option)} className={`min-h-9 rounded-full px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${filter === option ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700"}`}>{option}</button>)}
      </div>
    </section>

    {visibleItems.length === 0 ? <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">No materials match this search and filter.</p> : <section aria-label="Course materials" className="grid gap-3 sm:grid-cols-2">
      {visibleItems.map((item) => {
        const kind = materialKind(item);
        return <article key={`${selectedCourse.courseCode}-${item.row}`} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">{kindLabel(kind)}</span>
            {item.status && <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === "Mandatory" ? "bg-emerald-50 text-emerald-800" : item.status === "Reference" ? "bg-amber-50 text-amber-900" : "bg-slate-100 text-slate-700"}`}>{item.status}</span>}
            <span className="ml-auto text-xs text-slate-500">Sheet row {item.row}</span>
          </div>
          <h4 className="mt-3 break-words text-sm font-semibold leading-5 text-slate-900">{item.title || "Untitled reference"}</h4>
          {item.scheduledDate && <p className="mt-1 whitespace-pre-line text-xs text-slate-500">{item.scheduledDate}</p>}
          {item.notes && <p className="mt-2 whitespace-pre-line text-sm leading-5 text-slate-600">{item.notes}</p>}
          {item.url ? <a href={item.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-9 max-w-full items-center gap-2 rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-semibold text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
            <span>{kind === "Video" ? "Open video" : kind === "Slides" ? "Open slides" : "Open resource"}</span>
            <span aria-hidden="true">↗</span>
          </a> : <p className="mt-3 text-xs text-slate-500">Schedule item; the sheet did not include a resource link.</p>}
        </article>;
      })}
    </section>}
    <p className="text-xs text-slate-500">Showing {visibleItems.length} of {selectedCourse.items.length} entries · Original sheet order is preserved.</p>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-[8rem] flex-1 rounded-lg bg-slate-50 p-3">
    <p className="text-xs text-slate-500">{label}</p>
    <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
  </div>;
}
