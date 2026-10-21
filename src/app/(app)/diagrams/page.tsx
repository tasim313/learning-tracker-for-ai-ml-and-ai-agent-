import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { DiagramStudio } from "@/components/studio/diagram-studio";
import { requireUser } from "@/lib/auth/server";
import { translate } from "@/lib/i18n";

export const metadata: Metadata = { title: "Diagram Learning Studio" };

export default async function DiagramsPage({ searchParams }: { searchParams: Promise<{ diagram?: string }> }) {
  const { diagram } = await searchParams;
  const { user } = await requireUser();
  const language = user.profile.preferredLanguage ?? "en";
  return (
    <div className="space-y-7">
      <PageHeader eyebrow={translate(language, "Visual learning")} title={translate(language, "Diagram Learning Studio")} description={translate(language, "Reveal diagrams step by step, inspect each element, answer questions generated from the diagram's structure, and draw or edit your own diagrams as exercises. Diagrams are stored as editable structured data and can be exported as JSON.")} />
      <DiagramStudio initialDiagramId={diagram} />
    </div>
  );
}
