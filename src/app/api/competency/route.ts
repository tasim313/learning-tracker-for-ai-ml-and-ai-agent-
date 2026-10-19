import { NextResponse } from "next/server";
import { competencyReadiness } from "@/lib/services/competency";
import { loadUserData } from "@/lib/storage/user-store";
import { withUser } from "@/lib/auth/http";
import { StorageError } from "@/lib/storage/file-store";

export const GET = withUser(async ({ user }) => {
  try {
    const data = await loadUserData(user.id);
    return NextResponse.json(data.topics.map((topic) => ({
      topicId: topic.id,
      title: topic.title,
      learningStatus: topic.status,
      readiness: competencyReadiness(data, topic.id)
    })), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof StorageError) throw error;
    console.error("Unable to calculate competency readiness.", error);
    return NextResponse.json({ error: "Competency information is unavailable." }, { status: 500 });
  }
});
