import type { Course, Lesson } from "@/lib/content/schema";

/** Show the Bangla title only when one has actually been written; otherwise fall back to English. */
export function localizedTitle(item: Pick<Course | Lesson, "title" | "translations">, language: "en" | "bn"): string {
  return language === "bn" && item.translations.bn?.title ? item.translations.bn.title : item.title;
}
