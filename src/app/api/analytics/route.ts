import { NextResponse } from "next/server";
import { withUser } from "@/lib/auth/http";
import { consistency, dashboardSeries, examBreakdown, firstAndBestScores, gapAnalysis, rewardSummary } from "@/lib/services/analytics";
import { loadUserData } from "@/lib/storage/user-store";

/** Analytics for the caller only, computed from stored records on every request. */
export const GET = withUser(async ({ user }) => {
  const data = await loadUserData(user.id);
  const submitted = data.examinationAttempts.filter((attempt) => attempt.submittedAt);
  return NextResponse.json({
    series: dashboardSeries(data),
    gaps: gapAnalysis(data),
    consistency: consistency(data),
    rewards: rewardSummary(data),
    examBreakdowns: Object.fromEntries(submitted.map((attempt) => [attempt.id, examBreakdown(attempt, data)])),
    firstAndBest: Object.fromEntries(firstAndBestScores(data.examinationAttempts)),
    topicTitles: Object.fromEntries(data.topics.map((topic) => [topic.id, topic.title])),
    blueprintTitles: Object.fromEntries(data.examinationBlueprints.map((blueprint) => [blueprint.id, blueprint.title]))
  });
});
