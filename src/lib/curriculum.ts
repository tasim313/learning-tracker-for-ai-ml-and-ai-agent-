import type { ApplicationData } from "@/lib/model";

/** Add editable curriculum structure to topics that predate subtopics and task tracking. */
export function addInitialCurriculum(data: Pick<ApplicationData, "topics" | "subtopics" | "learningTasks">): Pick<ApplicationData, "subtopics" | "learningTasks"> {
  const subtopics = [...data.subtopics];
  const learningTasks = [...data.learningTasks];
  for (const topic of data.topics) {
    const existing = subtopics.filter((item) => item.topicId === topic.id);
    if (existing.length) continue;
    const conceptsId = `curriculum-${topic.id}-concepts`;
    const practiceId = `curriculum-${topic.id}-practical`;
    const conceptMinutes = Math.max(10, Math.round(topic.estimatedMinutes * 0.4));
    const practicalMinutes = Math.max(10, topic.estimatedMinutes - conceptMinutes);
    subtopics.push(
      {
        id: conceptsId, topicId: topic.id, title: `${topic.title}: core concepts`,
        description: topic.description, objectives: topic.objectives, order: 1, estimatedMinutes: conceptMinutes
      },
      {
        id: practiceId, topicId: topic.id, title: `${topic.title}: practical application`,
        description: topic.practicalExercise, objectives: topic.deliverable ? [topic.deliverable] : [], order: 2, estimatedMinutes: practicalMinutes
      }
    );
    learningTasks.push(
      {
        id: `curriculum-${topic.id}-learn`, subtopicId: conceptsId,
        title: `Explain ${topic.title} in your own words`, description: topic.description,
        taskType: "learn", estimatedMinutes: Math.max(10, Math.round(conceptMinutes * 0.6)),
        status: "not-started", completionCriteria: "Explain the objectives in your own words without relying on the lesson text.", evidence: "", completedAt: null
      },
      {
        id: `curriculum-${topic.id}-check`, subtopicId: conceptsId,
        title: `Check recall: ${topic.title}`, description: "Write down what you can recall and what needs more practice.",
        taskType: "practice", estimatedMinutes: Math.max(5, conceptMinutes - Math.round(conceptMinutes * 0.6)),
        status: "not-started", completionCriteria: "Record a short explanation and list any concepts that remain unclear.", evidence: "", completedAt: null
      },
      {
        id: `curriculum-${topic.id}-practical`, subtopicId: practiceId,
        title: topic.practicalExercise ? "Complete the practical exercise" : "Create a practical demonstration",
        description: topic.practicalExercise || topic.deliverable,
        taskType: "practical", estimatedMinutes: practicalMinutes,
        status: "not-started", completionCriteria: topic.completionCriteria || "Save working evidence that demonstrates the learning objective.", evidence: "", completedAt: null
      }
    );
  }
  return { subtopics, learningTasks };
}
