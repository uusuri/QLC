import type { AdminModuleDto } from "../types";

export type CourseLevel = 1 | 2 | 3;

export function isCourseLevel(value: unknown): value is CourseLevel {
  return value === 1 || value === 2 || value === 3;
}

export function courseLevelTitle(level: CourseLevel): string {
  return `Уровень ${level}`;
}

export function taskDifficultyLabel(value: number, level?: number | null): string {
  const stars = value >= 1 && value <= 3 && Number.isInteger(value) ? value : 1;
  return isCourseLevel(level)
    ? `Сложность внутри уровня ${level}: ${stars} из 3`
    : `Сложность: ${stars} из 3`;
}

/** Keep position order within a level. Unassigned modules remain visible, never silently dropped. */
export function groupCourseModules<T extends { module: Pick<AdminModuleDto, "level"> }>(items: T[]) {
  const hasLevels = items.some(item => isCourseLevel(item.module.level));
  if (!hasLevels) return [{ level: null, modules: items }];
  const groups: { level: CourseLevel | null; modules: T[] }[] = [];
  for (const level of [1, 2, 3, null] as const) {
    const modules = items.filter(item =>
      level === null ? !isCourseLevel(item.module.level) : item.module.level === level);
    if (modules.length) groups.push({ level, modules });
  }
  return groups;
}
