import type { Metadata } from "next";
import { MathLab } from "@/components/math/math-lab";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/server";
import { translate } from "@/lib/i18n";

export const metadata: Metadata = { title: "Mathematics Learning Lab" };

export default async function MathLabPage() {
  const { user } = await requireUser();
  const language = user.profile.preferredLanguage ?? "en";
  return (
    <div className="space-y-7">
      <PageHeader eyebrow={translate(language, "Mathematics for AI")} title={translate(language, "Mathematics Learning Lab")} description={translate(language, "Build intuition with interactive explorers, then practise with generated problems at three levels. Each problem comes with hints, server-checked answers, a step-by-step solution, and common mistakes. Approximate results are labelled as approximations.")} />
      <MathLab />
    </div>
  );
}
