"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { AdminCourseDto, AdminModuleDto, AdminLessonDto, AdminTaskDto } from "@/types";
import type { Branch, useAdminTreeData } from "./useAdminTreeData";

export type EditorSelection = {
  step: "course" | "module" | "lesson" | "task";
  courseId: number | null;
  moduleId: number | null;
  lessonId: number | null;
  taskId: number | null;
};

export function taskTitle(task: AdminTaskDto) {
  return task.statementMd.split("\n").find(line => line.trim())?.replace(/^\s*#+\s*/, "").replace(/[*`]/g, "").trim() || `Задача ${task.id}`;
}

type Props = {
  courses: AdminCourseDto[];
  selection: EditorSelection;
  data: ReturnType<typeof useAdminTreeData>;
  busy: boolean;
  loading: boolean;
  onNavigate: (selection: EditorSelection) => void;
};

export function CourseTree({ courses, selection, data, busy, loading, onNavigate }: Props) {
  const [openModules, setOpenModules] = useState<Set<number>>(new Set());
  const [openLessons, setOpenLessons] = useState<Set<number>>(new Set());
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrollArea = useRef<HTMLDivElement>(null);
  const course = courses.find(item => item.id === selection.courseId);
  const { load: loadLessons } = data.lessons;
  const { load: loadTasks } = data.tasks;
  const currentModules = selection.courseId === null ? undefined : data.modules.branches[selection.courseId]?.items;
  const currentLessons = selection.moduleId === null ? undefined : data.lessons.branches[selection.moduleId]?.items;
  const currentTasks = selection.lessonId === null ? undefined : data.tasks.branches[selection.lessonId]?.items;
  const selectedModuleOpen = selection.moduleId !== null && openModules.has(selection.moduleId);
  const selectedLessonOpen = selection.lessonId !== null && openLessons.has(selection.lessonId);

  useEffect(() => {
    if (selection.moduleId !== null) {
      setOpenModules(current => new Set(current).add(selection.moduleId!));
      void loadLessons(selection.moduleId).catch(() => {});
    }
    if (selection.lessonId !== null) {
      setOpenLessons(current => new Set(current).add(selection.lessonId!));
      void loadTasks(selection.lessonId).catch(() => {});
    }
  }, [selection.courseId, selection.moduleId, selection.lessonId, loadLessons, loadTasks]);

  useEffect(() => {
    // Reveal the restored/selected item inside the sidebar without scrolling the editor.
    const area = scrollArea.current;
    const active = area?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!area?.clientHeight || !active) return;
    const bounds = area.getBoundingClientRect();
    const item = active.getBoundingClientRect();
    if (item.top < bounds.top) area.scrollTop += item.top - bounds.top - 8;
    else if (item.bottom > bounds.bottom) area.scrollTop += item.bottom - bounds.bottom + 8;
  }, [selection.step, selection.courseId, selection.moduleId, selection.lessonId, selection.taskId, currentModules, currentLessons, currentTasks, mobileOpen, selectedModuleOpen, selectedLessonOpen]);

  function navigate(next: EditorSelection) {
    onNavigate(next);
    setMobileOpen(false);
  }
  function toggleModule(id: number) {
    setOpenModules(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    if (!openModules.has(id)) void loadLessons(id).catch(() => {});
  }
  function toggleLesson(id: number) {
    setOpenLessons(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    if (!openLessons.has(id)) void loadTasks(id).catch(() => {});
  }
  const path = { courseId: selection.courseId, moduleId: null, lessonId: null, taskId: null };

  return <aside className="min-w-0 border-b border-line bg-panel lg:sticky lg:top-24 lg:self-start lg:border-b-0" aria-label="Навигация по курсу">
    <button type="button" aria-expanded={mobileOpen} aria-controls="course-tree-navigation" onClick={() => setMobileOpen(value => !value)} className="flex min-h-12 w-full items-center justify-between px-4 text-sm lg:hidden">
      Структура курса <span aria-hidden="true">{mobileOpen ? "−" : "+"}</span>
    </button>
    <nav id="course-tree-navigation" aria-label="Структура курса" className={`${mobileOpen ? "block" : "hidden"} lg:block`}>
      <div className="grid gap-3 border-b border-line p-4">
        <div className="flex items-center justify-between gap-2"><h2 className="!text-base">Структура курса</h2><button type="button" disabled={busy} onClick={() => navigate({ step: "course", courseId: null, moduleId: null, lessonId: null, taskId: null })} className="min-h-9 px-2 text-xs text-acid disabled:opacity-40">+ Курс</button></div>
        <label className="grid min-w-0 gap-2 text-xs text-muted">Курс
          <select disabled={busy || loading} className="min-h-11 w-full min-w-0 bg-ink px-2 text-sm" value={selection.courseId ?? ""} onChange={event => navigate({ ...path, courseId: Number(event.target.value), step: "course" })}>
            <option value="" disabled>{loading ? "Загружаем курсы…" : "Новый курс"}</option>
            {courses.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      </div>
      <div ref={scrollArea} className="max-h-[55vh] overflow-y-auto overscroll-contain p-2 lg:max-h-[calc(100vh-260px)]">
        {!course ? <p className="p-3 text-sm leading-6 text-muted">Выберите курс или создайте новый. Здесь появятся его модули и уроки.</p> : <>
          <Node label={course.name} kind="Курс" active={selection.step === "course"} disabled={busy} onSelect={() => navigate({ ...path, step: "course" })} />
          <AddButton disabled={busy} label="Добавить модуль" onClick={() => navigate({ ...path, step: "module" })} />
          <BranchContent branch={data.modules.branches[course.id]} empty="В курсе пока нет модулей." retry={() => void data.modules.load(course.id, true).catch(() => {})}>
            <ul className="space-y-1">
              {[...(data.modules.branches[course.id]?.items ?? [])].sort(byPosition).map(moduleItem => {
                const modulePath = { ...path, moduleId: moduleItem.id };
                return <li key={moduleItem.id}>
                  <Node label={moduleItem.name} kind="Модуль" expanded={openModules.has(moduleItem.id)} onToggle={() => toggleModule(moduleItem.id)}
                    active={selection.step === "module" && selection.moduleId === moduleItem.id} inPath={selection.moduleId === moduleItem.id} disabled={busy}
                    onSelect={() => navigate({ ...modulePath, step: "module" })} addLabel={`Добавить урок в «${moduleItem.name}»`} onAdd={() => navigate({ ...modulePath, step: "lesson" })} />
                  {openModules.has(moduleItem.id) && <div className="ml-4 border-l border-line pl-2">
                    <BranchContent branch={data.lessons.branches[moduleItem.id]} empty="В модуле пока нет уроков." retry={() => void loadLessons(moduleItem.id, true).catch(() => {})}>
                      <ul className="space-y-1">
                        {[...(data.lessons.branches[moduleItem.id]?.items ?? [])].sort(byPosition).map(lesson => {
                          const lessonPath = { ...modulePath, lessonId: lesson.id };
                          return <li key={lesson.id}>
                            <Node label={lesson.name} kind={lesson.published ? "Урок" : "Урок · черновик"} expanded={openLessons.has(lesson.id)} onToggle={() => toggleLesson(lesson.id)}
                              active={selection.step === "lesson" && selection.lessonId === lesson.id} inPath={selection.lessonId === lesson.id} disabled={busy}
                              onSelect={() => navigate({ ...lessonPath, step: "lesson" })} addLabel={`Добавить задачу в «${lesson.name}»`} onAdd={() => navigate({ ...lessonPath, step: "task" })} />
                            {openLessons.has(lesson.id) && <div className="ml-4 border-l border-line pl-2">
                              <BranchContent branch={data.tasks.branches[lesson.id]} empty="В уроке пока нет задач." retry={() => void loadTasks(lesson.id, true).catch(() => {})}>
                                <ul className="space-y-1">{(data.tasks.branches[lesson.id]?.items ?? []).map(task => <li key={task.id}>
                                  <Node label={taskTitle(task)} kind={<>{task.taskType === "CODE" ? "Код" : task.taskType === "TEST" ? "Тест" : "Числовой ответ"}<span aria-label={`Сложность: ${task.difficulty ?? 1} из 3`} className="ml-2 inline-block align-middle font-mono text-[1.55rem] leading-none tracking-[0.05em] text-acid">{"★".repeat(task.difficulty ?? 1)}</span></>} active={selection.step === "task" && selection.taskId === task.id} disabled={busy}
                                    onSelect={() => navigate({ ...lessonPath, taskId: task.id, step: "task" })} />
                                </li>)}</ul>
                              </BranchContent>
                              <AddButton disabled={busy} label="Добавить задачу" onClick={() => navigate({ ...lessonPath, step: "task" })} />
                            </div>}
                          </li>;
                        })}
                      </ul>
                    </BranchContent>
                    <AddButton disabled={busy} label="Добавить урок" onClick={() => navigate({ ...modulePath, step: "lesson" })} />
                  </div>}
                </li>;
              })}
            </ul>
          </BranchContent>
        </>}
      </div>
    </nav>
  </aside>;
}

function byPosition(a: AdminModuleDto | AdminLessonDto, b: AdminModuleDto | AdminLessonDto) { return a.position - b.position || a.id - b.id; }

function Node({ label, kind, active, inPath, expanded, disabled, onSelect, onToggle, onAdd, addLabel }: {
  label: string; kind: ReactNode; active: boolean; inPath?: boolean; expanded?: boolean; disabled: boolean;
  onSelect: () => void; onToggle?: () => void; onAdd?: () => void; addLabel?: string;
}) {
  return <div className={`group flex min-w-0 items-center rounded-sm border ${active ? "border-acid/60 bg-acid/10" : "border-transparent hover:bg-white/5"}`}>
    {onToggle && <button type="button" aria-label={`${expanded ? "Свернуть" : "Развернуть"}: ${label}`} aria-expanded={expanded} onClick={onToggle} className="min-h-10 w-7 shrink-0 text-muted hover:text-paper"><span aria-hidden="true">{expanded ? "▾" : "▸"}</span></button>}
    <button type="button" aria-current={active ? "page" : undefined} disabled={disabled} onClick={onSelect} title={label} className={`min-w-0 flex-1 px-2 py-2 text-left disabled:opacity-40 ${active ? "text-acid" : inPath ? "text-paper" : "text-muted hover:text-paper"}`}>
      <span className="block text-[10px] opacity-65">{kind}</span><span className="mt-1 block break-words text-sm leading-5">{label.length > 120 ? `${label.slice(0, 117)}…` : label}</span>
    </button>
    {onAdd && <button type="button" aria-label={addLabel} title={addLabel} disabled={disabled} onClick={onAdd} className="min-h-10 w-7 shrink-0 text-acid opacity-70 hover:opacity-100 disabled:opacity-40">+</button>}
  </div>;
}

function AddButton({ disabled, label, onClick }: { disabled: boolean; label: string; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="min-h-10 px-2 text-left text-xs text-acid disabled:opacity-40">+ {label}</button>;
}

function BranchContent<T>({ branch, children, empty, retry }: { branch?: Branch<T>; children: ReactNode; empty: string; retry: () => void }) {
  if (!branch || branch.loading) return <p className="p-2 text-xs text-muted" role="status">Загружаем…</p>;
  if (branch.error) return <div className="p-2 text-xs text-muted" role="alert"><p>Не удалось загрузить материалы.</p><button type="button" onClick={retry} className="mt-2 min-h-9 text-acid">Повторить</button></div>;
  if (!branch.items?.length) return <p className="p-2 text-xs leading-5 text-muted">{empty}</p>;
  return children;
}
