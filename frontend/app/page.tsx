import Link from "next/link";

import { CourseList } from "@/components/CourseList";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { HomeBottomAuthCTA, HomeHeroLoginButton } from "@/components/HomeAuthActions";
import { Alert, ButtonLink, Panel, PanelBody, PanelHeader, StatusBadge } from "@/components/ui";
import { getCourseCatalog } from "@/services/api";
import type { CourseDto } from "@/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let courses: CourseDto[] = [];
  let loadError = "";

  try {
    courses = await getCourseCatalog();
  } catch {
    loadError = "Каталог временно недоступен. Попробуйте обновить страницу.";
  }

  const totalLessons = courses.reduce((sum, course) => sum + course.lessonsCount, 0);
  const isEmpty = courses.length === 0;

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex-1 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-[92vw] max-w-[92vw]">
          <SiteHeader />

          {loadError ? (
            <Alert className="mb-4" title="Ошибка загрузки" tone="danger">
              {loadError}
            </Alert>
          ) : null}

          <section className="mt-4 grid gap-4">
            {/* Hero */}
            <Panel className="relative overflow-hidden">
              <PanelHeader className="grid gap-8 text-center lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:text-left">
                <div className="lg:col-span-2">
                  <h1 className="max-w-5xl text-2xl font-black uppercase leading-[0.96] sm:text-8xl lg:text-8xl">
                    Техническое
                    <br />
                    образование?
                    <br />
                    <span className="text-acid justify-center">QLC.</span>
                  </h1>
                  <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/62 lg:mx-0">
                    Практические курсы по математике, программированию и запуску продуктов.
                    Каждый урок — это задача. Каждая задача — это шанс прокачать навык.
                  </p>
                  <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
                    <ButtonLink href="#courses">Смотреть курсы</ButtonLink>
                    <HomeHeroLoginButton />
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
                    title="Чёткая структура"
                    text="Вы сами выбираете, в каком порядке решать задачи. Выполните модуль и переходите к следующему."
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
                    Каталог
                  </p>
                  <h2 className="mt-2 text-3xl font-black uppercase sm:text-5xl">Доступные курсы</h2>
                </div>
                {!isEmpty && (
                  <span className="font-mono text-xs font-black uppercase text-white/40">
                    {courses.length} курс{courses.length === 1 ? "" : courses.length < 5 ? "а" : "ов"} · {totalLessons} уроков
                  </span>
                )}
              </div>

              {loadError ? (
                <Alert title="Каталог недоступен" tone="danger">
                  {loadError}
                </Alert>
              ) : isEmpty ? (
                <Panel muted>
                  <PanelBody className="grid gap-5 text-center">
                    <Alert title="Курсов пока нет" tone="warning">
                      В базе ещё нет курсов. Загляните позже.
                    </Alert>
                  </PanelBody>
                </Panel>
              ) : (
                <CourseList courses={courses} />
              )}
            </section>

            {/* Bottom CTA */}
            <HomeBottomAuthCTA />
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
