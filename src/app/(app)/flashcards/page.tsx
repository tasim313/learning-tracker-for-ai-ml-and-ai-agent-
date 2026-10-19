import type { Metadata } from "next";
import { FlashcardReview } from "@/components/flashcards/flashcard-review";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/server";
import { listPublishedCourses } from "@/lib/content/store";
import { loadUserData } from "@/lib/storage/user-store";

export const metadata: Metadata = { title: "Flashcards and spaced repetition" };

export default async function FlashcardsPage() {
  const { user } = await requireUser();
  const [data, courses] = await Promise.all([loadUserData(user.id), listPublishedCourses()]);
  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Retention" title="Flashcards and spaced repetition" description="Cards come back at growing intervals: 1, 3, 7, 14, then 30 days by default (change these in Settings). Cards you forget return sooner. Flashcard results are tracked separately from examinations." />
      <FlashcardReview
        topics={data.topics.map((topic) => ({ id: topic.id, title: topic.title }))}
        courses={courses.map((course) => ({ id: course.id, title: course.title, lessons: course.modules.flatMap((module) => module.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, glossaryCount: lesson.glossary.length }))) }))}
      />
    </div>
  );
}
