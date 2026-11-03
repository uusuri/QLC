import type { CourseModuleWithLessonsDto } from "../types";
import { groupCourseModules } from "./courseLevels";

export type ProgramState = { query: string; expanded: number[]; outline: number | null };
export type ProgramSnapshot = { version: 1; state: ProgramState; scrollY: number; anchor: { id: number; offset: number } | null };
export const emptyProgramState: ProgramState = { query: "", expanded: [], outline: null };
export const programStorageKey = (courseId: number) => `qlc:course-program:v1:${courseId}`;
export const normalizeSearch = (value: string) => value.toLocaleLowerCase("ru").replace(/ё/g, "е").replace(/\s+/g, " ").trim();

export function indexCourseProgram(modules: CourseModuleWithLessonsDto[]) {
  let number = 0;
  return groupCourseModules(modules).flatMap(group => group.modules).map(item => ({
    ...item,
    lessons: item.lessons.filter(lesson => lesson.published).map(lesson => ({
      ...lesson, number: ++number,
      search: normalizeSearch(`${item.module.name} ${lesson.name} ${lesson.description ?? ""}`)
    }))
  }));
}

export function filterCourseProgram(modules: ReturnType<typeof indexCourseProgram>, filters: Pick<ProgramState, "query">) {
  const query = normalizeSearch(filters.query), words = query.split(" ").filter(Boolean);
  return modules.map(item => ({ ...item, lessons: item.lessons.filter(lesson =>
    !query || (/^\d+$/.test(query) ? lesson.number === Number(query) : words.every(word => lesson.search.includes(word)))
  ) })).filter(item => !query || item.lessons.length > 0);
}

export function parseProgramSnapshot(raw: string | null, modules: CourseModuleWithLessonsDto[]): ProgramSnapshot | null {
  if (!raw || raw.length > 100_000) return null;
  try {
    const value = JSON.parse(raw), state = value.state;
    if (value.version !== 1 || !state || typeof state.query !== "string" || state.query.length > 200 ||
      !Array.isArray(state.expanded) ||
      typeof value.scrollY !== "number" || !Number.isFinite(value.scrollY) || value.scrollY < 0) return null;
    const moduleIds = new Set(modules.map(item => item.module.id));
    const lessonIds = new Set(modules.flatMap(item => item.lessons.filter(lesson => lesson.published).map(lesson => lesson.id)));
    return { version: 1, state: {
      query: state.query,
      expanded: [...new Set<number>(state.expanded.filter((id: unknown) => typeof id === "number" && moduleIds.has(id)))],
      outline: lessonIds.has(state.outline) ? state.outline : null
    }, scrollY: Math.min(value.scrollY, 10_000_000),
    anchor: value.anchor && lessonIds.has(value.anchor.id) && typeof value.anchor.offset === "number" && Number.isFinite(value.anchor.offset)
      ? { id: value.anchor.id, offset: Math.max(-10000, Math.min(10000, value.anchor.offset)) } : null };
  } catch { return null; }
}
