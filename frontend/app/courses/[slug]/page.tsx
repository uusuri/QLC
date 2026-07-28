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
  parseCourseIdFromSlug
} from "@/services/api";
import type { CourseLearningViewDto } from "@/types";

export default function CoursePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const [view, setView] = useState<CourseLearningViewDto | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const data = await getCourseLearningView(slug);
        if (ignore) return;

        setView(data);
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
                      className="w-full bg-ink text-white hover:bg-white hover:text-ink"
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

                    return (
                      <section className="rounded-[28px] bg-white/[0.045] p-5 sm:p-7" key={item.module.id}>
                        <header className="grid gap-4 sm:grid-cols-[60px_1fr_auto] sm:items-start">
                          <span className="font-mono text-sm font-bold text-phosphor">
                            {String(moduleIndex + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <h3 className="text-2xl font-bold tracking-[-0.03em]">{item.module.name}</h3>
                            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/48">
                              {item.module.description || "Описание модуля скоро появится."}
                            </p>
                          </div>
                          <span className="text-sm text-white/36">
                            {publishedLessons.length}{" "}
                            {formatRussianCountWord(publishedLessons.length, ["урок", "урока", "уроков"])}
                          </span>
                        </header>

                        {publishedLessons.length > 0 && (
                          <div className="mt-6 border-t border-white/8">
                            {publishedLessons.map((lesson, lessonIndex) => {
                              const content = (
                                <>
                                  <span className="font-mono text-xs text-white/25">
                                    {String(lessonIndex + 1).padStart(2, "0")}
                                  </span>
                                  <div>
                                    <strong className="text-base font-semibold text-white">{lesson.name}</strong>
                                    {lesson.description && (
                                      <p className="mt-1 line-clamp-2 text-sm text-white/42">{lesson.description}</p>
                                    )}
                                  </div>
                                  <span className="text-sm font-semibold text-phosphor">
                                    {canStudy ? "Открыть →" : "В программе"}
                                  </span>
                                </>
                              );

                              return canStudy ? (
                                <Link
                                  className="grid gap-3 border-b border-white/8 py-4 transition last:border-0 hover:pl-2 sm:grid-cols-[40px_1fr_auto] sm:items-center"
                                  href={`/lessons/${lesson.id}`}
                                  key={lesson.id}
                                >
                                  {content}
                                </Link>
                              ) : (
                                <div
                                  className="grid gap-3 border-b border-white/8 py-4 last:border-0 sm:grid-cols-[40px_1fr_auto] sm:items-center"
                                  key={lesson.id}
                                >
                                  {content}
                                </div>
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
