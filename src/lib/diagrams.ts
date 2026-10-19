import type { DiagramDefinition } from "@/lib/model";

/** Deterministic pseudo-random generator (mulberry32) so generated questions can be re-created and graded on the server. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleWith<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function maxStep(diagram: Pick<DiagramDefinition, "nodes" | "edges">): number {
  return Math.max(0, ...diagram.nodes.map((node) => node.step), ...diagram.edges.map((edge) => edge.step));
}

export type DiagramQuestion = { id: string; prompt: string; options: string[]; answer: string };

/**
 * Questions generated from the diagram's structure: "what directly follows X?"
 * for every node with exactly one outgoing connection, plus "which element is a decision?".
 */
export function diagramQuestions(diagram: DiagramDefinition): DiagramQuestion[] {
  const labels = new Map(diagram.nodes.map((node) => [node.id, node.label.replace(/\n/g, " ")]));
  const random = seededRandom(diagram.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0));
  const questions: DiagramQuestion[] = [];
  for (const node of diagram.nodes) {
    const outgoing = diagram.edges.filter((edge) => edge.source === node.id && edge.target !== node.id);
    if (outgoing.length !== 1) continue;
    const answer = labels.get(outgoing[0].target)!;
    const distractors = shuffleWith([...labels.values()].filter((label) => label !== answer && label !== labels.get(node.id)), random).slice(0, 3);
    if (distractors.length < 1) continue;
    questions.push({ id: `next-${node.id}`, prompt: `What directly follows “${labels.get(node.id)}”?`, options: shuffleWith([answer, ...distractors], random), answer });
  }
  const decisions = diagram.nodes.filter((node) => node.shape === "decision");
  if (decisions.length === 1) {
    const answer = labels.get(decisions[0].id)!;
    const others = shuffleWith(diagram.nodes.filter((node) => node.shape !== "decision").map((node) => labels.get(node.id)!), random).slice(0, 3);
    if (others.length) questions.push({ id: "decision", prompt: "Which element is a decision point?", options: shuffleWith([answer, ...others], random), answer });
  }
  return questions;
}

/** Correct order of nodes for a "reconstruct the workflow" exercise: by reveal step, then reading order. */
export function nodeOrder(diagram: DiagramDefinition): string[] {
  return [...diagram.nodes].sort((left, right) => left.step - right.step || left.y - right.y || left.x - right.x).map((node) => node.id);
}
