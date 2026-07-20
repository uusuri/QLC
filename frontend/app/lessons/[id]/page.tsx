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
import { getLessonLearningView, parseCourseIdFromSlug } from "@/services/api";
import { getAuthToken } from "@/services/api";
import type { LessonLearningViewDto } from "@/types";

export default function LessonPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const lessonId = Number(params.id);

  const [view, setView] = useState<LessonLearningViewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

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
    return (
      <LessonStatePage eyebrow="lesson / loading" title="Загрузка..." text="Получаем данные урока." />
    );
  }

  if (loadError) {
    return (
      <LessonStatePage
        eyebrow="lesson / error"
        title="Урок недоступен."
        text={loadError}
      />
    );
  }

  if (!view) {
    return (
      <LessonStatePage
        eyebrow="lesson / not found"
        title="Урок не найден."
        text="Урок не найден. Вернись на страницу курса."
      />
    );
  }

  const isPaid = (view.course.price ?? 0) > 0 || (view.course.priceInStars ?? 0) > 0;
  const hasAccess = Boolean(view.lesson.contentMd);
  const isLocked = isPaid && !hasAccess;

  if (isLocked) {
    return (
      <LessonStatePage
        eyebrow="lesson / locked"
        title="Доступ к уроку закрыт."
        text="Чтобы открыть материал и задачи, купи курс."
      >
        <div className="mt-4 flex flex-wrap gap-3">
          {(() => {
            const courseId = parseCourseIdFromSlug(`course-${view.course.id}`);
            return courseId !== null ? (
              <AddToCartButton courseId={courseId} courseSlug={`course-${view.course.id}`} />
            ) : null;
          })()}
          <ButtonLink href="/" variant="secondary">
            Витрина
          </ButtonLink>
        </div>
      </LessonStatePage>
    );
  }

  const primaryTask = view.primaryTask;
  const courseSlug = `course-${view.course.id}`;

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex-1 px-4 py-4 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-7xl">
          <SiteHeader compact />

          <section className="mt-4 border border-line bg-ink/90">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-5 text-xs font-black uppercase sm:px-7">
              <div className="flex items-center gap-3">
                <Link className="transition hover:text-acid" href={`/courses/${courseSlug}`}>
                  ← Назад к курсу
                </Link>
                <span className="text-white/20">/</span>
                <span className="text-white/70">Урок {view.lesson.id}</span>
              </div>
              <nav className="flex items-center gap-5 text-white/50">
                <Link className="transition hover:text-acid" href="/">
                  Витрина
                </Link>
                <Link className="transition hover:text-acid" href="/admin/content">
                  Admin
                </Link>
              </nav>
            </header>

            <section className="grid gap-8 border-b border-line p-5 sm:p-7 lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
              <div>
                <div className="mb-4 flex flex-wrap gap-2">
                  <StatusBadge tone="success">lesson id {view.lesson.id}</StatusBadge>
                  <StatusBadge tone="neutral">module id {view.module.id}</StatusBadge>
                  <StatusBadge tone="info">{view.tasks.length} tasks</StatusBadge>
                </div>
                <h1 className="max-w-5xl text-5xl font-black uppercase leading-[1.02] sm:text-7xl">
                  {view.lesson.name}
                </h1>
              </div>

              <Panel muted>
                <PanelHeader>
                  <p className="font-mono text-xs font-black uppercase text-acid">context</p>
                </PanelHeader>
                <PanelBody className="grid gap-4 text-sm leading-snug text-white/62">
                  <p>
                    <span className="text-white/36">Course:</span> {view.course.name}
                  </p>
                  <p>
                    <span className="text-white/36">Module:</span> {view.module.name}
                  </p>
                  <p>
                    <span className="text-white/36">Lesson:</span> {view.lesson.name}
                  </p>
                </PanelBody>
              </Panel>
            </section>

            <section className="grid gap-5 p-5 sm:p-7 lg:p-8">
              <Panel muted>
                <PanelHeader>
                  <p className="font-mono text-xs font-black uppercase text-acid">lesson material</p>
                  <h2 className="mt-3 text-3xl font-black uppercase leading-tight">Материал урока</h2>
                </PanelHeader>
                <PanelBody>
                  <SafeMarkdown
                    markdown={
                      view.lesson.contentMd ||
                      view.lesson.description ||
                      "Материал урока скоро появится."
                    }
                  />
                </PanelBody>
              </Panel>

              {!primaryTask ? (
                <Alert title="Задач пока нет" tone="warning">
                  Создай Task для этого урока в /admin/content, затем обнови страницу.
                </Alert>
              ) : (
                <>
                  <Panel muted>
                    <PanelHeader className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div>
                        <p className="font-mono text-xs font-black uppercase text-acid">
                          task statement
                        </p>
                        <h2 className="mt-3 text-3xl font-black uppercase leading-tight">
                          {primaryTask.taskType} Task
                        </h2>
                      </div>
                      <StatusBadge tone="info">task id {primaryTask.id}</StatusBadge>
                    </PanelHeader>
                    <PanelBody className="grid gap-6">
                      <SafeMarkdown
                        markdown={primaryTask.statementMd || "Условие задачи пока пустое."}
                      />

                      {primaryTask.taskType === "CODE" && (
                        <div className="flex flex-wrap gap-2">
                          {primaryTask.timeLimitMs !== null && (
                            <StatusBadge tone="neutral">
                              time {primaryTask.timeLimitMs} ms
                            </StatusBadge>
                          )}
                          {primaryTask.memoryLimitKb !== null && (
                            <StatusBadge tone="neutral">
                              memory {primaryTask.memoryLimitKb} KB
                            </StatusBadge>
                          )}
                          {primaryTask.outputLimitKb !== null && (
                            <StatusBadge tone="neutral">
                              output {primaryTask.outputLimitKb} KB
                            </StatusBadge>
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
                    <CodeLessonWorkspace lessonId={view.lesson.id} task={primaryTask} />
                  ) : (
                    <Alert title="answer submission pending" tone="info">
                      {primaryTask.taskType === "TEST"
                        ? "Варианты показаны без correctOptionIndexes. Endpoint отправки TEST-ответа пока не подключен."
                        : "Правильный numeric-ответ не отображается. Endpoint отправки NUMERIC-ответа пока не подключен."}
                    </Alert>
                  )}
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
              <ButtonLink href="/admin/content" variant="secondary">
                Admin content
              </ButtonLink>
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
