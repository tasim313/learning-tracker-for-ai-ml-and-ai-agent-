import path from "node:path";
import { readDocument, updateDocument, type DocumentDefinition } from "@/lib/storage/document";
import { StorageError, readJsonFile, resolveDataPath, writeJsonAtomic } from "@/lib/storage/file-store";
import { recordAudit } from "@/lib/auth/stores";
import type { PublicUser } from "@/lib/auth/schemas";
import type { DiagramDefinition } from "@/lib/model";
import {
  catalogDocumentSchema, courseSchema, sharedDiagramSchema,
  type CatalogDocument, type Course, type Lesson, type LessonBlock, type PublishedCourse
} from "@/lib/content/schema";
import { createSeedCourses } from "@/lib/content/seed-course";
import { seedDiagrams } from "@/lib/content/seed-diagrams";

const seedPublishedAt = "2026-10-19T00:00:00.000Z";

export function createSeedCatalog(): CatalogDocument {
  const courses = createSeedCourses();
  const published: CatalogDocument["published"] = {};
  for (const course of courses) {
    published[course.id] = { ...structuredClone(course), version: 1, publishedAt: seedPublishedAt, publishedBy: null };
    course.version = 1;
  }
  return { schemaVersion: 1, courses, published, diagrams: structuredClone(seedDiagrams) };
}

function catalogDefinition(): DocumentDefinition<CatalogDocument> {
  return {
    filePath: resolveDataPath("content", "catalog.json"),
    parse: (raw) => ({ data: catalogDocumentSchema.parse(raw), migrated: false }),
    create: createSeedCatalog,
    validate: (data) => catalogDocumentSchema.parse(data)
  };
}

function requireAdmin(actor: PublicUser) {
  if (actor.role !== "admin") throw new StorageError("Administrator access is required.", { status: 403 });
}

export async function readCatalog(): Promise<CatalogDocument> {
  return readDocument(catalogDefinition());
}

export async function listPublishedCourses(): Promise<PublishedCourse[]> {
  return Object.values((await readCatalog()).published);
}

export async function getPublishedCourse(courseId: string): Promise<PublishedCourse | null> {
  return (await readCatalog()).published[courseId] ?? null;
}

export async function getDiagrams(ids?: string[]): Promise<DiagramDefinition[]> {
  const diagrams = (await readCatalog()).diagrams;
  return ids ? diagrams.filter((diagram) => ids.includes(diagram.id)) : diagrams;
}

export function findLesson(course: Course, lessonId: string): { lesson: Lesson; moduleId: string; previous: Lesson | null; next: Lesson | null } | null {
  const lessons = course.modules.flatMap((module) => module.lessons.map((lesson) => ({ lesson, moduleId: module.id })));
  const index = lessons.findIndex(({ lesson }) => lesson.id === lessonId);
  if (index < 0) return null;
  return { ...lessons[index], previous: lessons[index - 1]?.lesson ?? null, next: lessons[index + 1]?.lesson ?? null };
}

/** Remove answer keys a learner should not receive before attempting a question. */
export function redactBlockForLearner(block: LessonBlock): LessonBlock {
  if (block.type === "quiz") {
    return { ...block, questions: block.questions.map((question) => ({ ...question, answer: ["hidden"], explanation: "" })) };
  }
  if (block.type === "exercise" && block.check) {
    return { ...block, check: { ...block.check, answer: "hidden" } };
  }
  return block;
}

export function redactCourseForLearner<T extends Course>(course: T): T {
  return {
    ...course,
    modules: course.modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => ({ ...lesson, blocks: lesson.blocks.map(redactBlockForLearner) }))
    }))
  };
}

// ---------- Administration ----------

export async function saveCourse(actor: PublicUser, input: unknown): Promise<Course> {
  requireAdmin(actor);
  const parsed = courseSchema.safeParse(input);
  if (!parsed.success) {
    throw new StorageError(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "), { status: 400 });
  }
  const course = { ...parsed.data, updatedAt: new Date().toISOString() };
  const saved = await updateDocument(catalogDefinition(), (catalog) => {
    const existing = catalog.courses.find((item) => item.id === course.id);
    // The working copy's version always reflects the last published version.
    const next = { ...course, version: existing?.version ?? 0 };
    const courses = existing ? catalog.courses.map((item) => item.id === course.id ? next : item) : [...catalog.courses, next];
    return { data: { ...catalog, courses }, result: next };
  });
  await recordAudit({ actorUserId: actor.id, action: "content.course-saved", targetType: "course", targetId: course.id, details: "Draft saved (not yet visible to learners until published)." });
  return saved;
}

export async function deleteCourse(actor: PublicUser, courseId: string): Promise<void> {
  requireAdmin(actor);
  await updateDocument(catalogDefinition(), (catalog) => {
    if (catalog.published[courseId]) throw new StorageError("Unpublish the course before deleting it.", { status: 409 });
    if (!catalog.courses.some((course) => course.id === courseId)) throw new StorageError("Course was not found.", { status: 404 });
    return { data: { ...catalog, courses: catalog.courses.filter((course) => course.id !== courseId) }, result: undefined };
  });
  await recordAudit({ actorUserId: actor.id, action: "content.course-deleted", targetType: "course", targetId: courseId, details: "Draft deleted. Published history files are kept." });
}

function lessonFingerprint(lesson: Lesson): string {
  const { version: _version, ...rest } = lesson;
  void _version;
  return JSON.stringify(rest);
}

/** Assign lesson versions: unchanged lessons keep their version; changed lessons are bumped. */
export function versionLessons(course: Course, previous: PublishedCourse | undefined): Course {
  const previousLessons = new Map((previous?.modules ?? []).flatMap((module) => module.lessons.map((lesson) => [lesson.id, lesson] as const)));
  return {
    ...course,
    modules: course.modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => {
        const before = previousLessons.get(lesson.id);
        if (!before) return { ...lesson, version: 1 };
        return { ...lesson, version: lessonFingerprint(before) === lessonFingerprint(lesson) ? before.version : before.version + 1 };
      })
    }))
  };
}

