"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Alert, ButtonLink, StatusBadge, Panel, PanelBody, PanelHeader } from "@/components/ui";
import { getCurrentUser, getMyCourses, getAuthToken } from "@/services/api";
import type { AdminCourseDto, AuthUserDto } from "@/types";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserDto | null>(null);
  const [courses, setCourses] = useState<AdminCourseDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAuthToken()) {
      router.push(`/login?redirectTo=${encodeURIComponent("/profile")}`);
      return;
    }

    let ignore = false;

    async function load() {
      try {
        const [currentUser, myCourses] = await Promise.all([
          getCurrentUser(),
          getMyCourses()
        ]);

        if (!ignore) {
          setUser(currentUser);
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
  }, [router]);

  if (loading) {
    return (
      <ProfileStatePage eyebrow="Загрузка" title="Загрузка..." text="Получаем данные профиля." />
    );
  }

  if (error) {
    return <ProfileStatePage eyebrow="Ошибка" title="Ошибка профиля" text={error} />;
  }

  if (!user) {
    return (
      <ProfileStatePage
        eyebrow="Требуется вход"
        title="Требуется вход"
        text="Войдите в аккаунт, чтобы увидеть свои курсы."
      />
    );
  }

  const courseList = courses ?? [];

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex-1 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SiteHeader />

          <section className="mt-4 border border-line bg-ink/90">
            {/* Hero header */}
            <header className="grid gap-6 border-b border-line p-5 sm:p-7 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-acid">
                  Профиль
                </p>
                <h1 className="mt-3 max-w-4xl text-4xl font-black uppercase leading-[1.04] sm:text-6xl lg:text-7xl">
                  @{user.username}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/58">
                  {user.email}
                </p>
              </div>

              <div className="grid content-start gap-3">
                <ButtonLink href="/" variant="secondary">
                  К витрине
                </ButtonLink>
              </div>
            </header>

            {/* Courses list */}
            <section className="p-5 sm:p-7">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-acid">
                    Купленные курсы
                  </p>
                  <h2 className="mt-2 text-3xl font-black uppercase sm:text-5xl">Мои курсы</h2>
                </div>
                <span className="font-mono text-xs font-black uppercase text-white/48">
                  {courseList.length} курс{courseList.length === 1 ? "" : courseList.length < 5 ? "а" : "ов"}
                </span>
              </div>

              {courseList.length === 0 ? (
                <Alert title="Курсов пока нет" tone="warning">
                  У вас пока нет курсов. Перейдите на витрину, чтобы выбрать первый трек.
                </Alert>
              ) : (
                <div className="grid gap-4">
                  {courseList.map((course) => (
                    <Panel key={course.id} muted>
                      <PanelHeader className="grid gap-4 sm:grid-cols-[1fr_auto]">
                        <div>
                          <h3 className="text-2xl font-black uppercase leading-[1.04] sm:text-3xl">
                            {course.name}
                          </h3>
                          <p className="mt-2 max-w-3xl text-sm leading-snug text-white/60">
                            {course.description || "Описание пока не добавлено."}
                          </p>
                        </div>
                        <StatusBadge tone="success">Доступно</StatusBadge>
                      </PanelHeader>
                      <PanelBody className="flex flex-wrap items-center justify-between gap-4">
                        <span className="font-mono text-xs font-black uppercase text-white/48" />
                        <Link
                          className="inline-flex min-h-10 items-center justify-center border border-acid bg-acid px-4 text-xs font-black uppercase text-ink transition hover:bg-transparent hover:text-acid"
                          href={`/courses/course-${course.id}`}
                        >
                          Открыть курс
                        </Link>
                      </PanelBody>
                    </Panel>
                  ))}
                </div>
              )}
            </section>
          </section>
        </div>
      </div>

      <div className="mx-auto max-w-7xl">
        <SiteFooter />
      </div>
    </main>
  );
}

function ProfileStatePage({
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
        <div className="mx-auto max-w-7xl">
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
              <ButtonLink href="/login" variant="secondary">
                Вход
              </ButtonLink>
            </div>
          </section>
        </div>
      </div>

      <div className="mx-auto max-w-7xl">
        <SiteFooter />
      </div>
    </main>
  );
}
