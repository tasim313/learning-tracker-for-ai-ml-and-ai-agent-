import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { TopicQuickUpdate } from "@/components/topic-quick-update";
import { requireUser } from "@/lib/auth/server";
import { timeEstimationAccuracy } from "@/lib/calculations/time";
import { listPublishedCourses } from "@/lib/content/store";
import { competencyReadiness, topicScore } from "@/lib/services/competency";
import { buildRecommendations } from "@/lib/services/recommendations";
import { loadUserData } from "@/lib/storage/user-store";
import { translate } from "@/lib/i18n";
import { localizedContent } from "@/lib/content/display";

export const metadata: Metadata = { title: "Topic" };

const hours = (seconds: number) => `${Math.floor(seconds / 3600)}h ${Math.round(seconds % 3600 / 60)}m`;

export default async function TopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  const { user } = await requireUser();
  const language = user.profile.preferredLanguage ?? "en";
  const t = (text: string) => translate(language, text);
  const [data, courses] = await Promise.all([loadUserData(user.id), listPublishedCourses()]);
  const topic = data.topics.find((item) => item.id === topicId);
  if (!topic) notFound();
  const phase = data.roadmapPhases.find((item) => item.id === topic.phaseId);
  const readiness = competencyReadiness(data, topic.id);
  const sessions = data.learningSessions.filter((session) => session.topicId === topic.id && session.state === "completed");
  const focused = sessions.reduce((total, session) => total + session.focusedSeconds, 0);
  const elapsed = sessions.reduce((total, session) => total + session.focusedSeconds + session.pausedSeconds + session.breakSeconds, 0);
  const estimate = (topic.revisedEstimatedMinutes ?? topic.estimatedMinutes) * 60;
  const accuracy = sessions.length ? timeEstimationAccuracy(estimate, focused) : null;
  const attempts = data.examinationAttempts.filter((attempt) => attempt.submittedAt && attempt.questionSnapshots.some((question) => question.topicId === topic.id))
    .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)))
    .map((attempt) => ({ attempt, score: topicScore(data, attempt.id, topic.id) }));
  const practicalAttempts = attempts.filter(({ attempt }) => attempt.questionSnapshots.some((question) => question.topicId === topic.id && question.questionType === "practical"));
  const retentionAttempts = attempts.filter(({ attempt }) => attempt.examType === "retention");
  const assessments = data.assessments.filter((item) => item.topicId === topic.id).sort((a, b) => b.assessedAt.localeCompare(a.assessedAt));
  const resources = data.resources.filter((item) => item.topicIds.includes(topic.id));
  const notes = data.notes.filter((item) => item.topicId === topic.id);
  const revision = data.revisionSchedules.find((item) => item.topicId === topic.id);
  const lessons = courses.flatMap((sourceCourse) => { const course = localizedContent(sourceCourse, language); return course.modules.flatMap((module) => module.lessons.filter((lesson) => lesson.relatedTopicIds.includes(topic.id)).map((lesson) => ({ course, lesson }))); });
  const completedLessons = new Set(data.lessonProgress.filter((item) => item.completedAt).map((item) => item.lessonId));
  const practice = data.practiceAttempts.filter((item) => item.topicId === topic.id);
  const nextActions = buildRecommendations({ data, courses }).visible.filter((item) => item.key.endsWith(`:${topic.id}`) || item.href.includes(topic.id));
  const levelTone = readiness.level === "Mastered" || readiness.level === "Proficient" ? "bg-emerald-50 text-emerald-900" : readiness.level === "Competent" ? "bg-blue-50 text-blue-900" : "bg-slate-100 text-slate-800";
  const card = "rounded-xl border border-slate-200 bg-white p-5";

  return (
    <div className="space-y-6">
      <nav aria-label={t("Breadcrumb")} className="text-xs text-slate-500"><Link href="/topics" className="underline">{t("Topics")}</Link> / {phase ? `${t("Phase")} ${phase.order}: ${t(phase.title)}` : t("Roadmap")}</nav>
      <header className={card}>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{t(topic.subject)}</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{t(topic.title)}</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-700">{t(topic.description)}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded bg-slate-100 px-2 py-1">{t("Learning status:")} {t(topic.status.replace(/-/g, " "))}</span>
          <span className={`rounded px-2 py-1 font-semibold ${levelTone}`}>{t("Competency:")} {t(readiness.level)}</span>
          <span className="rounded bg-slate-100 px-2 py-1">{t("Difficulty:")} {t(topic.difficulty)}</span>
          <span className="rounded bg-slate-100 px-2 py-1">{t("Priority:")} {t(topic.priority)}</span>
          {topic.practicalRequired && <span className="rounded bg-amber-50 px-2 py-1 text-amber-900">{t("Practical evidence required")}</span>}
        </div>
        <p className="mt-2 text-xs text-slate-500">{t("Learning status is what you record. Competency comes only from graded assessments and practical evidence.")}</p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <section className={card} aria-labelledby="readiness-heading">
            <h2 id="readiness-heading" className="text-lg font-semibold text-slate-900">{t("Readiness to advance")}</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">{t("Learning activities")}</dt><dd className="font-semibold">{sessions.length} {t("sessions")} · {lessons.filter(({ lesson }) => completedLessons.has(lesson.id)).length}/{lessons.length} {t("lessons")} · {practice.length} {t("practice")}</dd></div>
              <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">{t("Best examination score")}</dt><dd className="font-semibold">{attempts.some((item) => item.score !== null) ? `${Math.max(...attempts.flatMap((item) => item.score === null ? [] : [item.score])).toFixed(0)}%` : t("None yet")}</dd></div>
              <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">{t("Practical assessment")}</dt><dd className="font-semibold">{practicalAttempts.length ? practicalAttempts.map(({ score }) => score === null ? t("awaiting grading") : `${score.toFixed(0)}%`).join(", ") : topic.practicalRequired ? t("Not yet submitted") : t("Not required")}</dd></div>
              <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">{t("Delayed retention")}</dt><dd className="font-semibold">{retentionAttempts.length ? retentionAttempts.map(({ score }) => score === null ? t("pending") : `${score.toFixed(0)}%`).join(", ") : t("Not yet tested")}</dd></div>
            </dl>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">{t("Outstanding requirements")}</h3>
            {readiness.requirements.length ? <ul className="mt-1 space-y-1 text-sm">{readiness.requirements.map((requirement) => <li key={requirement} className="flex gap-2"><Circle size={15} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />{t(requirement)}</li>)}</ul> : <p className="mt-1 flex items-center gap-2 text-sm text-emerald-800"><CheckCircle2 size={15} aria-hidden="true" />{t("All requirements met.")}</p>}
            {readiness.evidence.length > 0 && <><h3 className="mt-4 text-sm font-semibold text-slate-900">{t("Evidence")}</h3><ul className="mt-1 list-disc pl-5 text-sm text-slate-700">{readiness.evidence.map((item) => <li key={item}>{t(item)}</li>)}</ul></>}
            <h3 className="mt-4 text-sm font-semibold text-slate-900">{t("Recommended next actions")}</h3>
            {nextActions.length ? <ul className="mt-1 space-y-1 text-sm">{nextActions.map((item) => <li key={item.key}><Link href={item.href} className="font-medium text-blue-800 underline">{item.title}</Link> <span className="text-slate-600">— {item.reason}</span></li>)}</ul>
              : <p className="mt-1 text-sm text-slate-600">{readiness.requirements.length ? <>Work on the first outstanding requirement. Start an examination from the <Link href="/exams" className="underline">Examination dashboard</Link>.</> : "Keep this topic fresh with flashcards and scheduled revisions."}</p>}
          </section>

          <section className={card}>
            <h2 className="text-base font-semibold text-slate-900">{t("Objectives and completion criteria")}</h2>
            {topic.objectives.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm">{topic.objectives.map((objective) => <li key={objective}>{t(objective)}</li>)}</ul>}
            {topic.prerequisites.length > 0 && <p className="mt-2 text-sm">{t("Prerequisites")}: {topic.prerequisites.map((id, index) => <span key={id}>{index ? ", " : ""}<Link href={`/topics/${id}`} className="text-blue-800 underline">{t(data.topics.find((item) => item.id === id)?.title ?? id)}</Link></span>)}</p>}
            {topic.practicalExercise && <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm"><p className="font-semibold">{t("Practical exercise")}</p><p className="mt-1 whitespace-pre-wrap">{t(topic.practicalExercise)}</p>{topic.deliverable && <p className="mt-1 text-xs text-slate-600">{t("Deliverable:")} {t(topic.deliverable)}</p>}</div>}
            {topic.completionCriteria && <p className="mt-3 text-sm"><span className="font-semibold">{t("Completion criteria:")} </span>{t(topic.completionCriteria)}</p>}
            {topic.completionEvidence && <div className="mt-3 text-sm"><p className="font-semibold">{t("Your completion evidence")}</p><Markdown>{t(topic.completionEvidence)}</Markdown></div>}
          </section>

          <section className={card}>
            <h2 className="text-base font-semibold text-slate-900">{t("Assessment history")}</h2>
            {attempts.length === 0 && assessments.length === 0 ? <p className="mt-2 text-sm text-slate-600">{t("No examinations or self-assessments recorded for this topic.")}</p> : (
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {attempts.map(({ attempt, score }) => <li key={attempt.id} className="flex flex-wrap justify-between gap-2 py-2"><span>{t(attempt.examType)} {t("examination")} · {new Date(attempt.submittedAt!).toLocaleDateString()}</span><span className="font-mono">{score === null ? t("awaiting grading") : `${score.toFixed(0)}% ${t("on this topic")}`}</span></li>)}
                {assessments.map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-2 py-2"><span>{t("Self-assessment")} · {new Date(item.assessedAt).toLocaleDateString()} ({t("confidence, not verified")})</span><span>{t("confidence")} {item.confidence}/5</span></li>)}
              </ul>
            )}
            {revision && <p className="mt-3 text-sm">{t("Next revision due")} {new Date(revision.dueAt).toLocaleDateString()} ({revision.intervalDays}-{t("day interval")}).</p>}
          </section>

          {lessons.length > 0 && (
            <section className={card}>
              <h2 className="text-base font-semibold text-slate-900">{t("Lessons for this topic")}</h2>
              <ul className="mt-2 space-y-1 text-sm">{lessons.map(({ course, lesson }) => <li key={lesson.id} className="flex items-center gap-2">{completedLessons.has(lesson.id) ? <CheckCircle2 size={15} className="text-emerald-600" aria-label={t("Completed")} /> : <Circle size={15} className="text-slate-300" aria-label={t("Not completed")} />}<Link href={`/courses/${course.id}/lessons/${lesson.id}`} className="text-blue-800 underline">{lesson.title}</Link><span className="text-xs text-slate-500">{course.title}</span></li>)}</ul>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <section className={card}>
            <h2 className="text-sm font-semibold text-slate-900">{t("Update this topic")}</h2>
            <div className="mt-3"><TopicQuickUpdate topic={{ id: topic.id, status: topic.status, revisedEstimatedMinutes: topic.revisedEstimatedMinutes, completionEvidence: topic.completionEvidence }} /></div>
          </section>
          <section className={card}>
            <h2 className="text-sm font-semibold text-slate-900">{t("Time")}</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">{t("Estimated")}</dt><dd>{topic.estimatedMinutes} {t("min")}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">{t("Revised estimate")}</dt><dd>{topic.revisedEstimatedMinutes === null ? "—" : `${topic.revisedEstimatedMinutes} ${t("min")}`}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">{t("Actual elapsed")}</dt><dd>{hours(elapsed)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">{t("Focused")}</dt><dd>{hours(focused)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">{t("Estimation accuracy")}</dt><dd>{accuracy === null ? "N/A" : `${Math.round(accuracy)}%`}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">{t("Started")}</dt><dd>{topic.startedAt ? new Date(topic.startedAt).toLocaleDateString() : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">{t("Completed")}</dt><dd>{topic.completedAt ? new Date(topic.completedAt).toLocaleDateString() : "—"}</dd></div>
            </dl>
            <p className="mt-2 text-xs text-slate-500">{t("Accuracy = 100 × (1 − |focused − estimate| ÷ estimate), clamped to 0–100, using the revised estimate when set. It measures planning, not ability.")}</p>
          </section>
          <section className={card}>
            <h2 className="text-sm font-semibold text-slate-900">{t("Resources")} ({resources.length})</h2>
            {resources.length ? <ul className="mt-2 space-y-1 text-sm">{resources.slice(0, 12).map((resource) => <li key={resource.id}><a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-blue-800 underline">{t(resource.title)}</a> <span className="text-xs text-slate-500">{t(resource.status.replace(/-/g, " "))}</span></li>)}</ul> : <p className="mt-2 text-sm text-slate-600">{t("No resources linked.")}</p>}
          </section>
          <section className={card}>
            <h2 className="text-sm font-semibold text-slate-900">{t("Notes")} ({notes.length})</h2>
            {notes.length ? <ul className="mt-2 space-y-1 text-sm">{notes.map((note) => <li key={note.id}>{t(note.title)}</li>)}</ul> : <p className="mt-2 text-sm text-slate-600">{t("No notes for this topic.")} {t("Add them in the")} <Link href="/knowledge" className="underline">{t("Knowledge base")}</Link>.</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}
