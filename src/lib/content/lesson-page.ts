import { findLesson, getDiagrams, getPublishedCourse, redactCourseForLearner } from "@/lib/content/store";
import { localizedContent, localizedTitle } from "@/lib/content/display";
import type { PublicUser } from "@/lib/auth/schemas";
import { loadUserData } from "@/lib/storage/user-store";

/** Everything a lesson page needs, from published content and the learner's own data. */
export async function loadLessonPage(user: PublicUser, courseId: string, lessonId: string) {
  const sourceCourse = await getPublishedCourse(courseId);
  if (!sourceCourse) return null;
  const course = localizedContent(sourceCourse, user.profile.preferredLanguage);
  const found = findLesson(course, lessonId);
  if (!found) return null;
  const data = await loadUserData(user.id);
  const closedBook = data.examinationAttempts.some((attempt) => attempt.submittedAt === null && attempt.selfDeclaredClosedBook);
  const redacted = redactCourseForLearner(course);
  const lesson = findLesson(redacted, lessonId)!.lesson;
  const module = course.modules.find((item) => item.id === found.moduleId)!;
  const diagramIds = lesson.blocks.flatMap((block) => block.type === "diagram" ? [block.diagramId] : []);
  const allLessons = course.modules.flatMap((item) => item.lessons);
  const progress = data.lessonProgress.find((item) => item.lessonId === lessonId) ?? null;
  return {
    closedBook,
    props: {
      courseId: course.id,
      courseTitle: localizedTitle(course, user.profile.preferredLanguage),
      moduleTitle: module.title,
      lesson,
      displayTitle: localizedTitle(lesson, user.profile.preferredLanguage),
      previous: found.previous ? { id: found.previous.id, title: found.previous.title } : null,
      next: found.next ? { id: found.next.id, title: found.next.title } : null,
      diagrams: await getDiagrams(diagramIds),
      progress: progress && { completedBlockIds: progress.completedBlockIds, completedAt: progress.completedAt, bookmarked: progress.bookmarked, lastMode: progress.lastMode, quizResults: progress.quizResults },
      notes: data.lessonNotes.filter((note) => note.lessonId === lessonId),
      videoProgress: data.videoProgress.filter((item) => item.lessonId === lessonId),
      topicTitles: Object.fromEntries(data.topics.filter((topic) => lesson.relatedTopicIds.includes(topic.id)).map((topic) => [topic.id, topic.title])),
      prerequisiteTitles: Object.fromEntries(allLessons.filter((item) => lesson.prerequisites.includes(item.id)).map((item) => [item.id, item.title]))
    }
  };
}
