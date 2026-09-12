"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AddToCartButton } from "@/components/AddToCartButton";
import { CodeLessonWorkspace } from "@/components/CodeLessonWorkspace";
import { PageState } from "@/components/PageState";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SafeMarkdown } from "@/components/SafeMarkdown";
import { Alert, ButtonLink } from "@/components/ui";
import { getAdminLessons, getLessonLearningView, parseCourseIdFromSlug, getAuthToken } from "@/services/api";
import { Tabs } from "@/components/ui";
import type { AdminLessonDto, LearnerTaskDto, LessonLearningViewDto } from "@/types";

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

  const [siblingLessons, setSiblingLessons] = useState<AdminLessonDto[]>([]);
  const [view, setView] = useState<LessonLearningViewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [taskView, setTaskView] = useState<"task" | "code" | "result">("task");
  const [activeSection, setActiveSection] = useState<"theory" | "practice">("theory");

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    setSiblingLessons([]);
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
          setActiveSection("theory");
        }
        if (data) {
          const lessons = await getAdminLessons(data.module.id).catch(() => []);
          if (!ignore) setSiblingLessons(lessons.filter(item => item.published));
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
    return <PageState eyebrow="Загрузка" title="Загрузка..." text="Получаем данные урока." />;
  }

  if (loadError) {
    return <PageState eyebrow="Ошибка" title="Урок недоступен" text={loadError} />;
  }

  if (!view) {
    return (
      <PageState
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
      <PageState
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
            К каталогу
          </ButtonLink>
        </div>
      </PageState>
    );
  }

  const primaryTask =
    view.tasks.find((task) => task.id === selectedTaskId) ?? view.primaryTask ?? view.tasks[0] ?? null;
  const courseSlug = `course-${view.course.id}`;
  const lessonCode = String(lessonId).padStart(3, "0");

  return <div className="kit-shell"><SiteHeader compact /><main className="kit-page" id="main-content" tabIndex={-1}>
    <nav aria-label="Навигация по уроку" className="flex flex-wrap justify-between gap-4 text-sm text-muted"><Link className="qlc-text-link" href={`/courses/${courseSlug}`}>← {view.course.name}</Link><Link className="qlc-text-link" href="/profile">Моё обучение ↗</Link></nav>
    <header className="kit-lesson-header"><p className="qlc-eyebrow text-muted">{view.module.name} / Урок {lessonCode}</p><h1 className="break-words">{view.lesson.name}</h1><p>{view.lesson.description || "Изучите материал, затем закрепите его на практике."}</p></header>
    <Tabs activeValue={activeSection} items={[{value:"theory",label:"Материал"},{value:"practice",label:`Практика · ${view.tasks.length}`}]} onChange={setActiveSection} />
    <section className={activeSection === "theory" ? "kit-reading" : "hidden"} aria-label="Материал урока">
      <aside><p className="qlc-eyebrow">Модуль</p><h2 className="mb-4 text-xl">{view.module.name}</h2><details className="kit-lesson-outline" open><summary>Уроки модуля</summary><nav aria-label="Уроки модуля">{siblingLessons.map(item => <Link aria-current={item.id === lessonId ? "page" : undefined} className={`flex min-h-11 items-center border-l-2 px-3 py-3 text-sm ${item.id === lessonId ? "border-acid text-acid" : "border-line text-muted hover:text-paper"}`} href={`/lessons/${item.id}`} key={item.id}>{item.name}</Link>)}</nav></details><Link className="qlc-text-link text-muted" href={`/courses/${courseSlug}#curriculum`}>Программа курса →</Link><button className="qlc-text-link text-acid" onClick={() => setActiveSection("practice")} type="button">Перейти к практике →</button></aside>
      <article><SafeMarkdown markdown={view.lesson.contentMd || view.lesson.description || "Материал урока пока пуст."} /><div className="mt-10 border-t border-line pt-6">{view.tasks.length ? <button className="kit-outline-link w-full" onClick={() => setActiveSection("practice")} type="button">Перейти к практике <span aria-hidden="true">→</span></button> : <ButtonLink href={`/courses/${courseSlug}`}>К программе курса →</ButtonLink>}</div></article>
    </section>
    <section className={activeSection === "practice" ? "py-6" : "hidden"} aria-label="Практика урока">
      {!primaryTask ? <Alert title="Задачи скоро появятся" tone="neutral">К этому уроку пока не добавлены задачи. Материал доступен для изучения.</Alert> : <>
        {view.tasks.length > 1 && <nav aria-label="Выбор задачи" className="mb-6 flex flex-wrap gap-2">{view.tasks.map((task, i) => <button key={task.id} className={`min-h-11 max-w-full rounded-sm border px-4 py-2 text-sm ${primaryTask.id === task.id ? "border-acid text-acid" : "border-[#66705D] text-muted"}`} aria-pressed={primaryTask.id === task.id} onClick={() => { setSelectedTaskId(task.id); setTaskView("task"); }} type="button">{getTaskTitle(task, i)}</button>)}</nav>}
        {primaryTask.taskType === "CODE" && <Tabs className="kit-mobile-task-tabs" activeValue={taskView} onChange={setTaskView} items={[{value:"task",label:"Задача"},{value:"code",label:"Код"},{value:"result",label:"Результат"}]} />}
        <div className={primaryTask.taskType === "CODE" ? "kit-task-grid" : "grid gap-6"} data-view={taskView}>
          <section className="kit-task-statement"><header className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5"><h2 className="text-xl">Условие задачи</h2><span className="qlc-eyebrow text-muted">{primaryTask.taskType === "CODE" ? "Код" : primaryTask.taskType === "TEST" ? "Тест" : "Задание"}</span></header><div className="grid gap-6 p-5"><SafeMarkdown markdown={primaryTask.statementMd || "Условие задачи пока пусто."} />
          {primaryTask.taskType === "CODE" && <dl className="grid gap-3 border-t border-line pt-5 text-xs text-muted">{primaryTask.timeLimitMs !== null && <div className="flex justify-between gap-3"><dt>Время</dt><dd>{primaryTask.timeLimitMs} мс</dd></div>}{primaryTask.memoryLimitKb !== null && <div className="flex justify-between gap-3"><dt>Память</dt><dd>{primaryTask.memoryLimitKb} КБ</dd></div>}{primaryTask.outputLimitKb !== null && <div className="flex justify-between gap-3"><dt>Размер вывода</dt><dd>{primaryTask.outputLimitKb} КБ</dd></div>}</dl>}
          {primaryTask.taskType === "TEST" && <ol className="grid gap-3">{(primaryTask.options ?? []).map((option, i) => <li className="flex gap-4 border-t border-line py-4 text-sm" key={i}><span className="font-mono text-muted">{i + 1}.</span>{option}</li>)}</ol>}
          </div></section>
          {primaryTask.taskType === "CODE" ? <CodeLessonWorkspace key={`${primaryTask.id}:${primaryTask.testSetVersion ?? 1}`} task={primaryTask} onSubmissionStart={() => setTaskView("result")} /> : <Alert title="Отправка ответа" tone="info">Отправка ответа для этой задачи скоро появится.</Alert>}
        </div>
      </>}
    </section>
  </main><SiteFooter /></div>;
}
