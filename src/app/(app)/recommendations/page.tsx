import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { RecommendationList } from "@/components/recommendations/recommendation-list";

export const metadata: Metadata = { title: "Learning path recommendations" };

export default function RecommendationsPage() {
  return (
    <div className="space-y-7">
      <PageHeader eyebrow="What should I learn next?" title="Learning path recommendations" description="Suggestions based on your diagnostic and examination results, practical evidence, delayed retention, lesson progress, and practice. Each one explains why it was suggested." />
      <RecommendationList />
    </div>
  );
}
