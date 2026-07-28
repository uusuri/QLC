import Link from "next/link";

import { CourseList } from "@/components/CourseList";
import { HomeContinueLearning } from "@/components/ContinueLearning";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { HomeBottomAuthCTA, HomeHeroLoginButton } from "@/components/HomeAuthActions";
import { Alert, ButtonLink, Panel, PanelBody, PanelHeader } from "@/components/ui";
import {
  formatCoursesLabel,
  formatLessonsLabel,
  formatRussianCountWord,
  getCourseCatalog
} from "@/services/api";
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
        <div className="mx-auto max-w-7xl">
          <SiteHeader />

          {loadError ? (
            <Alert className="mb-4" title="Ошибка загрузки" tone="danger">
              {loadError}
            </Alert>
          ) : null}

          <section className="mt-4 grid gap-8">
            <Panel className="overflow-hidden">
              <PanelHeader className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
                <div>
                  <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-acid">QLC / learning by doing</p>
                  <h1 className="mt-4 max-w-4xl text-4xl font-black uppercase leading-[0.98] sm:text-6xl lg:text-7xl">
                    Учитесь через
                    <span className="block text-acid">практику.</span>
                  </h1>
                  <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/62">
                    Выберите курс, проходите уроки по порядку и закрепляйте материал задачами прямо в браузере.
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <ButtonLink href="#courses">Выбрать курс</ButtonLink>
                    <HomeHeroLoginButton />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-1">
                  <HeroStat
                    value={String(courses.length)}
                    label={formatRussianCountWord(courses.length, ["курс", "курса", "курсов"])}
                  />
                  <HeroStat
                    value={String(totalLessons)}
                    label={formatRussianCountWord(totalLessons, ["урок", "урока", "уроков"])}
                  />
                  <HeroStat value="∞" label="попыток" />
                </div>
              </PanelHeader>
            </Panel>

            <HomeContinueLearning />

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
                    {formatCoursesLabel(courses.length)} · {formatLessonsLabel(totalLessons)}
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

      <div className="mx-auto max-w-7xl">
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
