"use client";

import { useEffect, useState } from "react";
import type { consistency, dashboardSeries, examBreakdown, gapAnalysis, rewardSummary } from "@/lib/services/analytics";

export type Analytics = {
  series: ReturnType<typeof dashboardSeries>;
  gaps: ReturnType<typeof gapAnalysis>;
  consistency: ReturnType<typeof consistency>;
  rewards: ReturnType<typeof rewardSummary>;
  examBreakdowns: Record<string, ReturnType<typeof examBreakdown>>;
  firstAndBest: Record<string, { first: number; best: number; latest: number; attempts: number }>;
  topicTitles: Record<string, string>;
  blueprintTitles: Record<string, string>;
};

export function useAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/analytics", { cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error(); setData(await response.json() as Analytics); })
      .catch(() => setError("Analytics are unavailable right now."));
  }, []);
  return { data, error };
}
