"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AddToCartButton } from "@/components/AddToCartButton";
import { SafeMarkdown } from "@/components/SafeMarkdown";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Alert, ButtonLink, Panel, PanelBody, PanelHeader, StatusBadge } from "@/components/ui";
import {
  getCourseAccess,
  getCourseLearningView,
  getAuthToken,
  formatRussianCountWord,
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
        if (!ignore) {
          setView(data);
          if (data && data.catalogCourse.access === "open") {
            setHasAccess(true);
          } else if (data) {
            const courseId = parseCourseIdFromSlug(slug);
            if (courseId !== null && getAuthToken()) {
              try {
                const access = await getCourseAccess(courseId);
                setHasAccess(access);
              } catch {
                setHasAccess(false);
              }
            } else {
              setHasAccess(false);
            }
          }
        }
      } catch (err) {
        if (!ignore) {
          setLoadError(err instanceof Error ? err.message : "Не удалось загрузить курс.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [slug]);

  if (loading) {
    return <CourseStatePage eyebrow="Загрузка" title="Загрузка..." text="Получаем данные курса." />;
  }

  if (loadError) {
    return <CourseStatePage eyebrow="Ошибка" text={loadError} title="Курс недоступен" />;
  }

  if (!view) {
    return (
      <CourseStatePage
        eyebrow="Не найден"
        text="Курс не найден. Вернитесь на главную и выберите курс из каталога."
        title="Курс не найден"
      />
    );
  }

  const isPaid = view.catalogCourse.access === "locked";
  const courseId = parseCourseIdFromSlug(slug);

  if (isPaid && !hasAccess) {
    return (
      <CourseStatePage
        eyebrow="Закрыто"
        title="Курс закрыт"
        text="Чтобы открыть материалы и уроки, купите курс."
      >
        <div className="mt-4 flex flex-wrap gap-3">
          {courseId !== null && <AddToCartButton courseId={courseId} courseSlug={slug} />}
          <ButtonLink href="/" variant="secondary">
            К витрине
          </ButtonLink>
        </div>
      </CourseStatePage>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex-1 px-4 py-4 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-7xl">
          <SiteHeader />

          <section className="mt-4 border border-line bg-ink/90">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-5 text-xs font-black uppercase sm:px-7">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-2 w-2 rounded-full bg-acid shadow-[0_0_12px_rgba(255,106,61,0.5)]" />
                <Link className="transition hover:text-acid" href="/">
                  Курсы
                </Link>
                <span className="text-white/20">/</span>
                <span className="text-white/70">Курс</span>
              </div>
              <Link className="text-white/50 transition hover:text-acid" href="/profile">Моё обучение</Link>
            </header>

            <section className="grid gap-8 border-b border-line p-5 sm:p-7 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
              <div>
                <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-acid">Курс</p>
                <h1 className="mt-3 max-w-5xl text-4xl font-black uppercase leading-[1.02] sm:text-6xl">
                  {view.course.name}
                </h1>
              </div>

              <div className="grid content-end gap-5">
                <SafeMarkdown markdown={view.course.description || "Описание пока не добавлено."} />
                <div className="flex flex-wrap gap-3">
                  <ButtonLink disabled={!view.firstLesson} href={`/lessons/${view.firstLesson?.id ?? ""}`}>
                    Начать обучение
                  </ButtonLink>
                  <ButtonLink href="/" variant="secondary">
                    Все курсы
                  </ButtonLink>
                </div>
              </div>
            </section>

            <section className="grid gap-5 p-5 sm:p-7 lg:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-acid">
                    Программа
                  </p>
                  <h2 className="mt-3 text-4xl font-black uppercase leading-none">Модули и уроки</h2>
                </div>
                <span className="font-mono text-xs font-black uppercase text-white/44">
                  {view.modules.length} {formatRussianCountWord(view.modules.length, ["модуль", "модуля", "модулей"])}
                </span>
              </div>

              {view.modules.length === 0 ? (
                <Alert title="Программа пуста" tone="warning">
                  В курсе пока нет модулей. Загляните позже.
                </Alert>
              ) : (
                <div className="grid gap-4">
                  {view.modules.map((item, moduleIndex) => {
                    const publishedLessons = item.lessons.filter((lesson) => lesson.published);

                    return (
                      <Panel key={item.module.id} muted>
                        <PanelHeader className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                          <span className="grid h-10 w-10 place-items-center border border-acid/40 font-mono text-sm font-black text-acid">
                            {String(moduleIndex + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <p className="font-mono text-xs font-black uppercase text-white/48">
                              Модуль
                            </p>
                            <h3 className="mt-1 text-2xl font-black uppercase leading-tight">
                              {item.module.name}
                            </h3>
                            <p className="mt-2 text-sm leading-snug text-white/54">
                              {item.module.description || "Нет описания."}
                            </p>
                          </div>
                          <span className="font-mono text-xs font-black uppercase text-white/44">
                            {publishedLessons.length} {formatRussianCountWord(publishedLessons.length, ["урок", "урока", "уроков"])}
                          </span>
                        </PanelHeader>

                        <PanelBody>
                          {publishedLessons.length === 0 ? (
                            <Alert title="Уроки скоро появятся" tone="warning">
                              В этом модуле пока нет доступных уроков.
                            </Alert>
                          ) : (
                            <div className="grid gap-px border border-line bg-line">
                              {publishedLessons.map((lesson, lessonIndex) => (
                                <Link
                                  className="grid gap-3 bg-ink p-4 transition hover:bg-white/8 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                                  href={`/lessons/${lesson.id}`}
                                  key={lesson.id}
                                >
                                  <span className="grid h-8 w-8 place-items-center rounded-full border border-white/20 font-mono text-[10px] font-black text-white/54">
                                    {String(lessonIndex + 1).padStart(2, "0")}
                                  </span>
                                  <div>
                                    <strong className="text-lg font-black uppercase leading-tight">
                                      {lesson.name}
                                    </strong>
                                    <p className="mt-2 line-clamp-2 text-sm text-white/50">
                                      {lesson.description || "Нет описания."}
                                    </p>
                                  </div>
                                  <span className="hidden text-sm font-black text-acid sm:block">Открыть →</span>
                                </Link>
                              ))}
                            </div>
                          )}
                        </PanelBody>
                      </Panel>
                    );
                  })}
                </div>
              )}
            </section>
          </section>
        </section>
      </div>

      <div className="mx-auto max-w-7xl">
        <SiteFooter />
      </div>
    </main>
  );
}

function CourseStatePage({
  actionHref = "/",
  actionText = "На главную",
  children,
  eyebrow,
  text,
  title
}: {
  actionHref?: string;
  actionText?: string;
  children?: React.ReactNode;
  eyebrow: string;
  text: string;
  title: string;
}) {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex-1 px-4 py-4 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-7xl">
          <SiteHeader />

          <section className="mt-4 grid min-h-[70vh] content-center gap-6 border border-line bg-ink/90 p-5 sm:p-7">
            <StatusBadge tone="warning">{eyebrow}</StatusBadge>
            <h1 className="max-w-4xl text-5xl font-black uppercase leading-[1.02] sm:text-7xl">
              {title}
            </h1>
            <p className="max-w-2xl text-base font-bold uppercase leading-snug text-white/62">
              {text}
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={actionHref}>{actionText}</ButtonLink>
            </div>
            {children}
          </section>
        </section>
      </div>

      <div className="mx-auto max-w-7xl">
        <SiteFooter />
      </div>
    </main>
  );
}
