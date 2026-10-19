import { notFound } from "next/navigation";
import { CourseLibrary } from "@/components/course-library";
import { FeatureManager } from "@/components/feature-manager";
import { getFeaturePage } from "@/lib/feature-pages";

export const dynamic = "force-dynamic";

export default async function FeaturePage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const definition = getFeaturePage(section);
  if (!definition) notFound();
  return (
    <div className="space-y-7">
      <div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-700">LEARNING WORKSPACE</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{definition.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{definition.description}</p>
      </div>
      {section === "course-materials" ? <CourseLibrary /> : <FeatureManager section={section} definition={definition} />}
    </div>
  );
}
