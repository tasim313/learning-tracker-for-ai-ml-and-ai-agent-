import { z } from "zod";
import { diagramDefinitionSchema } from "@/lib/model";

/**
 * Shared, administrator-managed course content. Learners only ever read the
 * published snapshot of a course; administrators edit a working copy and publish
 * it, which records an immutable version in content history.
 */

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/, "Use lowercase letters, numbers, and hyphens.");
const timestamp = z.string().datetime();
const httpsUrl = z.string().url().max(2000).refine((value) => value.startsWith("https://"), "Only https:// links are allowed.");
const markdown = z.string().max(50_000);

export const difficulties = ["fundamental", "beginner", "intermediate", "advanced"] as const;
export const blockRoles = [
  "explanation", "visual", "media", "worked-example", "guided-exercise", "independent-exercise",
  "knowledge-check", "practical", "reflection", "further-reading"
] as const;

const translation = z.object({ title: z.string().max(200).default(""), summary: z.string().max(4000).default("") });
const translations = z.object({ bn: translation.optional() }).default({});

const blockBase = { id: slug, role: z.enum(blockRoles).optional() };

export const quizQuestionSchema = z.object({
  id: slug,
  prompt: z.string().min(1).max(4000),
  kind: z.enum(["single", "multiple", "true-false", "numeric", "short"]),
  options: z.array(z.string().min(1).max(500)).max(10).default([]),
  /** Accepted answers. For "multiple", every listed option must be selected and nothing else. */
  answer: z.array(z.string().min(1).max(500)).min(1),
  tolerance: z.number().nonnegative().default(0),
  hint: z.string().max(2000).default(""),
  explanation: z.string().max(4000).default("")
}).superRefine((question, context) => {
  if (["single", "multiple"].includes(question.kind)) {
    if (question.options.length < 2) context.addIssue({ code: "custom", path: ["options"], message: "Choice questions need at least two options." });
    for (const answer of question.answer) {
      if (!question.options.includes(answer)) context.addIssue({ code: "custom", path: ["answer"], message: `Answer "${answer}" is not one of the options.` });
    }
    if (question.kind === "single" && question.answer.length !== 1) context.addIssue({ code: "custom", path: ["answer"], message: "Single-choice questions need exactly one answer." });
  }
  if (question.kind === "true-false" && !["true", "false"].includes(question.answer[0] ?? "")) {
    context.addIssue({ code: "custom", path: ["answer"], message: "True/false answers must be \"true\" or \"false\"." });
  }
  if (question.kind === "numeric" && !Number.isFinite(Number(question.answer[0]))) {
    context.addIssue({ code: "custom", path: ["answer"], message: "Numeric answers must be numbers." });
  }
});
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

