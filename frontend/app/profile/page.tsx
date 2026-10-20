"use client";

import Link from "next/link";
import { courseLanguage } from "@/components/courseLanguages";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { CourseArtwork } from "@/components/DesignKit";
import { useAuth } from "@/components/AuthProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ContinueLearningCard } from "@/components/ContinueLearning";
import { PageState } from "@/components/PageState";
import { Alert, ButtonLink, Progress } from "@/components/ui";
import { deleteMyAvatar, formatRussianCountWord, getMyAvatar, getMyLearningCourses, requestEmailVerification, uploadMyAvatar } from "@/services/api";
import { getLearningHref, getNextLearningLesson } from "@/services/learningProgress";
import type { MyCourseProgressDto } from "@/types";

export default function ProfilePage() {
  const router = useRouter();
  const { loading: authLoading, user } = useAuth();
  const [courses, setCourses] = useState<MyCourseProgressDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const avatarInput = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(true);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [emailNotice, setEmailNotice] = useState("");
  const [emailSending, setEmailSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setAvatarLoading(true);
    setAvatarUrl(null);
    setAvatarError("");
    setAvatarMessage("");

    void getMyAvatar().then((image) => {
      if (active) setAvatarUrl(image ? URL.createObjectURL(image) : null);
    }).catch((err) => {
      if (active) setAvatarError(err instanceof Error ? err.message : "Не удалось загрузить аватарку.");
    }).finally(() => {
      if (active) setAvatarLoading(false);
    });

    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => () => {
    if (avatarUrl) URL.revokeObjectURL(avatarUrl);
  }, [avatarUrl]);

  useEffect(() => {
    if (!avatarMessage) return;
    const timeout = window.setTimeout(() => setAvatarMessage(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [avatarMessage]);

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setAvatarError("Выберите JPG или PNG размером до 2 МБ.");
      setAvatarMessage("");
      return;
    }

    setAvatarSaving(true);
    setAvatarError("");
    setAvatarMessage("");
    try {
      await uploadMyAvatar(file);
      const image = await getMyAvatar();
      if (!image) throw new Error("Фото сохранено, но не удалось его загрузить. Обновите страницу.");
      setAvatarUrl(URL.createObjectURL(image));
      setAvatarMessage("Фото обновлено.");
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Не удалось сохранить аватарку.");
    } finally {
      setAvatarSaving(false);
    }
  }

  async function handleAvatarDelete() {
    setAvatarSaving(true);
    setAvatarError("");
    setAvatarMessage("");
    try {
      await deleteMyAvatar();
      setAvatarUrl(null);
      setAvatarMessage("Фото удалено.");
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Не удалось удалить аватарку.");
    } finally {
      setAvatarSaving(false);
    }
  }

  async function resendVerification() {
    if (!user) return;
    setEmailSending(true);
    setEmailNotice("");
    try {
      await requestEmailVerification(user.email);
      setEmailNotice("Проверьте почту. Повторное письмо отправляется не чаще раза в минуту.");
    } catch (err) {
      setEmailNotice(err instanceof Error ? err.message : "Не удалось запросить письмо.");
    } finally {
      setEmailSending(false);
    }
  }

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
  const hasRealEmail = !user.email.toLowerCase().endsWith("@telegram.local");

  return <div className="kit-shell"><SiteHeader /><main className="kit-page" id="main-content" tabIndex={-1}>
    <header className="kit-profile-header">
      <div className="kit-avatar">{avatarUrl ? <img alt={`Аватар ${user.username}`} src={avatarUrl} /> : <span aria-hidden="true">{user.username.slice(0, 1).toUpperCase()}</span>}</div>
      <div className="kit-profile-details">
        <div>
          <p className="qlc-eyebrow">Личный кабинет</p>
          <h1>@{user.username}</h1>
          <p className="kit-profile-email">{hasRealEmail ? user.email : "Почта не привязана"}</p>
        </div>
        <input ref={avatarInput} accept="image/jpeg,image/png" className="sr-only" onChange={(event) => void handleAvatarChange(event)} tabIndex={-1} type="file" />
        <div className="kit-profile-avatar-controls">
          <div className="kit-profile-avatar-actions">
            <button aria-label={avatarUrl ? "Изменить фото" : "Загрузить фото"} className="kit-profile-avatar-change" disabled={avatarLoading || avatarSaving} onClick={() => avatarInput.current?.click()} type="button">{avatarSaving ? "Сохраняем…" : avatarUrl ? "Изменить" : "Загрузить"}</button>
            {avatarUrl && <button aria-label="Удалить фото" className="kit-profile-avatar-delete" disabled={avatarSaving} onClick={() => void handleAvatarDelete()} type="button">Удалить</button>}
          </div>
          {(avatarError || avatarMessage) && <div className="kit-profile-avatar-feedback">
            {avatarError && <span className="kit-profile-avatar-error" role="alert">{avatarError}</span>}
            {avatarMessage && <span className="kit-profile-avatar-success" role="status">{avatarMessage}</span>}
          </div>}
        </div>
      </div>
    </header>
    {hasRealEmail && user.emailVerified === false && <Alert title="Подтвердите почту" tone="warning">
      <p>Проверьте {user.email} или запросите письмо. Подтверждённый адрес поможет восстановить доступ.</p>
      <button className="mt-4 text-sm font-semibold text-acid hover:text-white" disabled={emailSending} onClick={() => void resendVerification()} type="button">
        {emailSending ? "Отправляем…" : "Отправить письмо повторно →"}
      </button>
      {emailNotice && <p className="mt-2 text-sm" role="status">{emailNotice}</p>}
    </Alert>}
    <dl className="kit-stats"><div><dt>Мои курсы</dt><dd>{courseList.length}</dd></div><div><dt>Решено задач</dt><dd>{solvedTasks}</dd></div><div><dt>Прогресс по задачам</dt><dd>{totalTasks > 0 ? `${overallProgress}%` : "—"}</dd></div></dl>
    <Progress label={`Решено ${solvedTasks} из ${totalTasks} задач`} value={totalTasks > 0 ? overallProgress : null} />
    {nextLesson && <ContinueLearningCard nextLesson={nextLesson} />}
    <section className="py-10"><div className="kit-program-heading"><h2>Мои курсы</h2><Link className="qlc-text-link text-muted" href="/courses">Найти новый курс ↗</Link></div>
    {!courseList.length ? <Alert title="Здесь начнётся ваше обучение" tone="neutral"><p>Выберите первый курс. Здесь появятся уроки и прогресс по задачам.</p><ButtonLink className="mt-5" href="/courses">Выбрать курс →</ButtonLink></Alert> : <div className="kit-profile-courses">{courseList.map(course => {
      const courseNext = getNextLearningLesson([course]);
      return <article className="kit-learning-card" key={course.id}>
        <header><CourseArtwork title={course.name} /><div className="min-w-0"><h3><Link href={`/courses/course-${course.id}`}>{course.name}</Link></h3>{course.multilingual && <p>Язык решений: {course.selectedLanguage ? courseLanguage(course.selectedLanguage).label : "не выбран"}</p>}<p>{course.modules.length} {formatRussianCountWord(course.modules.length, ["модуль", "модуля", "модулей"])} · {course.modules.reduce((sum, m) => sum + m.lessons.length, 0)} {formatRussianCountWord(course.modules.reduce((sum, m) => sum + m.lessons.length, 0), ["урок", "урока", "уроков"])}</p></div></header>
        <Progress label={`${course.solvedTasks} / ${course.totalTasks} задач`} value={course.totalTasks > 0 ? course.progressPercent : null} />
        {courseNext && <p className="!mt-6">{courseNext.module.name} / {courseNext.lesson.name}</p>}
        <ButtonLink className="mt-6 w-full" href={courseNext ? getLearningHref(courseNext) : `/courses/course-${course.id}`}>{courseNext ? "Продолжить обучение" : "Открыть курс"} →</ButtonLink>
        <details><summary>Программа курса</summary>{course.modules.map(module => <div className="mt-4" key={module.id}><h4 className="text-sm">{module.name}</h4>{module.lessons.length ? module.lessons.map(lesson => <Link href={`/lessons/${lesson.id}`} key={lesson.id}><span>{lesson.name}</span><span className="shrink-0 text-muted">{lesson.solvedTasks}/{lesson.totalTasks}</span></Link>) : <p>Уроки скоро появятся.</p>}</div>)}</details>
      </article>;
    })}</div>}
    </section>
  </main><SiteFooter /></div>;
}
