import { NextResponse } from "next/server";
import { competencyReadiness } from "@/lib/services/competency";
import { loadApplicationData } from "@/lib/storage/json-store";

export async function GET() {
  try {
    const data = await loadApplicationData();
    return NextResponse.json(data.topics.map((topic) => ({
      topicId: topic.id,
      title: topic.title,
      learningStatus: topic.status,
      readiness: competencyReadiness(data, topic.id)
    })), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to calculate competency readiness.", error);
    return NextResponse.json({ error: "Competency information is unavailable." }, { status: 500 });
  }
}
