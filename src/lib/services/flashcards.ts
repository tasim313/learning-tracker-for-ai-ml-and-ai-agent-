import { randomUUID } from "node:crypto";
import type { ApplicationData, Flashcard } from "@/lib/model";
import type { Lesson } from "@/lib/content/schema";

/**
 * Spaced repetition with fixed stages. Each stage maps to an interval in days
 * (configurable in settings as `revisionIntervalsDays`, default 1, 3, 7, 14, 30).
 *  - again: back to stage 0, due again in 10 minutes (same session)
 *  - hard:  stay on the current stage and repeat its interval
 *  - good:  advance one stage
 *  - easy:  advance two stages
 */
export const defaultIntervals = [1, 3, 7, 14, 30];
export type ReviewGrade = "again" | "hard" | "good" | "easy";
const dayMs = 86_400_000;

export function configuredIntervals(settings: Record<string, unknown>): number[] {
  const value = settings.revisionIntervalsDays;
  if (Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "number" && Number.isFinite(item) && item > 0 && item <= 365)) {
    return [...value as number[]].sort((a, b) => a - b);
  }
  return defaultIntervals;
}

export function scheduleReview(card: Flashcard, grade: ReviewGrade, intervals: number[], now = new Date()): Flashcard {
  const lastStage = intervals.length - 1;
  let stage = card.stage;
  let dueAt: Date;
  if (grade === "again") {
    stage = 0;
    dueAt = new Date(now.getTime() + 10 * 60_000);
  } else {
    stage = grade === "hard" ? Math.min(stage, lastStage) : Math.min(lastStage, stage + (grade === "easy" ? 2 : 1));
    dueAt = new Date(now.getTime() + intervals[stage] * dayMs);
  }
  const intervalDays = (dueAt.getTime() - now.getTime()) / dayMs;
  return { ...card, stage, dueAt: dueAt.toISOString(), reviews: [...card.reviews, { reviewedAt: now.toISOString(), grade, intervalDays }] };
}

export function dueCards(data: ApplicationData, now = new Date()): Flashcard[] {
  return data.flashcards.filter((card) => !card.suspended && Date.parse(card.dueAt) <= now.getTime()).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export function createCard(input: Record<string, unknown>, data: ApplicationData, now = new Date()): Flashcard {
  const front = typeof input.front === "string" ? input.front.trim() : "";
  const back = typeof input.back === "string" ? input.back.trim() : "";
  if (!front || !back) throw new Error("Both sides of the card are required.");
  const topicId = typeof input.topicId === "string" && input.topicId ? input.topicId : null;
  if (topicId && !data.topics.some((topic) => topic.id === topicId)) throw new Error("Selected topic was not found.");
  if (data.flashcards.some((card) => card.front.toLowerCase() === front.toLowerCase())) throw new Error("A card with this front already exists.");
  return {
    id: randomUUID(), front, back, topicId, source: typeof input.source === "string" && input.source ? input.source.slice(0, 200) : "Created by learner",
    stage: 0, dueAt: now.toISOString(), createdAt: now.toISOString(), suspended: false, reviews: []
  };
}

/** Create cards from a lesson glossary, skipping terms that already have a card. */
export function cardsFromLesson(data: ApplicationData, lesson: Lesson, now = new Date()): Flashcard[] {
  const existing = new Set(data.flashcards.map((card) => card.front.toLowerCase()));
  const topicId = lesson.relatedTopicIds.find((id) => data.topics.some((topic) => topic.id === id)) ?? null;
  return lesson.glossary.filter((entry) => !existing.has(entry.term.toLowerCase())).map((entry) => ({
    id: randomUUID(), front: entry.term, back: entry.definition, topicId, source: `Lesson glossary: ${lesson.title}`,
    stage: 0, dueAt: now.toISOString(), createdAt: now.toISOString(), suspended: false, reviews: []
  }));
}

/** Share of reviews graded good or easy; null with no reviews. */
export function retentionRate(cards: Flashcard[]): number | null {
  const reviews = cards.flatMap((card) => card.reviews);
  if (!reviews.length) return null;
  return reviews.filter((review) => review.grade === "good" || review.grade === "easy").length / reviews.length * 100;
}