export const lessonBlockSchema = z.discriminatedUnion("type", [
  z.object({ ...blockBase, type: z.literal("text"), title: z.string().max(200).default(""), body: markdown }),
  z.object({ ...blockBase, type: z.literal("callout"), tone: z.enum(["info", "tip", "warning", "misconception"]), body: markdown }),
  z.object({ ...blockBase, type: z.literal("code"), language: z.string().max(30), code: z.string().max(20_000), caption: z.string().max(500).default("") }),
  z.object({ ...blockBase, type: z.literal("image"), url: httpsUrl, alt: z.string().min(1).max(1000), caption: z.string().max(500).default(""), attribution: z.string().max(500).default("") }),
  z.object({
    ...blockBase,
    type: z.literal("video"),
    title: z.string().min(1).max(200),
    url: httpsUrl,
    provider: z.enum(["youtube", "external"]),
    youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/).optional(),
    /** Only embed when the source permits it; otherwise the learner gets a link. */
    embedAllowed: z.boolean().default(false),
    publisher: z.string().max(200).default(""),
    license: z.string().max(200).default("Unknown — link only; not redistributed"),
    durationSeconds: z.number().int().positive().optional(),
    chapters: z.array(z.object({ seconds: z.number().int().nonnegative(), label: z.string().min(1).max(200) })).default([]),
    transcriptUrl: httpsUrl.optional(),
    keyConcepts: z.array(z.string().max(500)).default([]),
    followUpQuestions: z.array(z.string().max(1000)).default([])
  }),
  z.object({ ...blockBase, type: z.literal("diagram"), diagramId: slug, prompt: z.string().max(2000).default("") }),
  z.object({ ...blockBase, type: z.literal("quiz"), title: z.string().max(200).default("Knowledge check"), phase: z.enum(["before", "after", "check"]).default("check"), questions: z.array(quizQuestionSchema).min(1).max(30) }),
  z.object({
    ...blockBase,
    type: z.literal("exercise"),
    kind: z.enum(["guided", "independent", "practical"]),
    title: z.string().min(1).max(200),
    prompt: markdown,
    steps: z.array(z.string().max(4000)).default([]),
    hints: z.array(z.string().max(2000)).default([]),
    solution: markdown.default(""),
    check: z.object({ kind: z.enum(["numeric", "text"]), answer: z.string().min(1).max(500), tolerance: z.number().nonnegative().default(0) }).optional()
  }),
  z.object({ ...blockBase, type: z.literal("checkpoint"), prompt: markdown }),
  z.object({ ...blockBase, type: z.literal("reflection"), prompt: markdown }),
  z.object({
    ...blockBase,
    type: z.literal("reading"),
    title: z.string().max(200).default("Further reading"),
    items: z.array(z.object({
      title: z.string().min(1).max(300),
      url: httpsUrl,
      publisher: z.string().max(200).default(""),
      kind: z.enum(["documentation", "course", "paper", "tutorial", "book", "video", "article", "repository", "dataset", "slides"]),
      license: z.string().max(200).default("Unknown"),
      note: z.string().max(1000).default("")
    })).min(1).max(30)
  }),
  z.object({ ...blockBase, type: z.literal("download"), title: z.string().min(1).max(200), url: httpsUrl, note: z.string().max(1000).default(""), license: z.string().max(200).default("Unknown") })
]);
export type LessonBlock = z.infer<typeof lessonBlockSchema>;

export function defaultRole(block: LessonBlock): (typeof blockRoles)[number] {
  if (block.role) return block.role;
  switch (block.type) {
    case "video": return "media";
    case "image": case "diagram": return "visual";
    case "quiz": return "knowledge-check";
    case "exercise": return block.kind === "guided" ? "guided-exercise" : block.kind === "practical" ? "practical" : "independent-exercise";
    case "checkpoint": return "guided-exercise";
    case "reflection": return "reflection";
    case "reading": case "download": return "further-reading";
    case "code": return "worked-example";
    default: return "explanation";
  }
}

export const lessonSchema = z.object({
  id: slug,
  title: z.string().min(1).max(200),
  summary: z.string().max(4000).default(""),
  objectives: z.array(z.string().max(500)).default([]),
  prerequisites: z.array(slug).default([]),
  difficulty: z.enum(difficulties),
  tags: z.array(z.string().max(40)).default([]),
  estimatedMinutes: z.number().int().positive().max(1000),
  /** Increases each time a changed lesson is published. */
  version: z.number().int().positive().default(1),
  relatedTopicIds: z.array(z.string().max(100)).default([]),
  glossary: z.array(z.object({ term: z.string().min(1).max(100), definition: z.string().min(1).max(2000) })).default([]),
  translations,
  blocks: z.array(lessonBlockSchema).min(1).max(100)
}).superRefine((lesson, context) => {
  const ids = new Set<string>();
  lesson.blocks.forEach((block, index) => {
    if (ids.has(block.id)) context.addIssue({ code: "custom", path: ["blocks", index, "id"], message: `Duplicate block id: ${block.id}` });
    ids.add(block.id);
  });
});
export type Lesson = z.infer<typeof lessonSchema>;
export type LessonInput = z.input<typeof lessonSchema>;
export type LessonBlockInput = z.input<typeof lessonBlockSchema>;

