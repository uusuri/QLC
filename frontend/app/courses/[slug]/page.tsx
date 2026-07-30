"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AddToCartButton } from "@/components/AddToCartButton";
import { SafeMarkdown } from "@/components/SafeMarkdown";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Alert, ButtonLink, StatusBadge } from "@/components/ui";
import {
  formatRussianCountWord,
  getAuthToken,
  getCourseAccess,
  getCourseLearningView,
  getLessonTaskOutlines,
  parseCourseIdFromSlug
} from "@/services/api";
import type { CourseLearningViewDto, LessonTaskOutlineDto } from "@/types";

export default function CoursePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const [view, setView] = useState<CourseLearningViewDto | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [expandedModuleIds, setExpandedModuleIds] = useState<number[]>([]);
  const [expandedLessonId, setExpandedLessonId] = useState<number | null>(null);
  const [taskOutlines, setTaskOutlines] = useState<Record<number, LessonTaskOutlineDto[]>>({});
  const [taskOutlineError, setTaskOutlineError] = useState<Record<number, string>>({});
  const [taskOutlineLoadingId, setTaskOutlineLoadingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const data = await getCourseLearningView(slug);
        if (ignore) return;

        setView(data);
        setExpandedModuleIds(data?.modules.length ? [data.modules[0].module.id] : []);
        if (data?.catalogCourse.access === "open") {
          setHasAccess(true);
          return;
        }

        const courseId = parseCourseIdFromSlug(slug);
        if (data && courseId !== null && getAuthToken()) {
          try {
            setHasAccess(await getCourseAccess(courseId));
          } catch {
            setHasAccess(false);
          }
        }
      } catch (error) {
        if (!ignore) {
          setLoadError(error instanceof Error ? error.message : "Не удалось загрузить курс.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [slug]);

  if (loading) {
    return <CourseStatePage eyebrow="Загрузка" title="Загрузка курса" text="Получаем программу." />;
  }

  if (loadError) {
    return <CourseStatePage eyebrow="Ошибка" title="Курс недоступен" text={loadError} />;
  }

  if (!view) {
    return (
      <CourseStatePage
        eyebrow="Не найден"
        title="Курс не найден"
        text="Вернитесь в каталог и выберите другой курс."
      />
    );
  }

  const isPaid = view.catalogCourse.access === "locked";
  const canStudy = !isPaid || hasAccess;
  const courseId = parseCourseIdFromSlug(slug);

  const toggleModule = (moduleId: number) => {
    setExpandedModuleIds((current) =>
      current.includes(moduleId)
        ? current.filter((id) => id !== moduleId)
        : [...current, moduleId]
    );
  };

  const toggleLesson = async (lessonId: number) => {
    if (expandedLessonId === lessonId) {
      setExpandedLessonId(null);
      return;
    }

    setExpandedLessonId(lessonId);
    if (taskOutlines[lessonId] || taskOutlineLoadingId === lessonId) return;

    setTaskOutlineLoadingId(lessonId);
    setTaskOutlineError((current) => ({ ...current, [lessonId]: "" }));

    try {
      const outlines = await getLessonTaskOutlines(lessonId);
      setTaskOutlines((current) => ({ ...current, [lessonId]: outlines }));
    } catch {
      setTaskOutlineError((current) => ({ ...current, [lessonId]: "Не удалось загрузить задачи." }));
    } finally {
      setTaskOutlineLoadingId((current) => (current === lessonId ? null : current));
    }
  };

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex-1 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SiteHeader />

          <div className="py-10 sm:py-14">
            <Link className="text-sm text-white/42 transition hover:text-white" href="/">
              ← Все курсы
            </Link>

            <section className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px] lg:items-start">
              <div>
                <StatusBadge tone={canStudy ? "success" : "warning"}>
                  {canStudy ? "Доступ открыт" : "Программа доступна для просмотра"}
                </StatusBadge>
                <h1 className="mt-5 max-w-4xl text-5xl font-bold leading-[0.97] tracking-[-0.055em] sm:text-7xl">
                  {view.course.name}
                </h1>
                <div className="mt-6 max-w-2xl text-base leading-relaxed text-white/58">
                  <SafeMarkdown markdown={view.course.description || "Описание пока не добавлено."} />
                </div>
              </div>

              <aside className="rounded-[28px] bg-[#dfffa8] p-6 text-ink sm:p-7" id="purchase">
                <p className="text-sm font-medium text-ink/55">
                  {view.catalogCourse.lessonsCount > 0
                    ? view.catalogCourse.lessonsLabel
                    : "Программа готовится"}
                </p>
                <p className="mt-2 text-4xl font-bold tracking-[-0.05em]">
                  {canStudy ? "Можно начинать" : view.catalogCourse.price.formatted}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-ink/60">
                  {canStudy
                    ? "Материалы и задания курса доступны в вашем аккаунте."
                    : "Посмотрите программу ниже. Оплата понадобится только для доступа к урокам и задачам."}
                </p>
                <div className="mt-6">
                  {canStudy ? (
                    <ButtonLink
                      className="w-full !text-ink"
                      disabled={!view.firstLesson}
                      href={`/lessons/${view.firstLesson?.id ?? ""}`}
                    >
                      Начать обучение
                    </ButtonLink>
                  ) : courseId !== null ? (
                    <AddToCartButton courseId={courseId} courseSlug={slug} />
                  ) : null}
                </div>
              </aside>
            </section>

            <section className="mt-24">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-phosphor">
                    Программа курса
                  </p>
                  <h2 className="mt-3 text-4xl font-bold tracking-[-0.04em] sm:text-6xl">
                    Что будете изучать
                  </h2>
                </div>
                <p className="text-sm text-white/38">
                  {view.modules.length}{" "}
                  {formatRussianCountWord(view.modules.length, ["модуль", "модуля", "модулей"])}
                </p>
              </div>

              {view.modules.length === 0 ? (
                <Alert className="mt-8" title="Программа готовится" tone="warning">
                  В курсе пока нет модулей.
                </Alert>
              ) : (
                <div className="mt-10 grid gap-5">
                  {view.modules.map((item, moduleIndex) => {
                    const publishedLessons = item.lessons.filter((lesson) => lesson.published);
                    const isModuleExpanded = expandedModuleIds.includes(item.module.id);

                    return (
                      <section className="rounded-[28px] bg-white/[0.045] p-5 sm:p-7" key={item.module.id}>
                        <button
                          aria-expanded={isModuleExpanded}
                          className="grid w-full gap-4 text-left sm:grid-cols-[60px_1fr_auto] sm:items-start"
                          onClick={() => toggleModule(item.module.id)}
                          type="button"
                        >
                          <span className="font-mono text-sm font-bold text-phosphor">
                            {String(moduleIndex + 1).padStart(2, "0")}
                          </span>
                          <span>
                            <span className="block text-2xl font-bold tracking-[-0.03em]">{item.module.name}</span>
                            <span className="mt-2 block max-w-3xl text-sm leading-relaxed text-white/48">
                              {item.module.description || "Описание модуля скоро появится."}
                            </span>
                          </span>
                          <span className="flex items-center justify-between gap-4 text-sm text-white/36 sm:justify-end">
                            <span>
                              {publishedLessons.length}{" "}
                              {formatRussianCountWord(publishedLessons.length, ["урок", "урока", "уроков"])}
                            </span>
                            <span
                              aria-hidden="true"
                              className={`grid h-8 w-8 place-items-center rounded-full border border-white/12 text-lg text-phosphor transition-transform ${
                                isModuleExpanded ? "rotate-180" : ""
                              }`}
                            >
                              ↓
                            </span>
                          </span>
                        </button>

                        {isModuleExpanded && publishedLessons.length > 0 && (
                          <div className="mt-6 border-t border-white/8">
                            {publishedLessons.map((lesson, lessonIndex) => {
                              const isLessonExpanded = expandedLessonId === lesson.id;
                              const outlines = taskOutlines[lesson.id] ?? [];
                              const isLoadingOutline = taskOutlineLoadingId === lesson.id;

                              return (
                                <article className="border-b border-white/8 py-3 last:border-0" key={lesson.id}>
                                  <button
                                    aria-expanded={isLessonExpanded}
                                    className="grid w-full gap-3 py-1 text-left transition hover:pl-2 sm:grid-cols-[40px_1fr_auto] sm:items-center"
                                    onClick={() => void toggleLesson(lesson.id)}
                                    type="button"
                                  >
                                  <span className="font-mono text-xs text-white/25">
                                    {String(lessonIndex + 1).padStart(2, "0")}
                                  </span>
                                  <span className="text-base font-semibold text-white">{lesson.name}</span>
                                  <span className="flex items-center justify-between gap-3 text-sm font-semibold text-phosphor sm:justify-end">
                                    <span>{canStudy ? "Урок" : "В программе"}</span>
                                    <span
                                      aria-hidden="true"
                                      className={`text-lg transition-transform ${isLessonExpanded ? "rotate-180" : ""}`}
                                    >
                                      ↓
                                    </span>
                                  </span>
                                  </button>

                                  {isLessonExpanded && (
                                    <div className="mt-3 grid gap-4 border-l border-phosphor/30 pl-4 sm:ml-10">
                                      {lesson.description && <p className="text-sm leading-relaxed text-white/52">{lesson.description}</p>}
                                      {isLoadingOutline && <p className="text-sm text-white/42">Загружаем задачи…</p>}
                                      {taskOutlineError[lesson.id] && <p className="text-sm text-red-200">{taskOutlineError[lesson.id]}</p>}
                                      {!isLoadingOutline && !taskOutlineError[lesson.id] && outlines.length > 0 && (
                                        <div className="grid gap-2">
                                          {outlines.map((task, taskIndex) => (
                                            <div className="flex items-center justify-between gap-3 bg-black/20 px-3 py-2.5" key={task.id}>
                                              <span className="text-sm text-white/68">
                                                <span className="mr-2 font-mono text-xs text-phosphor">{String(taskIndex + 1).padStart(2, "0")}</span>
                                                {getTaskOutlineTitle(task.statementMd, taskIndex)}
                                              </span>
                                              <span className="font-mono text-[10px] font-bold uppercase text-white/36">{task.taskType}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {!isLoadingOutline && !taskOutlineError[lesson.id] && outlines.length === 0 && (
                                        <p className="text-sm text-white/42">Задачи к уроку скоро появятся.</p>
                                      )}
                                      {canStudy ? (
                                        <Link className="w-fit text-sm font-semibold text-phosphor transition hover:text-white" href={`/lessons/${lesson.id}`}>
                                          Открыть урок →
                                        </Link>
                                      ) : (
                                        <p className="text-sm text-white/42">Урок и редактор откроются после покупки курса.</p>
                                      )}
                                    </div>
                                  )}
                                </article>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SiteFooter />
      </div>
    </main>
  );
}

function getTaskOutlineTitle(statementMd: string, index: number) {
  const heading = statementMd.match(/^#{1,3}\s+(.+)$/m)?.[1];
  return heading?.replace(/[*`]/g, "") || `Задача ${index + 1}`;
}

function CourseStatePage({
  eyebrow,
  text,
  title
}: {
  eyebrow: string;
  text: string;
  title: string;
}) {
  return (
    <main className="flex min-h-screen flex-col px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <SiteHeader />
        <section className="grid min-h-[70vh] content-center gap-5">
          <StatusBadge tone="warning">{eyebrow}</StatusBadge>
          <h1 className="max-w-3xl text-5xl font-bold tracking-[-0.05em] sm:text-7xl">{title}</h1>
          <p className="max-w-xl text-base text-white/56">{text}</p>
          <div><ButtonLink href="/">На главную</ButtonLink></div>
        </section>
      </div>
    </main>
  );
}
