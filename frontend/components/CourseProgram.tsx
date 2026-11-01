"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getLessonTaskOutlines, formatRussianCountWord } from "../services/api";
import { courseLevelTitle, groupCourseModules, taskDifficultyLabel } from "../services/courseLevels";
import { emptyProgramState, filterCourseProgram, indexCourseProgram, normalizeSearch, parseProgramSnapshot, programStorageKey } from "../services/courseProgram";
import type { CourseModuleWithLessonsDto, LessonTaskOutlineDto } from "../types";
import { useCourseProgramPosition } from "./useCourseProgramPosition";

const countLabel = (count: number) => `${count} ${formatRussianCountWord(count, ["урок", "урока", "уроков"])}`;
const control = "min-h-11 w-full min-w-0 rounded-sm border border-line bg-ink px-3 text-sm text-paper focus:border-acid";

export function CourseProgram({ courseId, modules, canStudy }: { courseId: number; modules: CourseModuleWithLessonsDto[]; canStudy: boolean }) {
  const [saved] = useState(() => {
    try { return parseProgramSnapshot(sessionStorage.getItem(programStorageKey(courseId)), modules); } catch { return null; }
  });
  const [state, setState] = useState(saved?.state ?? emptyProgramState);
  const [outlines, setOutlines] = useState<Record<number, LessonTaskOutlineDto[]>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const indexed = useMemo(() => indexCourseProgram(modules), [modules]);
  const filtered = useMemo(() => filterCourseProgram(indexed, state), [indexed, state]);
  const total = indexed.reduce((count, item) => count + item.lessons.length, 0);
  const shown = filtered.reduce((count, item) => count + item.lessons.length, 0);
  const searching = Boolean(normalizeSearch(state.query));
  const forcedOpen = searching;
  const levels = groupCourseModules(indexed);
  const outline = state.outline;
  const currentTasks = outline === null ? undefined : outlines[outline];
  const currentError = outline === null ? "" : errors[outline] ?? "";
  useCourseProgramPosition(courseId, state, saved, outline === null || currentTasks !== undefined || Boolean(currentError));

  useEffect(() => {
    if (outline === null || currentTasks || currentError) return;
    let active = true;
    void getLessonTaskOutlines(outline).then(tasks => {
      if (active) setOutlines(previous => ({ ...previous, [outline]: tasks }));
    }).catch(() => {
      if (active) setErrors(previous => ({ ...previous, [outline]: "Не удалось загрузить задачи." }));
    });
    return () => { active = false; };
  }, [outline, currentTasks, currentError]);

  function search(query: string) { setState(previous => ({ ...previous, query, outline: null })); }
  const allExpanded = filtered.length > 0 && filtered.every(item => state.expanded.includes(item.module.id));

  return <section id="curriculum" className="kit-curriculum" aria-label="Программа курса">
    {modules.length === 0 ? <p className="py-6 text-muted">Программа курса готовится.</p> : <>
      <div className="kit-curriculum-tools" role="search" aria-label="Поиск по программе курса">
        <label className="sr-only" htmlFor={`course-search-${courseId}`}>Найти урок</label>
        <input id={`course-search-${courseId}`} className={control} type="search" maxLength={200} autoComplete="off"
          placeholder="Найти урок…"
          value={state.query} onChange={event => search(event.target.value)} />
        {searching ? <button type="button" className="min-h-11 min-w-8 shrink-0 text-lg text-muted" aria-label="Очистить поиск" title="Очистить поиск" onClick={() => search("")}>×</button> : <button type="button" className="min-h-11 shrink-0 px-2 text-xs text-muted" onClick={() => setState(previous => ({ ...previous,
          expanded: allExpanded ? [] : indexed.map(item => item.module.id)
        }))}>{allExpanded ? "Свернуть модули" : "Раскрыть модули"}</button>}
      </div>
      {searching && <p role="status" aria-live="polite" className="py-2 text-xs text-muted">Найдено: {shown} из {total}</p>}
      {shown === 0 && searching ? <div className="border border-line p-6"><h3 className="font-semibold">Уроки не найдены</h3><p className="mt-2 text-sm text-muted">Попробуйте другое название.</p></div> : groupCourseModules(filtered).map(group => <div key={group.level ?? "other"}>
        {levels.length > 1 && <h3 className="mb-3 mt-6 text-base text-muted">{group.level === null ? "Другие модули" : courseLevelTitle(group.level)}</h3>}
        {group.modules.map(item => {
          const expanded = forcedOpen || state.expanded.includes(item.module.id);
          const moduleNumber = indexed.findIndex(module => module.module.id === item.module.id) + 1;
          return <section className="kit-module" key={item.module.id} aria-label={item.module.name}>
            <button className="kit-program-module" aria-controls={`module-${item.module.id}`} aria-expanded={expanded} disabled={forcedOpen}
              onClick={() => setState(previous => ({ ...previous, expanded: expanded ? previous.expanded.filter(id => id !== item.module.id) : [...previous.expanded, item.module.id] }))} type="button">
              <span className="font-mono text-xs text-muted">{String(moduleNumber).padStart(2, "0")}</span>
              <span className="min-w-0 break-words text-sm font-medium">{item.module.name}</span><span className="whitespace-nowrap text-xs text-muted">{countLabel(item.lessons.length)}</span>
              <span aria-hidden="true" className="text-xl text-muted">{expanded ? "−" : "+"}</span>
            </button>
            {expanded && <div id={`module-${item.module.id}`} className="kit-module-lessons">
              {item.lessons.length === 0 ? <p className="py-4 text-sm text-muted">Уроки этого модуля скоро появятся.</p> : item.lessons.map(lesson => {
                const open = outline === lesson.id, tasks = outlines[lesson.id];
                return <article className={`kit-lesson-row${open ? " is-open" : ""}`} key={lesson.id} id={`program-lesson-${lesson.id}`} data-program-lesson={lesson.id}>
                  <div className="kit-lesson-line">
                    <span className="font-mono text-xs text-muted">{String(lesson.number).padStart(3, "0")}</span>
                    {canStudy ? <Link prefetch={false} href={`/lessons/${lesson.id}`} className="min-w-0 break-words">{lesson.name}</Link> : <span className="min-w-0 break-words">{lesson.name}</span>}
                    <button className="min-h-11 min-w-11 text-muted" aria-label={`${open ? "Скрыть" : "Показать"} содержание урока «${lesson.name}»`} aria-expanded={open} aria-controls={`lesson-outline-${lesson.id}`} type="button" onClick={() => setState(previous => ({ ...previous, outline: open ? null : lesson.id }))}>{open ? "−" : "+"}</button>
                  </div>
                  {searching && !open && lesson.description && <p className="mb-2 ml-10 line-clamp-2 text-sm text-muted">{lesson.description}</p>}
                  {open && <div className="kit-outline" id={`lesson-outline-${lesson.id}`}>
                    {lesson.description && <p className="mb-4">{lesson.description}</p>}
                    {errors[lesson.id] ? <div role="alert"><p>{errors[lesson.id]}</p><button type="button" className="qlc-text-link min-h-11" onClick={() => setErrors(previous => ({ ...previous, [lesson.id]: "" }))}>Повторить</button></div>
                      : !tasks ? <p role="status">Загружаем задачи…</p> : tasks.length ? <ol className="kit-program-tasks" aria-label={`Задачи урока «${lesson.name}»`}>{tasks.map((task, index) => <li key={task.id} className="kit-program-task">
                        <span className="font-medium text-paper">Задача {index + 1}</span><span className="flex items-center gap-3 text-xs"><span>{task.taskType === "CODE" ? "Код" : task.taskType === "TEST" ? "Тест" : "Число"}</span>
                        <span aria-label={taskDifficultyLabel(task.difficulty ?? 1, item.module.level)} title={taskDifficultyLabel(task.difficulty ?? 1, item.module.level)} className="font-mono text-lg tracking-widest text-acid">{"★".repeat(task.difficulty ?? 1)}{"☆".repeat(3 - (task.difficulty ?? 1))}</span></span>
                      </li>)}</ol> : <p>Задачи к уроку скоро появятся.</p>}
                    {!canStudy && <a className="qlc-text-link text-acid" href="#purchase">Открыть доступ к урокам ↑</a>}
                  </div>}
                </article>;
              })}
            </div>}
          </section>;
        })}
      </div>)}
    </>}
  </section>;
}
