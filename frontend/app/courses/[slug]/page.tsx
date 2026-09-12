"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AddToCartButton } from "@/components/AddToCartButton";
import { PageState } from "@/components/PageState";
import { SafeMarkdown } from "@/components/SafeMarkdown";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { CourseArtwork, KitIcon } from "@/components/DesignKit";
import { Alert, ButtonLink } from "@/components/ui";
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
    setLoading(true);
    setHasAccess(false);
    setLoadError("");
    setExpandedLessonId(null);

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
            const access = await getCourseAccess(courseId);
            if (!ignore) setHasAccess(access);
          } catch {
            if (!ignore) setHasAccess(false);
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
    return <PageState eyebrow="Загрузка" title="Загрузка курса" text="Получаем программу." />;
  }

  if (loadError) {
    return <PageState eyebrow="Ошибка" title="Курс недоступен" text={loadError} />;
  }

  if (!view) {
    return (
      <PageState
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
    <div className="kit-shell">
      <SiteHeader />
      <main className="kit-page" id="main-content" tabIndex={-1}>
        <nav aria-label="Хлебные крошки" className="flex flex-wrap items-center gap-3 text-sm text-muted"><Link className="qlc-text-link" href="/courses">Курсы</Link><span>/</span><span aria-current="page">{view.course.name}</span></nav>
        <section className="kit-course-hero">
          <div className="min-w-0"><p className="qlc-eyebrow text-acid">Программирование / Курс</p><h1 className="break-words">{view.course.name}</h1><SafeMarkdown markdown={view.course.description || "Описание пока не добавлено."} /><a className="qlc-text-link mt-6" href="#curriculum">Программа курса ↓</a></div>
          <CourseArtwork title={view.course.name} />
        </section>
        <section className="kit-course-summary" id="purchase" aria-label="Доступ к курсу">
          <dl><div><dt>Модулей</dt><dd>{view.modules.length}</dd></div><div><dt>Уроков</dt><dd>{view.catalogCourse.lessonsCount}</dd></div><div><dt>{canStudy ? "Статус" : "Стоимость"}</dt><dd>{canStudy ? "Доступ открыт" : view.catalogCourse.price.formatted}</dd></div></dl>
          <div>{canStudy ? <ButtonLink className="w-full" disabled={!view.firstLesson} href={`/lessons/${view.firstLesson?.id ?? ""}`}>Открыть первый урок →</ButtonLink> : courseId !== null ? <AddToCartButton courseId={courseId} courseSlug={slug} /> : null}
          {!view.firstLesson && canStudy && <p className="mt-3 text-xs text-muted">Первый урок скоро появится.</p>}</div>
        </section>
        <section id="curriculum">
          <div className="kit-program-heading"><h2>Программа курса</h2>{view.modules.length > 0 && <button className="qlc-text-link text-muted" type="button" onClick={() => setExpandedModuleIds(expandedModuleIds.length === view.modules.length ? [] : view.modules.map(item => item.module.id))}>{expandedModuleIds.length === view.modules.length ? "Свернуть всё −" : "Раскрыть все модули +"}</button>}</div>
          {!view.modules.length ? <Alert title="Программа готовится" tone="neutral">В курсе пока нет модулей.</Alert> : view.modules.map((item, moduleIndex) => {
            const publishedLessons = item.lessons.filter(lesson => lesson.published);
            const expanded = expandedModuleIds.includes(item.module.id);
            return <section className="kit-module" key={item.module.id}>
              <button className="kit-module-toggle" aria-controls={`module-${item.module.id}`} aria-expanded={expanded} onClick={() => toggleModule(item.module.id)} type="button">
                <div className="min-w-0"><span className="qlc-eyebrow">{String(moduleIndex + 1).padStart(2, "0")} / Модуль</span><h3 className="break-words">{item.module.name}</h3>{item.module.description && <p>{item.module.description}</p>}<p className="mt-3">{publishedLessons.length} {formatRussianCountWord(publishedLessons.length, ["урок", "урока", "уроков"])}</p></div><span aria-hidden="true" className="text-xl text-muted">{expanded ? "−" : "+"}</span>
              </button>
              {expanded && <div id={`module-${item.module.id}`} className="kit-module-lessons">
                {!publishedLessons.length ? <p className="py-5 text-sm text-muted">Уроки этого модуля скоро появятся.</p> : publishedLessons.map((lesson) => {
                  const lessonExpanded = expandedLessonId === lesson.id;
                  const outlines = taskOutlines[lesson.id] ?? [];
                  return <article className="kit-lesson-row" key={lesson.id}>
                    <div className="kit-lesson-line"><KitIcon name={canStudy ? "play" : "diamond"} className="text-muted" />{canStudy ? <Link href={`/lessons/${lesson.id}`}>{lesson.name}</Link> : <span>{lesson.name}</span>}<button className="min-h-11 min-w-11 text-muted" aria-label={`${lessonExpanded ? "Скрыть" : "Показать"} содержание урока «${lesson.name}»`} aria-expanded={lessonExpanded} aria-controls={`lesson-outline-${lesson.id}`} onClick={() => void toggleLesson(lesson.id)} type="button">{lessonExpanded ? "−" : "+"}</button></div>
                    {lessonExpanded && <div className="kit-outline" id={`lesson-outline-${lesson.id}`}>
                      {lesson.description && <p className="mb-4">{lesson.description}</p>}
                      {taskOutlineLoadingId === lesson.id ? <p role="status">Загружаем задачи…</p> : taskOutlineError[lesson.id] ? <p role="alert" className="text-[#FF8074]">{taskOutlineError[lesson.id]}</p> : outlines.length ? outlines.map((task, taskIndex) => <div key={task.id} className="flex flex-wrap justify-between gap-2 border-b border-line py-3"><span>{getTaskOutlineTitle(task.statementMd, taskIndex)}</span><span className="text-xs">{task.taskType === "CODE" ? "Код" : task.taskType === "TEST" ? "Тест" : "Задание"}</span></div>) : <p>Задачи к уроку скоро появятся.</p>}
                      {!canStudy && <a className="qlc-text-link text-acid" href="#purchase">Открыть доступ к урокам ↑</a>}
                    </div>}
                  </article>;
                })}
              </div>}
            </section>;
          })}
        </section>
      </main><SiteFooter />
    </div>
  );
}

function getTaskOutlineTitle(statementMd: string, index: number) {
  const heading = statementMd.match(/^#{1,3}\s+(.+)$/m)?.[1];
  return heading?.replace(/[*`]/g, "") || `Задача ${index + 1}`;
}
