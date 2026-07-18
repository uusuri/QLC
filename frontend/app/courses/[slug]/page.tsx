import Link from "next/link";

import { SafeMarkdown } from "@/components/SafeMarkdown";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Alert, ButtonLink, Panel, PanelBody, PanelHeader, StatusBadge } from "@/components/ui";
import { getCourseLearningView } from "@/services/api";
import type { CourseLearningViewDto } from "@/types";

type CoursePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params;
  let view: CourseLearningViewDto | null = null;
  let loadError = "";

  try {
    view = await getCourseLearningView(slug);
  } catch {
    loadError = "Не удалось загрузить курс. Проверь backend.";
  }

  if (loadError) {
    return (
      <CourseStatePage
        eyebrow="course / backend error"
        text={loadError}
        title="Курс недоступен."
      />
    );
  }

  if (!view) {
    return (
      <CourseStatePage
        eyebrow="course / not found"
        text="Курс не найден. Вернись на главную и выбери курс из каталога."
        title="Курс не найден."
      />
    );
  }

  if (!view.isAvailable) {
    return (
      <CourseStatePage
        eyebrow="course / coming soon"
        text="Этот курс уже есть в базе, но пользовательский путь Sprint 2 открыт только для первого курса."
        title="Скоро."
      />
    );
  }

  const lessonsCount = view.modules.reduce((sum, item) => sum + item.lessons.length, 0);

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
                  Витрина
                </Link>
                <span className="text-white/20">/</span>
                <span className="text-white/70">Курс</span>
              </div>
              <nav className="flex items-center gap-5 text-white/50">
                <Link className="transition hover:text-acid" href="/profile">
                  Профиль
                </Link>
                <Link className="transition hover:text-acid" href="/admin/content">
                  Admin
                </Link>
              </nav>
            </header>

            <section className="grid gap-8 border-b border-line p-5 sm:p-7 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
              <div>
                <div className="mb-4 flex flex-wrap gap-2">
                  <StatusBadge tone="success">available</StatusBadge>
                  <StatusBadge tone="neutral">course id {view.course.id}</StatusBadge>
                  <StatusBadge tone="info">{lessonsCount} lessons</StatusBadge>
                </div>
                <h1 className="max-w-5xl text-5xl font-black uppercase leading-[1.02] sm:text-7xl">
                  {view.course.name}
                </h1>
              </div>

              <div className="grid content-end gap-5">
                <SafeMarkdown markdown={view.course.description || "Описание курса скоро появится."} />
                <div className="flex flex-wrap gap-3">
                  <ButtonLink disabled={!view.firstLesson} href={`/lessons/${view.firstLesson?.id ?? ""}`}>
                    Открыть первый урок
                  </ButtonLink>
                  <ButtonLink href="/" variant="secondary">
                    Назад к витрине
                  </ButtonLink>
                </div>
              </div>
            </section>

            <section className="grid gap-5 p-5 sm:p-7 lg:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-acid">
                    course structure
                  </p>
                  <h2 className="mt-3 text-4xl font-black uppercase leading-none">Модули и уроки</h2>
                </div>
                <p className="max-w-xl text-sm leading-snug text-white/54">
                  Структура приходит из backend: Course → Module → Lesson. Если уроков нет,
                  создай их в /admin/content.
                </p>
              </div>

              {view.modules.length === 0 ? (
                <Alert title="Структура пустая" tone="warning">
                  Модулей пока нет. Создай Module и Lesson в /admin/content, затем обнови страницу.
                </Alert>
              ) : (
                <div className="grid gap-4">
                  {view.modules.map((item, moduleIndex) => (
                    <Panel key={item.module.id} muted>
                      <PanelHeader className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                        <StatusBadge tone="neutral">module {moduleIndex + 1}</StatusBadge>
                        <div>
                          <h3 className="text-2xl font-black uppercase leading-tight">
                            {item.module.name}
                          </h3>
                          <p className="mt-2 text-sm leading-snug text-white/54">
                            {item.module.description || "Описание модуля пока пустое."}
                          </p>
                        </div>
                        <span className="font-mono text-xs font-black uppercase text-white/42">
                          ID {item.module.id}
                        </span>
                      </PanelHeader>

                      <PanelBody>
                        {item.lessons.length === 0 ? (
                          <Alert title="Уроков нет" tone="warning">
                            В этом модуле пока нет уроков.
                          </Alert>
                        ) : (
                          <div className="grid gap-px border border-line bg-line">
                            {item.lessons.map((lesson, lessonIndex) => (
                              <Link
                                className="grid gap-3 bg-ink p-4 transition hover:bg-white/8 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center"
                                href={`/lessons/${lesson.id}`}
                                key={lesson.id}
                              >
                                <StatusBadge tone="info">lesson {lessonIndex + 1}</StatusBadge>
                                <div>
                                  <strong className="text-lg font-black uppercase leading-tight">
                                    {lesson.name}
                                  </strong>
                                  <p className="mt-2 line-clamp-2 text-sm text-white/50">
                                    {lesson.description || "Описание урока пока пустое."}
                                  </p>
                                </div>
                                <StatusBadge tone={lesson.published ? "success" : "warning"}>
                                  {lesson.published ? "published" : "draft"}
                                </StatusBadge>
                                <span className="font-mono text-xs font-black uppercase text-white/38">
                                  ID {lesson.id}
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </PanelBody>
                    </Panel>
                  ))}
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
  eyebrow,
  text,
  title
}: {
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
              <ButtonLink href="/">На главную</ButtonLink>
              <ButtonLink href="/admin/content" variant="secondary">
                Admin content
              </ButtonLink>
            </div>
          </section>
        </section>
      </div>

      <div className="mx-auto max-w-7xl">
        <SiteFooter />
      </div>
    </main>
  );
}
