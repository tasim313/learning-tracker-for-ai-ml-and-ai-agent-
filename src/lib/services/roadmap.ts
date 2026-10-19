import type { ApplicationData } from "@/lib/model";

type Direction = "up" | "down";

function assertDirection(direction: unknown): asserts direction is Direction {
  if (direction !== "up" && direction !== "down") throw new Error("Direction must be up or down.");
}

/** Swap a phase with its neighbour and renumber phases 1…n so `order` stays contiguous. */
export function movePhase(data: ApplicationData, phaseId: string, direction: unknown): ApplicationData {
  assertDirection(direction);
  const phases = [...data.roadmapPhases].sort((a, b) => a.order - b.order);
  const index = phases.findIndex((phase) => phase.id === phaseId);
  if (index < 0) throw new Error("Phase was not found.");
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= phases.length) return data;
  [phases[index], phases[target]] = [phases[target], phases[index]];
  return { ...data, roadmapPhases: phases.map((phase, position) => ({ ...phase, order: position + 1 })) };
}

/** Move a topic before or after its neighbour within the same phase. Topic order is the array order. */
export function moveTopic(data: ApplicationData, topicId: string, direction: unknown): ApplicationData {
  assertDirection(direction);
  const topic = data.topics.find((item) => item.id === topicId);
  if (!topic) throw new Error("Topic was not found.");
  const samePhase = data.topics.map((item, index) => ({ item, index })).filter(({ item }) => item.phaseId === topic.phaseId);
  const position = samePhase.findIndex(({ item }) => item.id === topicId);
  const neighbour = samePhase[direction === "up" ? position - 1 : position + 1];
  if (!neighbour) return data;
  const topics = [...data.topics];
  const from = samePhase[position].index;
  [topics[from], topics[neighbour.index]] = [topics[neighbour.index], topics[from]];
  return { ...data, topics };
}

export function setTopicPriority(data: ApplicationData, topicId: string, priority: unknown): ApplicationData {
  if (priority !== "low" && priority !== "medium" && priority !== "high") throw new Error("Priority must be low, medium, or high.");
  if (!data.topics.some((item) => item.id === topicId)) throw new Error("Topic was not found.");
  return { ...data, topics: data.topics.map((item) => item.id === topicId ? { ...item, priority } : item) };
}
