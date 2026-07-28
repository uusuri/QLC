import { BrandAtom } from "@/components/BrandAtom";
import { CourseList } from "@/components/CourseList";
import { HomeContinueLearning } from "@/components/ContinueLearning";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { HomeBottomAuthCTA, HomeHeroLoginButton } from "@/components/HomeAuthActions";
import { Alert, ButtonLink } from "@/components/ui";
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

  const isEmpty = courses.length === 0;

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex-1 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SiteHeader />

          {loadError ? (
            <Alert className="mt-6" title="Ошибка загрузки" tone="danger">
              {loadError}
            </Alert>
          ) : null}

          <section>
            <section className="relative grid min-h-[680px] items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
              <div
                aria-hidden="true"
                className="absolute right-8 top-10 hidden lg:block"
              >
                <span className="qlc-hero-signal">
                  <span className="qlc-hero-signal__dot" />
                </span>
              </div>

              <div className="max-w-3xl">
                <p className="mb-5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-phosphor">
                  Учёба, в которой вы пишете код
                </p>
                <h1 className="text-5xl font-bold leading-[0.94] tracking-[-0.055em] sm:text-7xl lg:text-[88px]">
                  Понятная теория.
                  <span className="block text-white/38">Много практики.</span>
                </h1>
                <p className="mt-7 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
                  Осваивайте программирование по шагам: короткий материал, задача и проверка решения — в одном окне.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <ButtonLink href="#courses">Выбрать курс</ButtonLink>
                  <HomeHeroLoginButton />
                </div>
              </div>

              <BrandAtom />
            </section>

            <div className="pt-10">
              <HomeContinueLearning />
            </div>

            <section className="scroll-mt-24 py-20" id="courses">
              <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-phosphor">
                    Каталог курсов
                  </p>
                  <h2 className="mt-3 text-4xl font-bold tracking-[-0.04em] sm:text-6xl">
                    Выберите, с чего начать
                  </h2>
                </div>
              </div>

              {loadError ? (
                <Alert title="Каталог недоступен" tone="danger">
                  {loadError}
                </Alert>
              ) : isEmpty ? (
                <Alert title="Курсов пока нет" tone="warning">
                  В базе ещё нет курсов. Загляните позже.
                </Alert>
              ) : (
                <CourseList courses={courses} />
              )}
            </section>

            <HomeBottomAuthCTA />
          </section>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SiteFooter />
      </div>
    </main>
  );
}
