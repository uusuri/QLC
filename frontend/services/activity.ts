import type { UserActivityDto } from "../types";

// Calendar arithmetic is UTC-only; display days already come from the server in Moscow time.
function dateValue(date: string): Date {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime())
      || parsed.toISOString().slice(0, 10) !== date) throw new Error("Некорректная дата активности.");
  return parsed;
}

export function activityLevel(count: number): number {
  if (!Number.isSafeInteger(count) || count <= 0) return 0;
  return count < 3 ? 1 : count < 6 ? 2 : count < 10 ? 3 : 4;
}

export function activityCountLabel(count: number): string {
  const ending = new Intl.PluralRules("ru-RU").select(count);
  return `${new Intl.NumberFormat("ru-RU").format(count)} ${ending === "one" ? "отправка" : ending === "few" ? "отправки" : "отправок"}`;
}

export function activityDateLabel(date: string): string {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeZone: "UTC" }).format(dateValue(date));
}

export type CalendarDay = { date: string; count: number };

export function activityWeeks(activity: UserActivityDto): (CalendarDay | null)[][] {
  const start = dateValue(activity.from), end = dateValue(activity.to);
  const size = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (size < 1 || size > 366) throw new Error("Некорректный период активности.");
  const counts = new Map(activity.days.map(day => [day.date, day.count]));
  const cells: (CalendarDay | null)[] = Array.from({ length: (start.getUTCDay() + 6) % 7 }, () => null);
  for (let day = 0; day < size; day++) {
    const current = new Date(start.getTime() + day * 86_400_000).toISOString().slice(0, 10);
    const count = counts.get(current) ?? 0;
    cells.push({ date: current, count: Number.isSafeInteger(count) && count > 0 ? count : 0 });
  }
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

export function activityMonthLabel(week: (CalendarDay | null)[], index: number): string {
  const day = week.find(value => value && (index === 0 || value.date.endsWith("-01")));
  return day ? new Intl.DateTimeFormat("ru-RU", { month: "short", timeZone: "UTC" }).format(dateValue(day.date)).replace(".", "") : "";
}
