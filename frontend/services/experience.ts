import type { ExperienceSummaryDto } from "../types";

// Display the server's level/thresholds; never award experience in the browser.
export function parseExperienceSummary(value: unknown): ExperienceSummaryDto {
  if (!value || typeof value !== "object") throw new Error("Не удалось получить данные об опыте.");
  const data = value as Record<string, unknown>;
  const keys = ["level", "totalXp", "currentLevelXp", "xpRequiredForLevel", "xpRemaining"] as const;
  for (const key of keys) {
    if (typeof data[key] !== "number" || !Number.isSafeInteger(data[key]) || (data[key] as number) < 0) {
      throw new Error("Не удалось получить данные об опыте.");
    }
  }
  const result = data as ExperienceSummaryDto;
  if (result.level < 1 || result.xpRequiredForLevel < 1 || result.currentLevelXp >= result.xpRequiredForLevel
      || result.totalXp < result.currentLevelXp
      || result.xpRemaining !== result.xpRequiredForLevel - result.currentLevelXp) {
    throw new Error("Не удалось получить данные об опыте.");
  }
  return result;
}

export function experiencePercent(summary: ExperienceSummaryDto): number {
  return summary.currentLevelXp / summary.xpRequiredForLevel * 100;
}

export function formatAcceptedAnswer(value: unknown): string {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? `Верно. +${new Intl.NumberFormat("ru-RU").format(value)} XP`
    : "Верно";
}
