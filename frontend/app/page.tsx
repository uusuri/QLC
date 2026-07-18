import Image from "next/image";
import Link from "next/link";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
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
    loadError = "Не удалось загрузить каталог курсов. Проверь, что backend доступен на 127.0.0.1:8080.";
  }

  const featuredCourse = courses[0] ?? null;
  const totalLessons = courses.reduce((sum, course) => sum + course.lessonsCount, 0);
  const isEmpty = courses.length === 0;

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex-1 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-[92vw] max-w-[92vw]">
          <SiteHeader />

          {loadError ? (
            <Alert className="mb-4" title="backend unavailable" tone="danger">
              {loadError}
            </Alert>
          ) : null}

          <section className="mt-4 grid gap-4">
            {/* Hero */}
            <Panel className="relative overflow-hidden">
              <PanelHeader className="grid gap-8 text-center lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:text-left">
                <div className="lg:col-span-2">
                  <div className="mb-5 flex flex-wrap justify-center gap-2 lg:justify-start">
                    <StatusBadge tone={isEmpty ? "warning" : "success"}>
                      {isEmpty ? "catalog empty" : "catalog live"}
                    </StatusBadge>
                    <StatusBadge tone="info">
                      {courses.length} tracks
                    </StatusBadge>
                  </div>
                  <h1 className="max-w-5xl text-5xl font-black uppercase leading-[0.96] sm:text-7xl lg:text-8xl">
                    Техническое
                    <br />
                    образование?
                    <br />
                    <span className="text-acid justify-center">QLC.</span>
                  </h1>
                  <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/62 lg:mx-0">
                    Практические курсы по программированию, дизайну и запуску продуктов.
                    Каждый урок — это задача. Каждая задача — это шанс прокачать навык.
                  </p>
                  <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
                    <ButtonLink href="#courses">Смотреть курсы</ButtonLink>
                    <ButtonLink href="/login" variant="secondary">
                      Войти в аккаунт
                    </ButtonLink>
                  </div>
                </div>

                {/* Hero stat stack */}
                <div className="grid gap-px border border-line bg-line">
                  <HeroStat value={String(courses.length).padStart(2, "0")} label="курсов" />
                  <HeroStat value={String(totalLessons).padStart(2, "0")} label="уроков" />
                  <HeroStat value="∞" label="попыток" />
                </div>
              </PanelHeader>

              <PanelBody className="border-t border-line/80 bg-white/[0.02]">
                <div className="grid gap-6 sm:grid-cols-3">
                  <Feature
                    number="01"
                    title="Код в браузере"
                    text="Редактор Monaco, автопроверка решений и мгновенный feedback прямо в уроке."
                  />
                  <Feature
                    number="02"
                    title="Четкая структура"
                    text="Course → Module → Lesson → Task. Никакой воды: только конкретные навыки."
                  />
                  <Feature
                    number="03"
                    title="Прогресс наглядный"
                    text="Статистика, ранги, серии и прогресс-бары мотивируют дойти до конца."
                  />
                </div>
              </PanelBody>
            </Panel>

            {/* Courses */}
            <section id="courses">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-acid">
                    catalog / tracks
                  </p>
                  <h2 className="mt-2 text-3xl font-black uppercase sm:text-5xl">Доступные курсы</h2>
                </div>
                {!isEmpty && (
                  <span className="font-mono text-xs font-black uppercase text-white/40">
                    {courses.length} track{courses.length === 1 ? "" : "s"} / {totalLessons} lessons
                  </span>
                )}
              </div>

              {loadError ? (
                <Alert title="catalog error" tone="danger">
                  Каталог недоступен. Убедись, что backend поднят, или перейди в админку, чтобы создать первый курс.
                </Alert>
              ) : isEmpty ? (
                <Panel muted>
                  <PanelBody className="grid gap-5 text-center">
                    <Alert title="catalog empty" tone="warning">
                      В базе пока нет курсов. Создай первый курс в панели администратора.
                    </Alert>
                    <div>
                      <ButtonLink href="/admin/content">Открыть админку</ButtonLink>
                    </div>
                  </PanelBody>
                </Panel>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {courses.map((course, index) => (
                    <CourseCard
                      course={course}
                      index={index}
                      key={course.slug}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Bottom CTA */}
            <Panel muted>
              <PanelBody className="flex flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left">
                <div>
                  <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-acid">
                    next step
                  </p>
                  <h2 className="mt-2 text-2xl font-black uppercase sm:text-3xl">
                    Готов начать обучение?
                  </h2>
                  <p className="mt-2 text-sm text-white/58">
                    Авторизуйся, чтобы сохранять прогресс и отправлять решения на проверку.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <ButtonLink href="/register">Создать аккаунт</ButtonLink>
                  <ButtonLink href="/login" variant="secondary">
                    Войти
                  </ButtonLink>
                </div>
              </PanelBody>
            </Panel>
          </section>
        </div>
      </div>

      <div className="mx-auto w-[92vw] max-w-[92vw]">
        <SiteFooter />
      </div>
    </main>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel p-5 text-center">
      <p className="text-4xl font-black text-acid sm:text-5xl">{value}</p>
      <p className="mt-2 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
        {label}
      </p>
    </div>
  );
}

function Feature({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="relative border border-line bg-ink/60 p-5">
      <span className="font-mono text-xs font-black text-acid">{number}</span>
      <h3 className="mt-4 text-lg font-black uppercase">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/58">{text}</p>
    </div>
  );
}

function CourseCard({ course, index }: { course: CourseDto; index: number }) {
  const isAvailable = index === 0;

  return (
    <article className="group flex flex-col overflow-hidden border border-line bg-ink/92 transition hover:border-acid/50 hover:bg-white/[0.03]">
      <div className="relative aspect-[16/10] overflow-hidden border-b border-line">
        <Image
          alt={course.title}
          className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          src={course.imageUrl}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <StatusBadge tone={isAvailable ? "success" : "neutral"}>
            {isAvailable ? "open" : "soon"}
          </StatusBadge>
          {course.badge && course.badge !== "course" && (
            <StatusBadge tone="info">{course.badge}</StatusBadge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/44">
            {String(index + 1).padStart(2, "0")}
          </p>
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/44">
            {course.price.formatted}
          </p>
        </div>

        <h3 className="text-2xl font-black uppercase leading-tight">{course.title}</h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-white/60">{course.description}</p>

        <div className="mt-5 grid gap-4">
          <Progress label={`${course.title} readiness`} value={Math.min(100, course.lessonsCount * 3)} />
          <ButtonLink
            disabled={!isAvailable}
            href={`/courses/${course.slug}`}
            variant={isAvailable ? "primary" : "secondary"}
          >
            {isAvailable ? "Открыть курс" : "Скоро"}
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