export async function publishCourse(actor: PublicUser, courseId: string): Promise<PublishedCourse> {
  requireAdmin(actor);
  const published = await updateDocument(catalogDefinition(), async (catalog) => {
    const working = catalog.courses.find((course) => course.id === courseId);
    if (!working) throw new StorageError("Course was not found.", { status: 404 });
    if (working.modules.every((module) => module.lessons.length === 0)) throw new StorageError("Add at least one lesson before publishing.", { status: 400 });
    const previous = catalog.published[courseId];
    const history = await readJsonFile(resolveDataPath("content", "history", `${courseId}-index.json`)) as { latest: number } | null;
    const version = Math.max(previous?.version ?? 0, history?.latest ?? 0) + 1;
    const versioned = versionLessons(working, previous);
    const snapshot: PublishedCourse = { ...versioned, version, publishedAt: new Date().toISOString(), publishedBy: actor.id };
    // Every published version is kept so historical attempts can always be explained.
    await writeJsonAtomic(path.join(resolveDataPath("content", "history"), `${courseId}-v${version}.json`), snapshot);
    await writeJsonAtomic(resolveDataPath("content", "history", `${courseId}-index.json`), { latest: version });
    return {
      data: { ...catalog, courses: catalog.courses.map((course) => course.id === courseId ? { ...versioned, version } : course), published: { ...catalog.published, [courseId]: snapshot } },
      result: snapshot
    };
  });
  await recordAudit({ actorUserId: actor.id, action: "content.course-published", targetType: "course", targetId: courseId, details: `Published version ${published.version}.` });
  return published;
}

export async function unpublishCourse(actor: PublicUser, courseId: string): Promise<void> {
  requireAdmin(actor);
  await updateDocument(catalogDefinition(), (catalog) => {
    if (!catalog.published[courseId]) throw new StorageError("Course is not published.", { status: 409 });
    const published = { ...catalog.published };
    delete published[courseId];
    return { data: { ...catalog, published }, result: undefined };
  });
  await recordAudit({ actorUserId: actor.id, action: "content.course-unpublished", targetType: "course", targetId: courseId, details: "Hidden from learners. Learner progress and history are kept." });
}

export async function readCourseVersion(courseId: string, version: number): Promise<PublishedCourse | null> {
  if (!Number.isInteger(version) || version < 1) return null;
  const raw = await readJsonFile(path.join(resolveDataPath("content", "history"), `${courseId}-v${version}.json`)).catch(() => null);
  return raw as PublishedCourse | null;
}

export async function saveDiagram(actor: PublicUser, input: unknown): Promise<DiagramDefinition> {
  requireAdmin(actor);
  const parsed = sharedDiagramSchema.safeParse({ ...(typeof input === "object" && input ? input : {}), updatedAt: new Date().toISOString() });
  if (!parsed.success) throw new StorageError(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "), { status: 400 });
  const diagram = parsed.data;
  await updateDocument(catalogDefinition(), (catalog) => ({
    data: { ...catalog, diagrams: catalog.diagrams.some((item) => item.id === diagram.id) ? catalog.diagrams.map((item) => item.id === diagram.id ? diagram : item) : [...catalog.diagrams, diagram] },
    result: undefined
  }));
  await recordAudit({ actorUserId: actor.id, action: "content.diagram-saved", targetType: "diagram", targetId: diagram.id, details: "" });
  return diagram;
}

export async function deleteDiagram(actor: PublicUser, diagramId: string): Promise<void> {
  requireAdmin(actor);
  await updateDocument(catalogDefinition(), (catalog) => {
    const usedBy = catalog.courses.find((course) => course.modules.some((module) => module.lessons.some((lesson) => lesson.blocks.some((block) => block.type === "diagram" && block.diagramId === diagramId))));
    if (usedBy) throw new StorageError(`Diagram is used by course "${usedBy.title}". Remove it from lessons first.`, { status: 409 });
    return { data: { ...catalog, diagrams: catalog.diagrams.filter((diagram) => diagram.id !== diagramId) }, result: undefined };
  });
  await recordAudit({ actorUserId: actor.id, action: "content.diagram-deleted", targetType: "diagram", targetId: diagramId, details: "" });
}
