import type { ApplicationData } from "@/lib/model";

export function getDashboardSummary(data: ApplicationData) {
  const completedPhases = data.roadmapPhases.filter((phase) => phase.status === "completed").length;
  const inProgressPhases = data.roadmapPhases.filter((phase) => phase.status === "in-progress").length;
  const topicCount = data.topics.length;
  const completedTopics = data.topics.filter((topic) => topic.status === "completed").length;
  const focusedSeconds = data.learningSessions.filter((session) => session.state === "completed").reduce(
    (total, session) => total + session.focusedSeconds,
    0
  );

  return {
    phaseCount: data.roadmapPhases.length,
    completedPhases,
    inProgressPhases,
    topicCount,
    completedTopics,
    focusedMinutes: Math.floor(focusedSeconds / 60),
    nextPhase: data.roadmapPhases.find((phase) => phase.status !== "completed") ?? null
  };
}
