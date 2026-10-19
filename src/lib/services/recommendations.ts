import type { ApplicationData } from "@/lib/model";
import type { Course } from "@/lib/content/schema";
import { competencyThresholds, topicScore } from "@/lib/services/competency";
import { dueCards } from "@/lib/services/flashcards";

/**
 * Explainable, evidence-based recommendations. Every item states why it was
 * recommended and which recorded evidence it used. Nothing here infers mastery
 * from time spent or lesson completion. Learners can dismiss, snooze, or pin items.
 */
export type Recommendation = {
  key: string;
  kind: "revision" | "flashcards" | "practical" | "spaced-repetition" | "prerequisite" | "difficulty" | "diagnostic" | "skip" | "lesson" | "review-mistakes" | "math-practice" | "next-topic";
  title: string;
  reason: string;
  evidence: string[];
  href: string;
  priority: number;
  override: "pinned" | "snoozed" | "dismissed" | null;
};

type Input = { data: ApplicationData; courses: Course[]; now?: Date };

export function buildRecommendations({ data, courses, now = new Date() }: Input): { visible: Recommendation[]; hidden: Recommendation[] } {
  const items: Omit<Recommendation, "override">[] = [];
  const thresholds = competencyThresholds(data);
  const topicTitle = new Map(data.topics.map((topic) => [topic.id, topic.title]));
  const graded = data.examinationAttempts.filter((attempt) => attempt.submittedAt && attempt.scorePercent !== null)
    .sort((a, b) => String(a.submittedAt).localeCompare(String(b.submittedAt)));
  const date = (value: string | null) => value ? value.slice(0, 10) : "unknown date";

  // 1. Revisions that are due, scheduled from actual examination results.
  for (const revision of data.revisionSchedules.filter((item) => Date.parse(item.dueAt) <= now.getTime())) {
    items.push({
      key: `revision:${revision.id}`, kind: "revision", priority: 90,
      title: `Revise and retest: ${topicTitle.get(revision.topicId) ?? revision.topicId}`,
      reason: `A ${revision.intervalDays}-day revision was scheduled after your last assessment of this topic and is now due.`,
      evidence: [`Due ${date(revision.dueAt)}`, revision.lastScorePercent === null ? "Last score: awaiting manual grading" : `Last score: ${revision.lastScorePercent.toFixed(0)}%`],
      href: "/revisions"
    });
  }

  // 2. Flashcards due.
  const due = dueCards(data, now);
  if (due.length) {
    items.push({ key: "flashcards:due", kind: "flashcards", priority: 80, title: `Review ${due.length} due flashcard${due.length === 1 ? "" : "s"}`, reason: "Reviewing at spaced intervals strengthens long-term recall.", evidence: [`${due.length} card(s) due now`], href: "/flashcards" });
  }

  // Per-topic assessment evidence.
  for (const topic of data.topics) {
    const theory = graded.filter((attempt) => !["retention", "practical"].includes(attempt.examType)).map((attempt) => ({ attempt, score: topicScore(data, attempt.id, topic.id) })).filter((item): item is { attempt: typeof item.attempt; score: number } => item.score !== null);
    const practical = graded.filter((attempt) => attempt.questionSnapshots.some((question) => question.topicId === topic.id && question.questionType === "practical")).map((attempt) => ({ attempt, score: topicScore(data, attempt.id, topic.id) })).filter((item): item is { attempt: typeof item.attempt; score: number } => item.score !== null);
    const retention = graded.filter((attempt) => attempt.examType === "retention").map((attempt) => ({ attempt, score: topicScore(data, attempt.id, topic.id) })).filter((item): item is { attempt: typeof item.attempt; score: number } => item.score !== null);
    const bestTheory = theory.length ? Math.max(...theory.map((item) => item.score)) : null;
    const bestPractical = practical.length ? Math.max(...practical.map((item) => item.score)) : null;
    const latestRetention = retention.at(-1) ?? null;

    // 3. Strong theory, weak or missing implementation.
    if (bestTheory !== null && bestTheory >= thresholds.topic && topic.practicalRequired && (bestPractical === null || bestPractical < thresholds.practical)) {
      items.push({
        key: `practical:${topic.id}`, kind: "practical", priority: 75, title: `Build it: practical work for ${topic.title}`,
        reason: "Your theory result is strong, but practical implementation has not yet been demonstrated at the required level.",
        evidence: [`Best theory score ${bestTheory.toFixed(0)}% (threshold ${thresholds.topic}%)`, bestPractical === null ? "No graded practical assessment yet" : `Best practical score ${bestPractical.toFixed(0)}% (threshold ${thresholds.practical}%)`, topic.practicalExercise ? `Suggested exercise: ${topic.practicalExercise}` : ""].filter(Boolean),
        href: `/topics/${encodeURIComponent(topic.id)}`
      });
    }
    // 4. Strong immediately, weak after a delay.
    if (bestTheory !== null && bestTheory >= thresholds.topic && latestRetention && latestRetention.score < thresholds.retention) {
      items.push({
        key: `retention:${topic.id}`, kind: "spaced-repetition", priority: 85, title: `Strengthen recall: ${topic.title}`,
        reason: "You did well when you first studied this topic, but your delayed-retention result is lower. Spaced repetition targets this.",
        evidence: [`Best theory score ${bestTheory.toFixed(0)}%`, `Retention score ${latestRetention.score.toFixed(0)}% on ${date(latestRetention.attempt.submittedAt)} (threshold ${thresholds.retention}%)`],
        href: "/flashcards"
      });
    }
  }

  // 5. The same question missed repeatedly — a possible misconception.
  const misses = new Map<string, { count: number; topicId: string }>();
  for (const attempt of graded) {
    for (const result of attempt.questionResults) {
      if (result.correct === false || result.status === "partial") {
        const topicId = attempt.questionSnapshots.find((question) => question.questionId === result.questionId)?.topicId ?? "";
        const current = misses.get(result.questionId) ?? { count: 0, topicId };
        misses.set(result.questionId, { count: current.count + 1, topicId });
      }
    }
  }
  for (const [questionId, { count, topicId }] of misses) {
    if (count < 2) continue;
    const topic = data.topics.find((item) => item.id === topicId);
    const prerequisites = (topic?.prerequisites ?? []).map((id) => topicTitle.get(id) ?? id);
    const lesson = courses.flatMap((course) => course.modules.flatMap((module) => module.lessons.map((item) => ({ course, lesson: item })))).find(({ lesson: item }) => item.relatedTopicIds.includes(topicId));
    items.push({
      key: `misconception:${questionId}`, kind: "prerequisite", priority: 70,
      title: `Possible knowledge gap: ${topic?.title ?? "a repeated question"}`,
      reason: "The same question was answered incorrectly more than once. This may point to a misconception, so review the underlying concept with a different explanation before retrying.",
      evidence: [`Question ${questionId} missed ${count} times`, prerequisites.length ? `Prerequisites to review: ${prerequisites.join(", ")}` : "No prerequisites recorded for this topic"],
      href: lesson ? `/courses/${lesson.course.id}/lessons/${lesson.lesson.id}` : `/topics/${encodeURIComponent(topicId)}`
    });
  }

  // 6. Advanced questions consistently difficult.
  const difficultyOf = new Map(data.examinationQuestions.map((question) => [question.id, question.difficulty]));
  const advanced = graded.flatMap((attempt) => attempt.questionResults).filter((result) => difficultyOf.get(result.questionId) === "advanced" && result.correct !== null);
  if (advanced.length >= 3) {
    const rate = advanced.filter((result) => result.correct).length / advanced.length * 100;
    if (rate < 50) items.push({ key: "difficulty:advanced", kind: "difficulty", priority: 60, title: "Consolidate with intermediate exercises", reason: "Advanced questions have been consistently difficult. Intermediate practice first usually makes advanced problems more approachable.", evidence: [`${rate.toFixed(0)}% correct on ${advanced.length} advanced questions`], href: "/math-lab" });
  }

  // 7. Diagnostic not taken / topics that may be skipped.
  const diagnostics = graded.filter((attempt) => attempt.examType === "diagnostic");
  if (!data.examinationAttempts.some((attempt) => attempt.examType === "diagnostic")) {
    items.push({ key: "diagnostic:start", kind: "diagnostic", priority: 95, title: "Take a diagnostic examination", reason: "A diagnostic shows which topics you already know, so you can skip what you can demonstrate.", evidence: ["No diagnostic attempt recorded"], href: "/exams" });
  }
  for (const topic of data.topics) {
    const scores = diagnostics.map((attempt) => topicScore(data, attempt.id, topic.id)).filter((score): score is number => score !== null);
    if (scores.length && Math.max(...scores) >= thresholds.topic && topic.status !== "completed") {
      items.push({ key: `skip:${topic.id}`, kind: "skip", priority: 40, title: `You may be able to skip: ${topic.title}`, reason: "Your diagnostic result for this topic meets the passing threshold. Confirm with a topic examination (and practical work, if required) instead of re-studying it.", evidence: [`Diagnostic score ${Math.max(...scores).toFixed(0)}% (threshold ${thresholds.topic}%)`], href: `/topics/${encodeURIComponent(topic.id)}` });
    }
  }

  // 8. Continue enrolled courses, respecting lesson prerequisites.
  const completedLessons = new Set(data.lessonProgress.filter((item) => item.completedAt).map((item) => item.lessonId));
  for (const enrollment of data.courseEnrollments.filter((item) => item.status === "active")) {
    const course = courses.find((item) => item.id === enrollment.courseId);
    if (!course) continue;
    const next = course.modules.flatMap((module) => module.lessons).find((lesson) => !completedLessons.has(lesson.id));
    if (!next) continue;
    const missing = next.prerequisites.filter((id) => !completedLessons.has(id));
    items.push({
      key: `lesson:${next.id}`, kind: "lesson", priority: missing.length ? 45 : 65, title: `Continue: ${next.title}`,
      reason: missing.length ? "This is the next lesson in your course, but it lists prerequisites you have not completed." : "This is the next lesson in a course you are taking.",
      evidence: [`Course: ${course.title}`, ...(missing.length ? [`Missing prerequisites: ${missing.join(", ")}`] : [])],
      href: `/courses/${course.id}/lessons/${next.id}`
    });
  }
  if (!data.courseEnrollments.length && courses.length) {
    items.push({ key: `course:${courses[0].id}`, kind: "lesson", priority: 50, title: `Start a course: ${courses[0].title}`, reason: "Courses combine explanations, diagrams, worked examples, and practice.", evidence: ["No course enrolments yet"], href: `/courses/${courses[0].id}` });
  }

  // 9. Knowledge checks with mistakes.
  for (const progress of data.lessonProgress) {
    const latestByBlock = new Map(progress.quizResults.map((result) => [result.blockId, result]));
    const missed = [...latestByBlock.values()].filter((result) => result.correct < result.total);
    if (!missed.length) continue;
    items.push({ key: `review:${progress.lessonId}`, kind: "review-mistakes", priority: 55, title: "Review missed knowledge-check questions", reason: "Your latest attempt at a lesson knowledge check had incorrect answers. Review mode shows them with your notes.", evidence: missed.map((result) => `${result.correct}/${result.total} correct on ${date(result.attemptedAt)}`), href: `/courses/${progress.courseId}/lessons/${progress.lessonId}` });
  }

  // 10. Recent mathematics practice accuracy.
  const recentMath = data.practiceAttempts.filter((attempt) => attempt.kind === "math").slice(-5);
  if (recentMath.length >= 5) {
    const rate = recentMath.filter((attempt) => attempt.correct).length / recentMath.length * 100;
    if (rate < 60) items.push({ key: "math:accuracy", kind: "math-practice", priority: 50, title: "Practise with worked solutions", reason: "Recent mathematics answers were often incorrect. Compare your working with the step-by-step solutions, and use a lower level for a while.", evidence: [`${rate.toFixed(0)}% correct in the last ${recentMath.length} problems`], href: "/math-lab" });
  }

  // 11. Next roadmap topic whose prerequisites are complete.
  const doneTopics = new Set(data.topics.filter((topic) => topic.status === "completed").map((topic) => topic.id));
  const nextTopic = data.topics.find((topic) => !["completed", "blocked", "backlog"].includes(topic.status) && topic.prerequisites.every((id) => doneTopics.has(id)));
  if (nextTopic) items.push({ key: `topic:${nextTopic.id}`, kind: "next-topic", priority: 35, title: `Study next: ${nextTopic.title}`, reason: "This is the next roadmap topic whose prerequisites are complete.", evidence: [`Status: ${nextTopic.status}`, `Priority: ${nextTopic.priority}`], href: `/topics/${encodeURIComponent(nextTopic.id)}` });

  // Apply learner overrides.
  const overrides = new Map(data.recommendationOverrides.map((item) => [item.recommendationKey, item]));
  const visible: Recommendation[] = [];
  const hidden: Recommendation[] = [];
  for (const item of items) {
    const override = overrides.get(item.key);
    const active = override && !(override.action === "snoozed" && override.until && Date.parse(override.until) <= now.getTime()) ? override : null;
    const withOverride = { ...item, override: active?.action ?? null };
    if (active?.action === "dismissed" || active?.action === "snoozed") hidden.push(withOverride);
    else visible.push(withOverride);
  }
  visible.sort((a, b) => Number(b.override === "pinned") - Number(a.override === "pinned") || b.priority - a.priority);
  return { visible, hidden };
}
