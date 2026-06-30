// Link нужен для переходов назад к курсу и в админку.
import Link from "next/link";

// Workspace включает Monaco Editor и submission lifecycle.
import { CodeLessonWorkspace } from "@/components/CodeLessonWorkspace";

// AuthStatus показывает Вход или @username/Выйти.
import { AuthStatus } from "@/components/AuthStatus";

// SafeMarkdown рендерит lesson/task markdown без raw HTML.
import { SafeMarkdown } from "@/components/SafeMarkdown";

// UI-kit компоненты для единого стиля.
import { Alert, ButtonLink, Panel, PanelBody, PanelHeader, StatusBadge } from "@/components/ui";

// Данные урока и задач приходят из service layer.
import { getLessonLearningView } from "@/services/api";

// Тип view нужен для строгой переменной в try/catch.
import type { LessonLearningViewDto } from "@/types";

// Тип props dynamic route /lessons/[id].
type LessonPageProps = {
  // В Next 15 params в app router типизируются как Promise.
  params: Promise<{
    // id приходит строкой из URL.
    id: string;
  }>;
};

// Урок должен перечитывать backend, чтобы новые Task из админки сразу появлялись.
export const dynamic = "force-dynamic";

// Страница урока: контент, задача, редактор и submission UI.
export default async function LessonPage({ params }: LessonPageProps) {
  const { id } = await params;
  const lessonId = Number(id);
  let view: LessonLearningViewDto | null = null;
  let loadError = "";

  if (!Number.isSafeInteger(lessonId) || lessonId <= 0) {
    return (
      <LessonStatePage
        eyebrow="lesson / invalid id"
        text="ID урока должен быть положительным числом."
        title="Урок не найден."
      />
    );
  }

  try {
    view = await getLessonLearningView(lessonId);
  } catch {
    loadError = "Не удалось загрузить урок. Проверь backend.";
  }

  if (loadError) {
    return (
      <LessonStatePage
        eyebrow="lesson / backend error"
        text={loadError}
        title="Урок недоступен."
      />
    );
  }

  if (!view) {
    return (
      <LessonStatePage
        eyebrow="lesson / not found"
        text="Урок не найден. Вернись на страницу курса."
        title="Урок не найден."
      />
    );
  }

  if (!view.isCourseAvailable) {
    return (
      <LessonStatePage
        eyebrow="lesson / coming soon"
        text="Этот урок относится к курсу, который пока помечен как Скоро в Sprint 2."
        title="Скоро."
      />
    );
  }

  const primaryTask = view.primaryTask;
  const courseSlug = `course-${view.course.id}`;

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl border border-line bg-ink/90">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-5 text-xs font-black uppercase sm:px-7">
          <Link className="transition hover:text-acid" href={`/courses/${courseSlug}`}>
            Back to course
          </Link>
          <nav className="flex items-center gap-5 text-white/50">
            <Link className="transition hover:text-acid" href="/">
              Витрина
            </Link>
            <AuthStatus />
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
              <SafeMarkdown markdown={view.lesson.description || "Материал урока скоро появится."} />
            </PanelBody>
          </Panel>

          {!primaryTask ? (
            <Alert title="Задач пока нет" tone="warning">
              Создай CODE Task для этого урока в `/admin/content`, затем обнови страницу.
            </Alert>
          ) : primaryTask.taskType !== "CODE" ? (
            <Alert title="Задача скоро" tone="warning">
              Sprint 2 lesson UI поддерживает CODE-задачи. Для TEST/NUMERIC нужен отдельный UI позже.
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
                      CODE Task
                    </h2>
                  </div>
                  <StatusBadge tone="info">task id {primaryTask.id}</StatusBadge>
                </PanelHeader>
                <PanelBody className="grid gap-6">
                  <SafeMarkdown markdown={primaryTask.taskText || "Условие задачи пока пустое."} />

                  {primaryTask.testCases && (
                    <div>
                      <p className="mb-3 font-mono text-xs font-black uppercase text-white/46">
                        test cases / examples
                      </p>
                      <pre className="overflow-x-auto border border-line bg-ink p-4 text-sm leading-relaxed text-white/72">
                        <code>{primaryTask.testCases}</code>
                      </pre>
                    </div>
                  )}
                </PanelBody>
              </Panel>

              <CodeLessonWorkspace lessonId={view.lesson.id} task={primaryTask} />
            </>
          )}
        </section>
      </section>
    </main>
  );
}

// Общая страница состояния урока.
function LessonStatePage({
  eyebrow,
  text,
  title
}: {
  eyebrow: string;
  text: string;
  title: string;
}) {
  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <section className="mx-auto grid min-h-[70vh] max-w-7xl content-center gap-6 border border-line bg-ink/90 p-5 sm:p-7">
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
    </main>
  );
}
