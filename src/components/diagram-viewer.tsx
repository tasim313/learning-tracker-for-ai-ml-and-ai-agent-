"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Background, Controls, MarkerType, ReactFlow, applyNodeChanges,
  type Connection, type Edge, type Node, type NodeChange
} from "@xyflow/react";
import { ChevronLeft, ChevronRight, Download, Eye, Plus, Trash2 } from "lucide-react";
import type { DiagramDefinition } from "@/lib/model";
import { maxStep } from "@/lib/diagrams";

const shapeStyles: Record<DiagramDefinition["nodes"][number]["shape"], string> = {
  process: "#eff6ff",
  decision: "#fef3c7",
  start: "#dcfce7",
  data: "#f1f5f9",
  actor: "#fae8ff",
  note: "#ffffff"
};

function toFlowNodes(diagram: DiagramDefinition, visibleStep: number, selected: string | null): Node[] {
  return diagram.nodes.filter((node) => node.step <= visibleStep).map((node) => ({
    id: node.id,
    position: { x: node.x, y: node.y },
    data: { label: node.label },
    ariaLabel: node.label,
    style: {
      background: shapeStyles[node.shape],
      border: `${selected === node.id ? 3 : 1}px solid ${selected === node.id ? "#1d4ed8" : node.shape === "decision" ? "#d97706" : "#94a3b8"}`,
      borderRadius: node.shape === "decision" ? 4 : node.shape === "start" ? 999 : 8,
      borderStyle: node.shape === "note" ? "dashed" : "solid",
      color: "#0f172a",
      fontSize: 12,
      whiteSpace: "pre-line",
      width: 170,
      padding: 8
    }
  }));
}

function toFlowEdges(diagram: DiagramDefinition, visibleStep: number): Edge[] {
  const visibleNodes = new Set(diagram.nodes.filter((node) => node.step <= visibleStep).map((node) => node.id));
  return diagram.edges.filter((edge) => edge.step <= visibleStep && visibleNodes.has(edge.source) && visibleNodes.has(edge.target)).map((edge) => ({
    id: edge.id, source: edge.source, target: edge.target, label: edge.label || undefined,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#475569" },
    style: { stroke: "#475569" },
    labelStyle: { fontSize: 11, fill: "#334155" },
    labelBgStyle: { fill: "#ffffff" }
  }));
}

