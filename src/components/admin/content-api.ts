import type { Course, LessonBlockInput } from "@/lib/content/schema";
import type { DiagramDefinition } from "@/lib/model";

export type ContentOverview = {
  courses: Course[];
  published: Record<string, { version: number; publishedAt: string }>;
  diagrams: DiagramDefinition[];
};

export async function contentRequest<T>(body?: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/admin/content", body
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    : { cache: "no-store" });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "The request failed.");
  return payload as T;
}

let counter = 0;
export function newId(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter}`;
}

export const blockTemplates: Record<LessonBlockInput["type"], () => LessonBlockInput> = {
  text: () => ({ id: newId("text"), type: "text", title: "", body: "Write the explanation in Markdown. Use $x^2$ for inline maths and $$...$$ for display equations." }),
  callout: () => ({ id: newId("callout"), type: "callout", tone: "tip", body: "" }),
  code: () => ({ id: newId("code"), type: "code", language: "python", code: "print('hello')", caption: "" }),
  image: () => ({ id: newId("image"), type: "image", url: "https://", alt: "Describe the image", caption: "", attribution: "" }),
  video: () => ({ id: newId("video"), type: "video", title: "Video title", url: "https://www.youtube.com/watch?v=", provider: "youtube", youtubeId: undefined, embedAllowed: false, publisher: "", license: "Unknown — link only; not redistributed", chapters: [], keyConcepts: [], followUpQuestions: [] }),
  diagram: () => ({ id: newId("diagram"), type: "diagram", diagramId: "ml-pipeline", prompt: "" }),
  quiz: () => ({ id: newId("quiz"), type: "quiz", title: "Knowledge check", phase: "check", questions: [{ id: "q1", prompt: "Question?", kind: "single", options: ["A", "B"], answer: ["A"], tolerance: 0, hint: "", explanation: "" }] }),
  exercise: () => ({ id: newId("exercise"), type: "exercise", kind: "guided", title: "Exercise", prompt: "", steps: [], hints: [], solution: "" }),
  checkpoint: () => ({ id: newId("checkpoint"), type: "checkpoint", prompt: "Pause and try this yourself." }),
  reflection: () => ({ id: newId("reflection"), type: "reflection", prompt: "What did you learn?" }),
  reading: () => ({ id: newId("reading"), type: "reading", title: "Further reading", items: [{ title: "Resource", url: "https://", publisher: "", kind: "documentation", license: "Unknown", note: "" }] }),
  download: () => ({ id: newId("download"), type: "download", title: "Material", url: "https://", note: "", license: "Unknown" })
};
