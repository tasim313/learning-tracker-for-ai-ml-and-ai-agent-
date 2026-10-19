import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { applicationDataSchema, type ApplicationData } from "@/lib/model";
import { updateApplicationData } from "@/lib/storage/json-store";
import { recordRewardEvent } from "@/lib/services/rewards";

const collectionNames = [
  "roadmapPhases", "topics", "resources", "learningSessions", "studyPlans",
  "assessments", "examinationQuestions", "examinationBlueprints",
  "examinationAttempts", "competencies", "revisionSchedules", "notes",
  "projects", "goals", "achievements", "rewards", "dailyReviews", "weeklyReviews",
  "experiments", "opportunities"
] as const;
type CollectionName = (typeof collectionNames)[number];

function isCollection(value: string): value is CollectionName {
  return collectionNames.includes(value as CollectionName);
}

function records(data: ApplicationData, collection: CollectionName): Record<string, unknown>[] {
  return data[collection] as Record<string, unknown>[];
}

function withRecords(data: ApplicationData, collection: CollectionName, items: Record<string, unknown>[]): ApplicationData {
  const result = applicationDataSchema.safeParse({ ...data, [collection]: items });
  if (!result.success) {
    throw new Error(result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
  }
  return result.data;
}

function errorResponse(error: unknown, status = 400) {
  return NextResponse.json({ error: error instanceof Error ? error.message : "The request could not be completed." }, { status });
}

export async function GET(_request: Request, context: { params: Promise<{ collection: string }> }) {
  const { collection } = await context.params;
  if (!isCollection(collection)) return errorResponse(new Error("Unknown data collection."), 404);
  try {
    const data = await import("@/lib/storage/json-store").then(({ loadApplicationData }) => loadApplicationData());
    const closedBookAttemptActive = data.examinationAttempts.some((attempt) =>
      attempt.submittedAt === null && attempt.selfDeclaredClosedBook
    );
    if (closedBookAttemptActive && ["notes", "resources"].includes(collection)) {
      return errorResponse(new Error("Notes and resource details are hidden during a self-declared closed-book examination."), 423);
    }
    if (closedBookAttemptActive && collection === "examinationQuestions") {
      const privateQuestions = records(data, collection).map((question) => ({
        ...question,
        correctAnswer: null,
        acceptedAnswers: [],
        explanation: "",
        rubric: "",
        misconceptions: []
      }));
      return NextResponse.json(privateQuestions, { headers: { "Cache-Control": "no-store" } });
    }
    if (collection === "examinationAttempts") {
      const visibleAttempts = data.examinationAttempts.map((attempt) => attempt.submittedAt === null
        ? {
            ...attempt,
            questionSnapshots: attempt.questionSnapshots.map((question) => attempt.selfDeclaredClosedBook
              ? { ...question, correctAnswer: null, acceptedAnswers: [], explanation: "", rubric: "" }
              : question)
          }
        : attempt);
      return NextResponse.json(visibleAttempts, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json(records(data, collection), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to read collection.", error);
    return errorResponse(new Error("Saved records are currently unavailable."), 500);
  }
}

export async function POST(request: Request, context: { params: Promise<{ collection: string }> }) {
  const { collection } = await context.params;
  if (!isCollection(collection)) return errorResponse(new Error("Unknown data collection."), 404);
  try {
    const payload = await request.json() as unknown;
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      return errorResponse(new Error("Record must be a JSON object."));
    }
    if (collection === "examinationAttempts" || collection === "achievements") {
      return errorResponse(new Error("Examination attempts and achievements are created only by their verified workflows."));
    }
    const now = new Date().toISOString();
    const record: Record<string, unknown> = { ...(payload as Record<string, unknown>), id: randomUUID() };
    if (collection === "examinationQuestions" && record.questionType === "calculation" && typeof record.correctAnswer === "string" && record.correctAnswer.trim()) {
      const correctNumber = Number(record.correctAnswer);
      if (!Number.isFinite(correctNumber)) return errorResponse(new Error("Calculation answer must be a finite number."));
      record.correctAnswer = correctNumber;
    }
    if (collection === "examinationQuestions") Object.assign(record, { version: 1, createdAt: now, updatedAt: now });
    if (collection === "assessments") Object.assign(record, { assessedAt: now });
    if (collection === "notes" || collection === "projects") Object.assign(record, { updatedAt: now });
    if (collection === "competencies") Object.assign(record, { updatedAt: now });
    if (collection === "rewards") Object.assign(record, { earnedAt: now, eventId: randomUUID() });
    const created = await updateApplicationData((data) => {
      const next = withRecords(data, collection, [...records(data, collection), record]);
      const award = collection === "projects" && record.status === "completed"
        ? recordRewardEvent(next, {
            eventId: `project-completed-${String(record.id)}`,
            title: "Project milestone completed",
            earnedAt: now,
            reason: `Completed project milestone: ${String(record.title)}.`,
            points: 20,
            achievement: { id: "achievement-first-project", title: "First project milestone completed" }
          })
        : { rewards: next.rewards, achievements: next.achievements };
      return { data: { ...next, ...award }, result: record };
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Unable to create record.", error);
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ collection: string }> }) {
  const { collection } = await context.params;
  if (!isCollection(collection)) return errorResponse(new Error("Unknown data collection."), 404);
  try {
    const payload = await request.json() as unknown;
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      return errorResponse(new Error("Record must be a JSON object."));
    }
    const body = payload as Record<string, unknown>;
    if (typeof body.id !== "string") return errorResponse(new Error("Record id is required."));
    const updated = await updateApplicationData((data) => {
      const items = records(data, collection);
      const index = items.findIndex((item) => item.id === body.id);
      if (index < 0) throw new Error("Record was not found.");
      if (collection === "assessments") throw new Error("Assessment results are historical records; create a new assessment to record an update.");
      if (collection === "examinationAttempts" || collection === "achievements" || collection === "rewards") {
        throw new Error("Historical examination, achievement, and reward records are immutable.");
      }
      const previous = items[index];
      const replacement: Record<string, unknown> = { ...previous, ...body, id: body.id };
      if (collection === "learningSessions" && body.focusedSeconds !== undefined && body.focusedSeconds !== previous.focusedSeconds) {
        if (typeof body.manualAdjustmentNote !== "string" || !body.manualAdjustmentNote.trim()) {
          throw new Error("Provide a reason before correcting historical focused time.");
        }
        replacement.manuallyAdjusted = true;
      }
      if (collection === "examinationQuestions") {
        replacement.version = Number(previous.version ?? 1) + 1;
        replacement.updatedAt = new Date().toISOString();
      }
      const next = [...items];
      next[index] = replacement;
      const validated = withRecords(data, collection, next);
      const award = collection === "projects" && previous.status !== "completed" && replacement.status === "completed"
        ? recordRewardEvent(validated, {
            eventId: `project-completed-${String(replacement.id)}`,
            title: "Project milestone completed",
            earnedAt: new Date().toISOString(),
            reason: `Completed project milestone: ${String(replacement.title)}.`,
            points: 20,
            achievement: { id: "achievement-first-project", title: "First project milestone completed" }
          })
        : { rewards: validated.rewards, achievements: validated.achievements };
      return { data: { ...validated, ...award }, result: replacement };
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Unable to update record.", error);
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ collection: string }> }) {
  const { collection } = await context.params;
  if (!isCollection(collection)) return errorResponse(new Error("Unknown data collection."), 404);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return errorResponse(new Error("Record id is required."));
  try {
    await updateApplicationData((data) => {
      if (collection === "assessments") throw new Error("Historical assessment results cannot be deleted.");
      if (collection === "examinationAttempts" || collection === "achievements" || collection === "rewards") {
        throw new Error("Historical examination, achievement, and reward records cannot be deleted.");
      }
      const items = records(data, collection);
      const next = items.filter((item) => item.id !== id);
      if (next.length === items.length) throw new Error("Record was not found.");
      return { data: withRecords(data, collection, next), result: undefined };
    });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Unable to delete record.", error);
    return errorResponse(error);
  }
}