function download(diagram: DiagramDefinition) {
  const blob = new Blob([`${JSON.stringify(diagram, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${diagram.id}.diagram.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Interactive diagram: step-by-step reveal, node inspection, a text alternative,
 * JSON export, and (when editable) adding, moving, connecting, and deleting nodes.
 */
export function DiagramViewer({ diagram, editable = false, onChange, height = 380 }: {
  diagram: DiagramDefinition;
  editable?: boolean;
  onChange?: (diagram: DiagramDefinition) => void;
  height?: number;
}) {
  const last = maxStep(diagram);
  const [stepMode, setStepMode] = useState(false);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const visibleStep = stepMode && !editable ? step : Number.MAX_SAFE_INTEGER;
  const nodes = useMemo(() => toFlowNodes(diagram, visibleStep, selected), [diagram, visibleStep, selected]);
  const edges = useMemo(() => toFlowEdges(diagram, visibleStep), [diagram, visibleStep]);
  const selectedNode = diagram.nodes.find((node) => node.id === selected) ?? null;

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    if (!editable || !onChange) return;
    const moved = applyNodeChanges(changes, nodes);
    const positions = new Map(moved.map((node) => [node.id, node.position]));
    const removed = new Set(changes.filter((change) => change.type === "remove").map((change) => change.id));
    onChange({
      ...diagram,
      nodes: diagram.nodes.filter((node) => !removed.has(node.id)).map((node) => ({ ...node, x: Math.round(positions.get(node.id)?.x ?? node.x), y: Math.round(positions.get(node.id)?.y ?? node.y) })),
      edges: diagram.edges.filter((edge) => !removed.has(edge.source) && !removed.has(edge.target))
    });
  }, [diagram, editable, nodes, onChange]);

  const onConnect = useCallback((connection: Connection) => {
    if (!editable || !onChange || !connection.source || !connection.target) return;
    const id = `e${Date.now().toString(36)}`;
    onChange({ ...diagram, edges: [...diagram.edges, { id, source: connection.source, target: connection.target, label: "", step: 0 }] });
  }, [diagram, editable, onChange]);

  function addNode() {
    if (!onChange) return;
    const id = `n${Date.now().toString(36)}`;
    onChange({ ...diagram, nodes: [...diagram.nodes, { id, label: "New step", detail: "", x: 40 + diagram.nodes.length * 20, y: 40 + diagram.nodes.length * 20, shape: "process", step: 0 }] });
    setSelected(id);
  }

  function updateSelected(patch: Partial<DiagramDefinition["nodes"][number]>) {
    if (!onChange || !selectedNode) return;
    onChange({ ...diagram, nodes: diagram.nodes.map((node) => node.id === selectedNode.id ? { ...node, ...patch } : node) });
  }

  function removeSelected() {
    if (!onChange || !selectedNode) return;
    onChange({ ...diagram, nodes: diagram.nodes.filter((node) => node.id !== selectedNode.id), edges: diagram.edges.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id) });
    setSelected(null);
  }

  const button = "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 disabled:opacity-50";

  return (
    <figure className="rounded-xl border border-slate-200 bg-white" aria-labelledby={`diagram-${diagram.id}-title`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <p id={`diagram-${diagram.id}-title`} className="text-sm font-semibold text-slate-900">{diagram.title}</p>
          <p className="text-xs text-slate-500">Interactive {diagram.kind.replace(/-/g, " ")} diagram{editable ? " · drag nodes, connect handles, select to edit" : " · select a node to inspect it"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!editable && <button type="button" className={button} onClick={() => { setStepMode((value) => !value); setStep(0); }} aria-pressed={stepMode}><Eye size={14} aria-hidden="true" />{stepMode ? "Show all" : "Reveal step by step"}</button>}
          {editable && <button type="button" className={button} onClick={addNode}><Plus size={14} aria-hidden="true" />Add node</button>}
          <button type="button" className={button} onClick={() => download(diagram)}><Download size={14} aria-hidden="true" />Export JSON</button>
        </div>
      </div>
      {stepMode && !editable && (
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2" role="group" aria-label="Diagram steps">
          <button type="button" className={button} disabled={step === 0} onClick={() => setStep((value) => value - 1)}><ChevronLeft size={14} aria-hidden="true" />Previous</button>
          <span className="text-xs font-medium text-slate-700" aria-live="polite">Step {step + 1} of {last + 1}</span>
          <button type="button" className={button} disabled={step >= last} onClick={() => setStep((value) => value + 1)}>Next<ChevronRight size={14} aria-hidden="true" /></button>
          {diagram.explanationSteps[step] && <p className="w-full text-sm text-slate-800">{diagram.explanationSteps[step]}</p>}
        </div>
      )}
      <div style={{ height }} className="w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={editable}
          nodesConnectable={editable}
          elementsSelectable
          onNodesChange={onNodesChange}
          onConnect={onConnect}
          onNodeClick={(_event, node) => setSelected(node.id)}
          onPaneClick={() => setSelected(null)}
          deleteKeyCode={editable ? ["Backspace", "Delete"] : null}
          proOptions={{ hideAttribution: false }}
        >
          <Background gap={16} color="#e2e8f0" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      {selectedNode && (
        <div className="border-t border-slate-100 bg-blue-50/50 px-4 py-3 text-sm" aria-live="polite">
          {editable ? (
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
              <label className="text-xs font-medium text-slate-700">Label<input value={selectedNode.label} onChange={(event) => updateSelected({ label: event.target.value || " " })} className="mt-1 block min-h-9 w-full rounded-lg border border-slate-300 px-2 text-sm" /></label>
              <label className="text-xs font-medium text-slate-700">Detail<input value={selectedNode.detail} onChange={(event) => updateSelected({ detail: event.target.value })} className="mt-1 block min-h-9 w-full rounded-lg border border-slate-300 px-2 text-sm" /></label>
              <label className="text-xs font-medium text-slate-700">Shape
                <select value={selectedNode.shape} onChange={(event) => updateSelected({ shape: event.target.value as DiagramDefinition["nodes"][number]["shape"] })} className="mt-1 block min-h-9 rounded-lg border border-slate-300 px-2 text-sm">
                  {Object.keys(shapeStyles).map((shape) => <option key={shape} value={shape}>{shape}</option>)}
                </select>
              </label>
              <button type="button" onClick={removeSelected} className={button}><Trash2 size={14} aria-hidden="true" />Delete node</button>
            </div>
          ) : (
            <><p className="font-semibold text-slate-900">{selectedNode.label.replace(/\n/g, " ")}</p><p className="mt-1 text-slate-700">{selectedNode.detail || "No additional detail for this element."}</p></>
          )}
        </div>
      )}
      <figcaption className="space-y-2 border-t border-slate-100 px-4 py-3 text-sm text-slate-700">
        {diagram.purpose && <p>{diagram.purpose}</p>}
        <details>
          <summary className="cursor-pointer text-xs font-semibold text-slate-700">Text description and elements</summary>
          <p className="mt-2">{diagram.altText}</p>
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="Diagram elements">
            {diagram.nodes.map((node) => (
              <li key={node.id}><button type="button" onClick={() => setSelected(node.id)} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800">{node.label.replace(/\n/g, " ")}</button></li>
            ))}
          </ul>
          {diagram.explanationSteps.length > 0 && <ol className="mt-3 list-decimal space-y-1 pl-5">{diagram.explanationSteps.map((text, index) => <li key={index}>{text}</li>)}</ol>}
        </details>
      </figcaption>
    </figure>
  );
}
