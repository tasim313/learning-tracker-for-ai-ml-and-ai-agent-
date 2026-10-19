"use client";

import { useCallback, useEffect, useState } from "react";
import { contentRequest, newId, type ContentOverview } from "@/components/admin/content-api";
import { DiagramEditor, emptyDiagram } from "@/components/diagram-editor";
import type { DiagramDefinition } from "@/lib/model";

export function DiagramLibrary() {
  const [diagrams, setDiagrams] = useState<DiagramDefinition[] | null>(null);
  const [selected, setSelected] = useState<DiagramDefinition | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(() => contentRequest<ContentOverview>().then((overview) => setDiagrams(overview.diagrams)).catch((cause: Error) => setError(cause.message)), []);
  useEffect(() => { void load(); }, [load]);
  if (!diagrams) return error ? <p role="alert" className="text-sm text-red-700">{error}</p> : <p className="text-sm text-slate-600">Loading diagrams…</p>;
  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <nav aria-label="Diagrams" className="space-y-1 rounded-xl border border-slate-200 bg-white p-3">
        {diagrams.map((diagram) => (
          <button key={diagram.id} type="button" onClick={() => { setSelected(diagram); setIsNew(false); }} className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${selected?.id === diagram.id ? "bg-blue-50 font-semibold text-blue-900" : "text-slate-700"}`}>{diagram.title}</button>
        ))}
        <button type="button" onClick={() => { setSelected(emptyDiagram(newId("diagram"))); setIsNew(true); }} className="mt-2 w-full rounded-md border border-dashed border-slate-300 px-2 py-1.5 text-sm font-semibold text-slate-700">New diagram</button>
      </nav>
      <div className="min-w-0">
        {selected ? (
          <DiagramEditor key={selected.id + String(isNew)} initial={selected} idEditable={isNew}
            onSave={async (diagram) => { await contentRequest({ action: "save-diagram", diagram }); setIsNew(false); await load(); }}
            onDelete={isNew ? undefined : async () => { await contentRequest({ action: "delete-diagram", id: selected.id }); setSelected(null); await load(); }} />
        ) : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">Select a diagram to edit, or create a new one. Diagrams are stored as structured nodes and connections, not images.</p>}
      </div>
    </div>
  );
}
