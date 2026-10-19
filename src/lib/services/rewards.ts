import type { ApplicationData } from "@/lib/model";

type RewardEvent = {
  eventId: string;
  title: string;
  reason: string;
  points: number;
  earnedAt: string;
  achievement?: { id: string; title: string };
};

export function recordRewardEvent(data: ApplicationData, event: RewardEvent): Pick<ApplicationData, "rewards" | "achievements"> {
  if (data.rewards.some((reward) => reward.eventId === event.eventId)) {
    return { rewards: data.rewards, achievements: data.achievements };
  }
  const rewards = [...data.rewards, {
    id: `reward-${event.eventId}`,
    eventId: event.eventId,
    title: event.title,
    earnedAt: event.earnedAt,
    reason: event.reason,
    points: event.points
  }];
  const achievements = event.achievement && !data.achievements.some((item) => item.id === event.achievement?.id)
    ? [...data.achievements, {
        id: event.achievement.id,
        title: event.achievement.title,
        unlockedAt: event.earnedAt,
        source: event.eventId
      }]
    : data.achievements;
  return { rewards, achievements };
}
