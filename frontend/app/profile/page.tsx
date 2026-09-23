"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CourseArtwork } from "@/components/DesignKit";
import { useAuth } from "@/components/AuthProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ContinueLearningCard } from "@/components/ContinueLearning";
import { PageState } from "@/components/PageState";
import { Alert, ButtonLink, Progress } from "@/components/ui";
import { formatRussianCountWord, getMyLearningCourses } from "@/services/api";
import { getLearningHref, getNextLearningLesson } from "@/services/learningProgress";
import type { MyCourseProgressDto } from "@/types";

export default function ProfilePage() {
  const router = useRouter();
  const { loading: authLoading, user } = useAuth();
  const [courses, setCourses] = useState<MyCourseProgressDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.replace("/login?redirectTo=%2Fprofile");
      return;
    }

    let ignore = false;
    setError("");

    async function load() {
      try {
        const myCourses = await getMyLearningCourses();

        if (!ignore) {
          setCourses(myCourses);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить профиль.");
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
  }, [authLoading, router, user?.id]);

  if (authLoading || loading) {
    return (
      <PageState eyebrow="Загрузка" title="Загрузка..." text="Получаем данные профиля." />
    );
  }

  if (error) {
    return <PageState eyebrow="Ошибка" title="Ошибка профиля" text={error} />;
  }

  if (!user) {
    return (
      <PageState
        eyebrow="Требуется вход"
        showLoginAction
        title="Требуется вход"
        text="Войдите в аккаунт, чтобы увидеть свои курсы."
      />
    );
  }

  const courseList = courses ?? [];
  const nextLesson = getNextLearningLesson(courseList);
  const solvedTasks = courseList.reduce((total, course) => total + course.solvedTasks, 0);
  const totalTasks = courseList.reduce((total, course) => total + course.totalTasks, 0);
  const overallProgress = totalTasks > 0 ? Math.floor((solvedTasks / totalTasks) * 100) : 0;

  return <div className="kit-shell"><SiteHeader /><main className="kit-page" id="main-content" tabIndex={-1}>
    <header className="kit-profile-header"><div aria-hidden="true" className="kit-avatar">{user.username.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="qlc-eyebrow">Личный кабинет</p><h1>@{user.username}</h1><p>{user.email}</p></div></header>
    <dl className="kit-stats"><div><dt>Мои курсы</dt><dd>{courseList.length}</dd></div><div><dt>Решено задач</dt><dd>{solvedTasks}</dd></div><div><dt>Прогресс по задачам</dt><dd>{totalTasks > 0 ? `${overallProgress}%` : "—"}</dd></div></dl>
    <Progress label={`Решено ${solvedTasks} из ${totalTasks} задач`} value={totalTasks > 0 ? overallProgress : null} />
    {nextLesson && <ContinueLearningCard nextLesson={nextLesson} />}
    <section className="py-10"><div className="kit-program-heading"><h2>Мои курсы</h2><Link className="qlc-text-link text-muted" href="/courses">Найти новый курс ↗</Link></div>
    {!courseList.length ? <Alert title="Здесь начнётся ваше обучение" tone="neutral"><p>Выберите первый курс. Здесь появятся уроки и прогресс по задачам.</p><ButtonLink className="mt-5" href="/courses">Выбрать курс →</ButtonLink></Alert> : <div className="kit-profile-courses">{courseList.map(course => {
      const courseNext = getNextLearningLesson([course]);
      return <article className="kit-learning-card" key={course.id}>
        <header><CourseArtwork title={course.name} /><div className="min-w-0"><h3><Link href={`/courses/course-${course.id}`}>{course.name}</Link></h3><p>{course.modules.length} {formatRussianCountWord(course.modules.length, ["модуль", "модуля", "модулей"])} · {course.modules.reduce((sum, m) => sum + m.lessons.length, 0)} {formatRussianCountWord(course.modules.reduce((sum, m) => sum + m.lessons.length, 0), ["урок", "урока", "уроков"])}</p></div></header>
        <Progress label={`${course.solvedTasks} / ${course.totalTasks} задач`} value={course.totalTasks > 0 ? course.progressPercent : null} />
        {courseNext && <p className="!mt-6">{courseNext.module.name} / {courseNext.lesson.name}</p>}
        <ButtonLink className="mt-6 w-full" href={courseNext ? getLearningHref(courseNext) : `/courses/course-${course.id}`}>{courseNext ? "Продолжить обучение" : "Открыть курс"} →</ButtonLink>
        <details><summary>Программа курса</summary>{course.modules.map(module => <div className="mt-4" key={module.id}><h4 className="text-sm">{module.name}</h4>{module.lessons.length ? module.lessons.map(lesson => <Link href={`/lessons/${lesson.id}`} key={lesson.id}><span>{lesson.name}</span><span className="shrink-0 text-muted">{lesson.solvedTasks}/{lesson.totalTasks}</span></Link>) : <p>Уроки скоро появятся.</p>}</div>)}</details>
      </article>;
    })}</div>}
    </section>
  </main><SiteFooter /></div>;
}
