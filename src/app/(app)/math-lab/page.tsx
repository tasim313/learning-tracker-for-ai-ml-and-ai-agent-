import type { Metadata } from "next";
import { MathLab } from "@/components/math/math-lab";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Mathematics Learning Lab" };

export default function MathLabPage() {
  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Mathematics for AI" title="Mathematics Learning Lab" description="Build intuition with interactive explorers, then practise with generated problems at three levels. Each problem comes with hints, server-checked answers, a step-by-step solution, and common mistakes. Approximate results are labelled as approximations." />
      <MathLab />
    </div>
  );
}
