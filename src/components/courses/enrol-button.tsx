"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { learningAction } from "@/components/lesson/api";

export function EnrolButton({ courseId, enrolled }: { courseId: string; enrolled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function toggle() {
    if (enrolled && !window.confirm("Leave this course? Your lesson progress and notes are kept if you rejoin.")) return;
    setPending(true);
    setError("");
    try {
      await learningAction({ action: enrolled ? "withdraw" : "enroll", courseId });
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Enrolment was not changed.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div>
      <button type="button" onClick={toggle} disabled={pending} className={enrolled ? "inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 disabled:opacity-60" : "inline-flex min-h-10 items-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-60"}>
        {enrolled ? "Leave course" : "Enrol in this course"}
      </button>
      {error && <p role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
