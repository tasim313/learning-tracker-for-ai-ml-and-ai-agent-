import { NextResponse } from "next/server";
import { jsonError, readJsonObject, withUser } from "@/lib/auth/http";
import { findLesson, getPublishedCourse } from "@/lib/content/store";
import { cardsFromLesson, configuredIntervals, createCard, dueCards, retentionRate, scheduleReview, type ReviewGrade } from "@/lib/services/flashcards";
import { loadUserData, updateUserData } from "@/lib/storage/user-store";

export const GET = withUser(async ({ user }) => {
  const data = await loadUserData(user.id);
  return NextResponse.json({ cards: data.flashcards, due: dueCards(data).map((card) => card.id), intervals: configuredIntervals(data.settings), retentionPercent: retentionRate(data.flashcards) });
});

export const POST = withUser(async ({ request, user }) => {
  const body = await readJsonObject(request);
  switch (body.action) {
    case "create": {
      const card = await updateUserData(user.id, (data) => { const created = createCard(body, data); return { data: { ...data, flashcards: [...data.flashcards, created] }, result: created }; });
      return NextResponse.json(card, { status: 201 });
    }
    case "review": {
      const grade = body.grade as ReviewGrade;
      if (!["again", "hard", "good", "easy"].includes(grade)) return jsonError("Grade must be again, hard, good, or easy.");
      const card = await updateUserData(user.id, (data) => {
        const existing = data.flashcards.find((item) => item.id === body.cardId);
        if (!existing) throw new Error("Card was not found.");
        const reviewed = scheduleReview(existing, grade, configuredIntervals(data.settings));
        return { data: { ...data, flashcards: data.flashcards.map((item) => item.id === existing.id ? reviewed : item) }, result: reviewed };
      });
      return NextResponse.json(card);
    }
    case "update": {
      const card = await updateUserData(user.id, (data) => {
        const existing = data.flashcards.find((item) => item.id === body.cardId);
        if (!existing) throw new Error("Card was not found.");
        const front = typeof body.front === "string" ? body.front.trim() : existing.front;
        const back = typeof body.back === "string" ? body.back.trim() : existing.back;
        if (!front || !back) throw new Error("Both sides of the card are required.");
        const updated = { ...existing, front, back, suspended: typeof body.suspended === "boolean" ? body.suspended : existing.suspended };
        return { data: { ...data, flashcards: data.flashcards.map((item) => item.id === existing.id ? updated : item) }, result: updated };
      });
      return NextResponse.json(card);
    }
    case "delete": {
      await updateUserData(user.id, (data) => {
        if (!data.flashcards.some((item) => item.id === body.cardId)) throw new Error("Card was not found.");
        return { data: { ...data, flashcards: data.flashcards.filter((item) => item.id !== body.cardId) }, result: null };
      });
      return NextResponse.json({ deleted: true });
    }
    case "from-lesson": {
      const course = typeof body.courseId === "string" ? await getPublishedCourse(body.courseId) : null;
      const found = course && typeof body.lessonId === "string" ? findLesson(course, body.lessonId) : null;
      if (!found) return jsonError("Lesson was not found.", 404);
      const created = await updateUserData(user.id, (data) => { const cards = cardsFromLesson(data, found.lesson); return { data: { ...data, flashcards: [...data.flashcards, ...cards] }, result: cards.length }; });
      return NextResponse.json({ created });
    }
    default:
      return jsonError("Unknown flashcard action.");
  }
});