export const moduleSchema = z.object({
  id: slug,
  title: z.string().min(1).max(200),
  description: z.string().max(4000).default(""),
  lessons: z.array(lessonSchema).max(100)
});
export type CourseModule = z.infer<typeof moduleSchema>;

export const courseSchema = z.object({
  id: slug,
  title: z.string().min(1).max(200),
  description: z.string().max(8000),
  objectives: z.array(z.string().max(500)).default([]),
  prerequisites: z.array(z.string().max(300)).default([]),
  difficulty: z.enum(difficulties),
  tags: z.array(z.string().max(40)).default([]),
  category: z.string().max(80).default("General"),
  language: z.enum(["en", "bn"]).default("en"),
  translations,
  /** Platform-authored material is distinguished from linked third-party material. */
  provenance: z.literal("platform-authored").default("platform-authored"),
  /** Seed content shipped with the app; labelled as introductory, not comprehensive. */
  seed: z.boolean().default(false),
  version: z.number().int().nonnegative().default(0),
  updatedAt: timestamp,
  modules: z.array(moduleSchema).max(50)
});
export type Course = z.infer<typeof courseSchema>;
export type CourseInput = z.input<typeof courseSchema>;

export const publishedCourseSchema = courseSchema.extend({
  version: z.number().int().positive(),
  publishedAt: timestamp,
  publishedBy: z.string().uuid().nullable()
});
export type PublishedCourse = z.infer<typeof publishedCourseSchema>;

export const sharedDiagramSchema = diagramDefinitionSchema;

export const catalogDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  /** Working copies edited by administrators (may be unpublished drafts). */
  courses: z.array(courseSchema),
  /** The version learners see. Absent when a course is unpublished. */
  published: z.record(slug, publishedCourseSchema),
  diagrams: z.array(sharedDiagramSchema)
}).superRefine((catalog, context) => {
  const courseIds = new Set<string>();
  const lessonIds = new Map<string, string>();
  const diagramIds = new Set(catalog.diagrams.map((diagram) => diagram.id));
  catalog.courses.forEach((course, courseIndex) => {
    if (courseIds.has(course.id)) context.addIssue({ code: "custom", path: ["courses", courseIndex, "id"], message: `Duplicate course id: ${course.id}` });
    courseIds.add(course.id);
    const moduleIds = new Set<string>();
    course.modules.forEach((module, moduleIndex) => {
      if (moduleIds.has(module.id)) context.addIssue({ code: "custom", path: ["courses", courseIndex, "modules", moduleIndex, "id"], message: `Duplicate module id: ${module.id}` });
      moduleIds.add(module.id);
      module.lessons.forEach((lesson, lessonIndex) => {
        const owner = lessonIds.get(lesson.id);
        if (owner) context.addIssue({ code: "custom", path: ["courses", courseIndex, "modules", moduleIndex, "lessons", lessonIndex, "id"], message: `Lesson id "${lesson.id}" is already used in course "${owner}".` });
        lessonIds.set(lesson.id, course.id);
        lesson.blocks.forEach((block, blockIndex) => {
          if (block.type === "diagram" && !diagramIds.has(block.diagramId)) {
            context.addIssue({ code: "custom", path: ["courses", courseIndex, "modules", moduleIndex, "lessons", lessonIndex, "blocks", blockIndex, "diagramId"], message: `Unknown diagram: ${block.diagramId}` });
          }
        });
      });
    });
  });
  Object.keys(catalog.published).forEach((courseId) => {
    if (!courseIds.has(courseId)) context.addIssue({ code: "custom", path: ["published", courseId], message: "Published course has no working copy." });
  });
});
export type CatalogDocument = z.infer<typeof catalogDocumentSchema>;

export function allLessons(course: Course): { module: CourseModule; lesson: Lesson; index: number }[] {
  let index = 0;
  return course.modules.flatMap((module) => module.lessons.map((lesson) => ({ module, lesson, index: index++ })));
}

export function courseMinutes(course: Course): number {
  return allLessons(course).reduce((total, { lesson }) => total + lesson.estimatedMinutes, 0);
}
