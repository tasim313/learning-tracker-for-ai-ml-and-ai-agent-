import type { Course, Lesson } from "@/lib/content/schema";

/** Show the Bangla title only when one has actually been written; otherwise fall back to English. */
export function localizedTitle(item: Pick<Course | Lesson, "title" | "translations">, language: "en" | "bn"): string {
  return language === "bn" && item.translations.bn?.title ? item.translations.bn.title : item.title;
}

function setPath(target: Record<string, unknown>, path: string, value: string) {
  const parts = path.split(".").filter(Boolean);
  let current: unknown = target;
  for (const part of parts.slice(0, -1)) {
    if (Array.isArray(current)) current = current[Number(part)];
    else if (current && typeof current === "object") current = (current as Record<string, unknown>)[part];
    else return;
  }
  const last = parts.at(-1);
  if (!last) return;
  if (Array.isArray(current)) current[Number(last)] = value;
  else if (current && typeof current === "object") (current as Record<string, unknown>)[last] = value;
}

/** Apply authored Bangla field overrides recursively, preserving English wherever no translation exists. */
export function localizedContent<T>(content: T, language: "en" | "bn"): T {
  if (language === "en") return content;
  function visit(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== "object") return value;
    const original = value as Record<string, unknown>;
    const localized = Object.fromEntries(Object.entries(original).map(([key, child]) => [key, visit(child)]));
    const bangla = (original.translations as { bn?: { title?: string; summary?: string; fields?: Record<string, string> } } | undefined)?.bn;
    if (!bangla) return localized;
    if (bangla.title) localized.title = bangla.title;
    if (bangla.summary) localized.summary = bangla.summary;
    for (const [path, translated] of Object.entries(bangla.fields ?? {})) {
      if (translated.trim()) setPath(localized, path, translated);
    }
    return localized;
  }
  return visit(content) as T;
}
