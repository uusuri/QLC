import Link from "next/link";

import { AuthStatus } from "@/components/AuthStatus";
import { Alert, ButtonLink, Panel, PanelBody, PanelHeader, Progress, StatusBadge } from "@/components/ui";
import { getCourseCatalog } from "@/services/api";
import type { CourseDto } from "@/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let courses: CourseDto[] = [];
  let loadError = "";

  try {
    courses = await getCourseCatalog();
  } catch {
    loadError = "Не удалось загрузить курсы с сервера. Проверь backend.";
  }

  const featuredCourse = courses[0] ?? null;
  const totalLessons = courses.reduce((sum, course) => sum + course.lessonsCount, 0);
  const isEmpty = courses.length === 0;

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-[92vw] max-w-[92vw]">
        <header className="sticky top-4 z-30 mb-4 border border-line bg-ink/94 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <Link className="flex items-center gap-3" href="/">
              <span className="inline-flex h-3 w-3 rounded-full bg-acid shadow-[0_0_18px_rgba(255,106,61,0.45)]" />
              <span className="font-mono text-xs font-black uppercase tracking-[0.28em] text-white/90">
                Course Archive
              </span>
            </Link>
            <AuthStatus />
          </div>
          <div className="grid gap-px border-t border-line bg-line sm:grid-cols-4">
            <ButtonLink className="justify-center" href="#courses" variant="secondary">
              Курсы
            </ButtonLink>
            <ButtonLink className="justify-center" href="/profile" variant="secondary">
              Профиль
            </ButtonLink>
            <ButtonLink className="justify-center" href="/checkout" variant="secondary">
              Checkout
            </ButtonLink>
            <ButtonLink className="justify-center" href="/admin/content" variant="secondary">
              Admin
            </ButtonLink>
          </div>
        </header>

        {loadError ? (
          <Alert className="mb-4" title="backend unavailable" tone="danger">
            {loadError}
          </Alert>
        ) : null}

        <section className="grid gap-4">
          <Panel>
            <PanelHeader className="grid justify-items-center gap-4 text-center">
              <StatusBadge tone={isEmpty ? "warning" : "success"}>
                {isEmpty ? "catalog empty" : "catalog live"}
              </StatusBadge>
              <h1 className="max-w-4xl text-4xl font-black uppercase leading-[0.96] sm:text-6xl lg:text-7xl">
                Залупа.
                <br />
                Письки.
                <br />
                Героин.
              </h1>
              <div className="flex flex-wrap justify-center gap-3">
                <ButtonLink href="/login">Войти</ButtonLink>
                <ButtonLink href="#courses" variant="secondary">
                  Смотреть курсы
                </ButtonLink>
              </div>
            </PanelHeader>
          </Panel>

          <section id="courses" className="grid gap-4">
            <Panel muted>
              <PanelHeader className="flex items-center justify-center gap-4">
                <h2 className="text-2xl font-black uppercase leading-relaxed sm:text-3xl">Магазин</h2>
              </PanelHeader>

              <PanelBody className="grid gap-4">
                {loadError ? (
                  <Alert title="catalog error" tone="danger">
                    Каталог недоступен.
                  </Alert>
                ) : isEmpty ? (
                  <Alert title="catalog empty" tone="warning">
                    Создай первый курс в `/admin/content`.
                  </Alert>
                ) : (
                  courses.map((course, index) => (
                    <article
                      className="grid gap-4 border border-line bg-white/[0.02] p-4 transition hover:bg-white/[0.05]"
                      key={course.slug}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/44">
                            {String(index + 1).padStart(2, "0")}
                          </p>
                          <h3 className="mt-2 text-2xl font-black uppercase leading-tight">
                            {course.title}
                          </h3>
                        </div>
                        <StatusBadge tone={index === 0 ? "success" : "neutral"}>
                          {index === 0 ? "open" : "soon"}
                        </StatusBadge>
                      </div>

                      <p className="text-sm leading-relaxed text-white/64">{course.description}</p>

                      <div className="grid gap-3">
                        <div className="flex items-center justify-between gap-4 text-[10px] font-black uppercase tracking-[0.24em] text-white/42">
                          <span>{course.lessonsLabel}</span>
                          <span>{course.price.formatted}</span>
                        </div>
                        <Progress
                          label={`${course.title} progress`}
                          value={Math.min(100, course.lessonsCount * 3)}
                        />
                        <ButtonLink
                          disabled={index !== 0}
                          href={`/courses/${course.slug}`}
                          variant={index === 0 ? "primary" : "secondary"}
                        >
                          {index === 0 ? "Открыть" : "Скоро"}
                        </ButtonLink>
                      </div>
                    </article>
                  ))
                )}
              </PanelBody>
            </Panel>
          </section>
        </section>
      </div>
    </main>
  );
}
