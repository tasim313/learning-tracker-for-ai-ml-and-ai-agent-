"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Blueprint = { id: string; title: string; examType: string; active: boolean; practicalRequirements: string; allowedMaterials: string; timeLimitMinutes: number; passingPercent: number; topicIds: string[] };
type Attempt = { id: string; blueprintId: string; examType: string; submittedAt: string | null; scorePercent: number | null; result: string | null; manualGraded: boolean; grading: string | null; questionSnapshots: { questionId: string; questionType: string; critical: boolean; rubric: string; prompt: string }[]; questionResults: { questionId: string; status: string; marksEarned: number; maxMarks: number; feedback: string }[] };

/** Practical examinations: requirements, rubrics, and the review status of submitted practical work. */
export function PracticalExam() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      fetch("/api/collections/examinationBlueprints", { cache: "no-store" }).then((response) => response.json() as Promise<Blueprint[]>),
      fetch("/api/collections/examinationAttempts", { cache: "no-store" }).then((response) => response.json() as Promise<Attempt[]>)
    ]).then(([blueprintRows, attemptRows]) => {
      setBlueprints(blueprintRows.filter((item) => item.active && (item.examType === "practical" || item.practicalRequirements)));
      setAttempts(attemptRows.filter((attempt) => attempt.questionSnapshots.some((question) => question.questionType === "practical")));
    }).catch(() => setError("Practical examinations could not be loaded."));
  }, []);

  return (
    <div className="space-y-5 xl:col-span-2">
      <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">Practical work is reviewed by a person against the question’s rubric. Submitted code is never executed on the application server. Run your acceptance tests in your own isolated environment, then link the repository and paste the test output as evidence.</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">Available practical examinations</h2>
        {blueprints.length === 0 ? <p className="mt-2 text-sm text-slate-600">No practical examinations are configured. Create one in the <Link href="/blueprints" className="underline">Blueprint editor</Link>.</p> : (
          <ul className="mt-3 space-y-3">
            {blueprints.map((blueprint) => (
              <li key={blueprint.id} className="rounded-lg border border-slate-200 p-4 text-sm">
                <p className="font-semibold text-slate-900">{blueprint.title}</p>
                <p className="mt-1 text-xs text-slate-500">{blueprint.timeLimitMinutes} minutes · pass at {blueprint.passingPercent}% · required tasks must pass</p>
                {blueprint.practicalRequirements && <p className="mt-2"><span className="font-medium">Requirements: </span>{blueprint.practicalRequirements}</p>}
                {blueprint.allowedMaterials && <p className="mt-1 text-slate-600"><span className="font-medium">Allowed materials: </span>{blueprint.allowedMaterials}</p>}
                <Link href="/exams" className="mt-2 inline-block text-sm font-semibold text-blue-800 underline">Review the rules and start from the Examination dashboard</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">Your practical submissions</h2>
        {attempts.length === 0 ? <p className="mt-2 text-sm text-slate-600">No practical work submitted yet.</p> : (
          <ul className="mt-3 space-y-3">
            {attempts.map((attempt) => {
              const practical = attempt.questionSnapshots.filter((question) => question.questionType === "practical");
              const status = attempt.submittedAt === null ? "In progress" : attempt.grading === "manual" && !attempt.manualGraded ? "Awaiting rubric review" : attempt.result === "pass" ? "Passed" : "Not yet passed";
              return (
                <li key={attempt.id} className="rounded-lg border border-slate-200 p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{blueprints.find((item) => item.id === attempt.blueprintId)?.title ?? "Practical examination"}</p>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{status}</span>
                  </div>
                  {practical.map((question) => {
                    const result = attempt.questionResults.find((item) => item.questionId === question.questionId);
                    return (
                      <div key={question.questionId} className="mt-2 rounded bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">{question.critical ? "Required acceptance task" : "Practical task"} · {result ? `${result.marksEarned}/${result.maxMarks} (${result.status})` : "not submitted"}</p>
                        {question.rubric && <p className="mt-1 text-xs"><span className="font-medium">Rubric: </span>{question.rubric}</p>}
                        {result?.feedback && result.status !== "manual" && <p className="mt-1 text-xs"><span className="font-medium">Feedback: </span>{result.feedback}</p>}
                      </div>
                    );
                  })}
                  {attempt.submittedAt === null ? <Link href="/active-exam" className="mt-2 inline-block text-sm font-semibold text-blue-800 underline">Continue</Link>
                    : status === "Awaiting rubric review" ? <Link href="/exam-results" className="mt-2 inline-block text-sm font-semibold text-blue-800 underline">Grade against the rubric</Link> : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
