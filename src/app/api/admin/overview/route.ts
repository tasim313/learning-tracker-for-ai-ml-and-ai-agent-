import { NextResponse } from "next/server";
import { withUser } from "@/lib/auth/http";
import { listAccountsForAdmin } from "@/lib/auth/service";

export const GET = withUser(async () => {
  const users = await listAccountsForAdmin();
  const now = Date.now();
  const activeWithin = (days: number) => users.filter((user) => user.lastActivityAt && now - Date.parse(user.lastActivityAt) <= days * 86_400_000).length;
  const recentRegistrations = [...users].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 8);
  const recentLogins = [...users].filter((user) => user.lastLoginAt).sort((a, b) => Date.parse(b.lastLoginAt ?? "") - Date.parse(a.lastLoginAt ?? "")).slice(0, 8);
  return NextResponse.json({
    totals: {
      users: users.length,
      active: users.filter((user) => user.status === "active").length,
      inactive: users.filter((user) => user.status !== "active").length,
      online: users.filter((user) => user.online).length,
      offline: users.filter((user) => !user.online).length,
      activeLearning: users.filter((user) => Boolean(user.currentActivity)).length,
      activeLearningSeconds: users.reduce((sum, user) => sum + user.activeLearningSeconds, 0),
      completedLessons: users.reduce((sum, user) => sum + user.lessonsCompleted, 0),
      completedTopics: users.reduce((sum, user) => sum + user.topicsCompleted, 0),
      completedAssessments: users.reduce((sum, user) => sum + user.completedAssessments, 0),
      usersWithIncompleteGoals: users.filter((user) => user.goalsTotal > user.goalsCompleted).length,
      dailyActive: activeWithin(1),
      weeklyActive: activeWithin(7),
      monthlyActive: activeWithin(30)
    },
    recentRegistrations,
    recentLogins
  });
}, { role: "admin" });
