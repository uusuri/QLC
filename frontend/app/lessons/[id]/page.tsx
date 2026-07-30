"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AddToCartButton } from "@/components/AddToCartButton";
import { CodeLessonWorkspace } from "@/components/CodeLessonWorkspace";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SafeMarkdown } from "@/components/SafeMarkdown";
import { Alert, ButtonLink, Panel, PanelBody, PanelHeader, StatusBadge } from "@/components/ui";
import { getLessonLearningView, parseCourseIdFromSlug, getAuthToken } from "@/services/api";
import type { LearnerTaskDto, LessonLearningViewDto } from "@/types";

function getTaskTitle(task: LearnerTaskDto, index: number) {
  const heading = task.statementMd
    ?.split("\n")
    .find((line) => /^#{1,3}\s+/.test(line.trim()))
    ?.replace(/^#{1,3}\s+/, "")
    .trim();

  return heading || `Задача ${index + 1}`;
}

export default function LessonPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const lessonId = Number(params.id);

  const [view, setView] = useState<LessonLearningViewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  useEffect(() => {
    if (!Number.isSafeInteger(lessonId) || lessonId <= 0) {
      setLoadError("ID урока должен быть положительным числом.");
      setLoading(false);
      return;
    }

    if (!getAuthToken()) {
      router.push(`/login?redirectTo=${encodeURIComponent(`/lessons/${lessonId}`)}`);
      return;
    }

    let ignore = false;

    async function load() {
      try {
        const data = await getLessonLearningView(lessonId);
        if (!ignore) {
          setView(data);
          setSelectedTaskId(data?.primaryTask?.id ?? data?.tasks[0]?.id ?? null);
        }
      } catch (err) {
        if (!ignore) {
          setLoadError(err instanceof Error ? err.message : "Не удалось загрузить урок.");
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
  }, [lessonId, router]);

  if (loading) {
    return <LessonStatePage eyebrow="Загрузка" title="Загрузка..." text="Получаем данные урока." />;
  }

  if (loadError) {
    return <LessonStatePage eyebrow="Ошибка" title="Урок недоступен" text={loadError} />;
  }

  if (!view) {
    return (
      <LessonStatePage
        eyebrow="Не найден"
        title="Урок не найден"
        text="Урок не найден. Вернитесь на страницу курса."
      />
    );
  }

  const isPaid = (view.course.price ?? 0) > 0 || (view.course.priceInStars ?? 0) > 0;
  const hasAccess = Boolean(view.lesson.contentMd);
  const isLocked = isPaid && !hasAccess;

  if (isLocked) {
    return (
      <LessonStatePage
        eyebrow="Закрыто"
        title="Доступ к уроку закрыт"
        text="Чтобы открыть материал и задачи, купите курс."
      >
        <div className="mt-4 flex flex-wrap gap-3">
          {(() => {
            const courseId = parseCourseIdFromSlug(`course-${view.course.id}`);
            return courseId !== null ? (
              <AddToCartButton courseId={courseId} courseSlug={`course-${view.course.id}`} />
            ) : null;
          })()}
          <ButtonLink href="/" variant="secondary">
            К витрине
          </ButtonLink>
        </div>
      </LessonStatePage>
    );
  }

  const primaryTask =
    view.tasks.find((task) => task.id === selectedTaskId) ?? view.primaryTask ?? view.tasks[0] ?? null;
  const courseSlug = `course-${view.course.id}`;

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex-1 px-4 py-4 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-7xl">
          <SiteHeader compact />

          <section className="mt-4 border border-line bg-ink/90">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4 text-xs font-black uppercase sm:px-7">
              <div className="flex items-center gap-3">
                <Link className="transition hover:text-acid" href={`/courses/${courseSlug}`}>
                  ← Программа курса
                </Link>
                <span className="text-white/25">/</span>
                <span className="text-white/48">{view.module.name}</span>
              </div>
              <Link className="text-white/50 transition hover:text-acid" href="/profile">Моё обучение</Link>
            </header>

            <section className="grid gap-5 border-b border-line p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-end lg:p-8">
              <div>
                <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-acid">Урок</p>
                <h1 className="mt-3 max-w-5xl text-4xl font-black uppercase leading-[1.02] sm:text-6xl">
                  {view.lesson.name}
                </h1>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-white/54">{view.lesson.description || view.course.name}</p>
            </section>

            <section className="grid gap-5 p-5 sm:p-7 lg:p-8">
              <Panel muted>
                <PanelHeader>
                  <h2 className="text-xl font-black uppercase leading-tight">Материал урока</h2>
                </PanelHeader>
                <PanelBody>
                  <SafeMarkdown
                    markdown={
                      view.lesson.contentMd ||
                      view.lesson.description ||
                      "Материал урока пока пуст."
                    }
                  />
                </PanelBody>
              </Panel>

              {!primaryTask ? (
                <Alert title="Задачи скоро появятся" tone="warning">
                  К этому уроку пока не добавлены задачи.
                </Alert>
              ) : (
                <>
                  {view.tasks.length > 1 && (
                    <nav aria-label="Задачи урока" className="flex flex-wrap gap-2">
                      {view.tasks.map((task, index) => {
                        const isSelected = task.id === primaryTask.id;

                        return (
                          <button
                            aria-pressed={isSelected}
                            className={`rounded-full border px-4 py-2 text-left text-sm font-black transition ${
                              isSelected
                                ? "border-acid bg-acid text-ink"
                                : "border-line bg-ink text-white/70 hover:border-white/50 hover:text-white"
                            }`}
                            key={task.id}
                            onClick={() => setSelectedTaskId(task.id)}
                            type="button"
                          >
                            <span className="mr-2 font-mono text-xs opacity-60">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            {getTaskTitle(task, index)}
                          </button>
                        );
                      })}
                    </nav>
                  )}

                  <div className={primaryTask.taskType === "CODE" ? "grid gap-5 lg:grid-cols-[minmax(340px,0.8fr)_minmax(500px,1.2fr)] lg:items-stretch" : "grid gap-5"}>
                    <Panel className="flex min-w-0 flex-col" muted>
                      <PanelHeader>
                        <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-acid">Задача</p>
                        <h2 className="mt-2 text-2xl font-black uppercase leading-tight">Условие</h2>
                      </PanelHeader>
                      <PanelBody className="grid flex-1 content-start gap-6">
                        <SafeMarkdown
                          markdown={primaryTask.statementMd || "Условие задачи пока пусто."}
                        />

                      {primaryTask.taskType === "CODE" && (
                        <div className="flex flex-wrap gap-2">
                          {primaryTask.timeLimitMs !== null && (
                            <StatusBadge tone="neutral">{primaryTask.timeLimitMs} мс</StatusBadge>
                          )}
                          {primaryTask.memoryLimitKb !== null && (
                            <StatusBadge tone="neutral">{primaryTask.memoryLimitKb} КБ памяти</StatusBadge>
                          )}
                          {primaryTask.outputLimitKb !== null && (
                            <StatusBadge tone="neutral">{primaryTask.outputLimitKb} КБ вывода</StatusBadge>
                          )}
                        </div>
                      )}

                      {primaryTask.taskType === "TEST" && (
                        <div className="grid gap-px border border-line bg-line">
                          {(primaryTask.options ?? []).map((option, index) => (
                            <div
                              className="grid grid-cols-[auto_1fr] gap-3 bg-ink p-4 text-sm text-white/74"
                              key={`${option}-${index}`}
                            >
                              <span className="font-mono font-black text-acid">[{index}]</span>
                              <span>{option}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      </PanelBody>
                    </Panel>

                    {primaryTask.taskType === "CODE" ? (
                      <CodeLessonWorkspace
                        key={`${primaryTask.id}:${primaryTask.testSetVersion ?? 1}`}
                        lessonId={view.lesson.id}
                        task={primaryTask}
                      />
                    ) : (
                      <Alert title="Отправка ответа" tone="info">
                        Отправка ответа для этой задачи скоро появится.
                      </Alert>
                    )}
                  </div>
                </>
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

function LessonStatePage({
  eyebrow,
  text,
  title,
  children
}: {
  eyebrow: string;
  text: string;
  title: string;
  children?: React.ReactNode;
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
              <ButtonLink href="/">На главную</ButtonLink>
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
