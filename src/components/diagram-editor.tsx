"use client";

import { useState } from "react";
import { DiagramViewer } from "@/components/diagram-viewer";
import { diagramDefinitionSchema, diagramKinds, type DiagramDefinition } from "@/lib/model";

const input = "mt-1 block min-h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm";

export function emptyDiagram(id: string): DiagramDefinition {
  return {
    id, title: "Untitled diagram", kind: "flowchart", purpose: "", altText: "Describe the diagram for people who cannot see it.",
    explanationSteps: [], updatedAt: new Date().toISOString(),
    nodes: [{ id: "start", label: "Start", detail: "", x: 0, y: 0, shape: "start", step: 0 }], edges: []
  };
}

/** Edit a diagram's metadata and structure; validated before save. */
export function DiagramEditor({ initial, onSave, onDelete, idEditable = false }: {
  initial: DiagramDefinition;
  onSave: (diagram: DiagramDefinition) => Promise<void>;
  onDelete?: () => Promise<void>;
  idEditable?: boolean;
}) {
  const [diagram, setDiagram] = useState(initial);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  async function save() {
    setError("");
    setNotice("");
    const parsed = diagramDefinitionSchema.safeParse({ ...diagram, updatedAt: new Date().toISOString() });
    if (!parsed.success) { setError(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")); return; }
    setPending(true);
    try {
      await onSave(parsed.data);
      setNotice("Diagram saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Diagram was not saved.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2">
        <label className="block text-xs font-medium text-slate-700">Title<input className={input} value={diagram.title} onChange={(event) => setDiagram({ ...diagram, title: event.target.value })} /></label>
        {idEditable
          ? <label className="block text-xs font-medium text-slate-700">Id (lowercase-with-hyphens)<input className={`${input} font-mono`} value={diagram.id} onChange={(event) => setDiagram({ ...diagram, id: event.target.value })} /></label>
          : <p className="text-xs text-slate-500">Id: <span className="font-mono">{diagram.id}</span></p>}
        <label className="block text-xs font-medium text-slate-700">Kind
          <select className={input} value={diagram.kind} onChange={(event) => setDiagram({ ...diagram, kind: event.target.value as DiagramDefinition["kind"] })}>
            {diagramKinds.map((kind) => <option key={kind} value={kind}>{kind.replace(/-/g, " ")}</option>)}
          </select>
        </label>
        <label className="block text-xs font-medium text-slate-700">Purpose<input className={input} value={diagram.purpose} onChange={(event) => setDiagram({ ...diagram, purpose: event.target.value })} /></label>
        <label className="block text-xs font-medium text-slate-700 md:col-span-2">Text alternative (required for accessibility)<textarea rows={2} className={`${input} py-2`} value={diagram.altText} onChange={(event) => setDiagram({ ...diagram, altText: event.target.value })} /></label>
        <label className="block text-xs font-medium text-slate-700 md:col-span-2">Step-by-step explanation (one step per line; node “step” numbers control reveal order)
          <textarea rows={3} className={`${input} py-2`} value={diagram.explanationSteps.join("\n")} onChange={(event) => setDiagram({ ...diagram, explanationSteps: event.target.value.split("\n").filter((line) => line.trim()) })} />
        </label>
      </div>
      <DiagramViewer diagram={diagram} editable onChange={setDiagram} height={420} />
      <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <summary className="cursor-pointer text-xs font-semibold text-slate-700">Reveal steps and edge labels</summary>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {diagram.nodes.map((node) => (
            <label key={node.id} className="flex items-center justify-between gap-2 text-xs text-slate-700">{node.label.replace(/\n/g, " ")}
              <input type="number" min={0} max={50} className="w-16 rounded border border-slate-300 px-1" value={node.step} aria-label={`Reveal step for ${node.label}`} onChange={(event) => setDiagram({ ...diagram, nodes: diagram.nodes.map((item) => item.id === node.id ? { ...item, step: Math.max(0, Number(event.target.value) || 0) } : item) })} />
            </label>
          ))}
          {diagram.edges.map((edge) => (
            <label key={edge.id} className="flex items-center justify-between gap-2 text-xs text-slate-700">{edge.source} → {edge.target}
              <input className="w-32 rounded border border-slate-300 px-1" value={edge.label} aria-label={`Label for connection ${edge.source} to ${edge.target}`} onChange={(event) => setDiagram({ ...diagram, edges: diagram.edges.map((item) => item.id === edge.id ? { ...item, label: event.target.value } : item) })} />
              <button type="button" className="text-red-700 underline" onClick={() => setDiagram({ ...diagram, edges: diagram.edges.filter((item) => item.id !== edge.id) })}>Remove</button>
            </label>
          ))}
        </div>
      </details>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={save} disabled={pending} className="inline-flex min-h-10 items-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-60">Save diagram</button>
        {onDelete && <button type="button" onClick={async () => { if (window.confirm("Delete this diagram?")) { try { await onDelete(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Not deleted."); } } }} className="inline-flex min-h-10 items-center rounded-lg border border-red-300 bg-white px-4 text-sm font-semibold text-red-800">Delete</button>}
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
    </div>
  );
}
