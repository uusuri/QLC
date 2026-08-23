import { BrandAtom } from "@/components/BrandAtom";
import { CourseList } from "@/components/CourseList";
import { HomeContinueLearning } from "@/components/ContinueLearning";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { HomeBottomAuthCTA, HomeHeroLoginButton } from "@/components/HomeAuthActions";
import { Alert, ButtonLink } from "@/components/ui";
import { formatRussianCountWord, getCourseCatalog } from "@/services/api";
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
  const totalLessons = courses.reduce((sum, course) => sum + course.lessonsCount, 0);
  const learningSteps = [
    {
      code: "READ",
      number: "01",
      text: "Короткий материал объясняет ровно то, что понадобится в задаче.",
      title: "Разберите идею"
    },
    {
      code: "{ }",
      number: "02",
      text: "Пишите решение прямо в уроке — контекст и редактор всегда рядом.",
      title: "Напишите код"
    },
    {
      code: "OK",
      number: "03",
      text: "Отправьте ответ, получите результат и сразу поймите следующий шаг.",
      title: "Получите проверку"
    }
  ];
  const metrics = [
    {
      label: totalLessons > 0
        ? formatRussianCountWord(totalLessons, ["урок в каталоге", "урока в каталоге", "уроков в каталоге"])
        : "уроки в каталоге",
      value: totalLessons > 0 ? String(totalLessons) : "—"
    },
    {
      label: courses.length > 0
        ? formatRussianCountWord(courses.length, ["курс и трек", "курса и трека", "курсов и треков"])
        : "курсы и треки",
      value: courses.length > 0 ? String(courses.length) : "—"
    },
    { label: "понятных шага в каждом уроке", value: "3" }
  ];

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex-1 px-4 sm:px-6 lg:px-8">
        <SiteHeader />
        <div className="mx-auto max-w-7xl">
          <section id="main-content" tabIndex={-1}>
            <section className="relative grid items-center gap-10 py-12 sm:py-16 lg:py-20 xl:min-h-[640px] xl:grid-cols-[1.08fr_0.92fr]">
              <div className="max-w-3xl">
                <div className="flex items-center gap-4">
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-phosphor">
                    Учёба, в которой вы пишете код
                  </p>
                  <span aria-hidden="true" className="qlc-hero-signal hidden sm:block">
                    <span className="qlc-hero-signal__dot" />
                  </span>
                </div>

                <h1 className="mt-5 text-[clamp(3.05rem,8.5vw,6rem)] font-bold leading-[0.92] tracking-[-0.06em] lg:text-7xl xl:text-[clamp(4rem,6vw,6rem)]">
                  Понятная теория.
                  <span className="block text-white/42">Много практики.</span>
                </h1>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-white/68 sm:text-lg">
                  Осваивайте программирование по шагам: короткий материал, задача и проверка решения — в одном окне.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <ButtonLink className="w-full sm:w-auto" href="#courses">Выбрать курс</ButtonLink>
                  <HomeHeroLoginButton />
                </div>

                <dl className="mt-10 grid grid-cols-2 gap-x-5 gap-y-6 border-t border-white/10 pt-6 sm:grid-cols-3">
                  {metrics.map((metric) => (
                    <div key={metric.label}>
                      <dt className="text-2xl font-black tracking-[-0.04em] text-phosphor sm:text-3xl">
                        {metric.value}
                      </dt>
                      <dd className="mt-1 max-w-36 text-sm leading-snug text-white/52">
                        {metric.label}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="relative grid min-h-[320px] place-items-center overflow-hidden rounded-[32px] border border-white/8 bg-white/[0.025] p-4 shadow-[inset_0_0_80px_rgba(184,255,53,0.025)] sm:min-h-[430px]">
                <span aria-hidden="true" className="absolute left-5 top-5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/38">
                  QLC / learning loop
                </span>
                <BrandAtom />
              </div>
            </section>

            <div className="py-4 sm:py-6">
              <HomeContinueLearning />
            </div>

            <section className="scroll-mt-32 border-y border-white/8 py-16 sm:py-20" id="how">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-phosphor">
                Как устроено обучение
              </p>
              <h2 className="mt-3 max-w-3xl text-4xl font-bold tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                Один понятный цикл — от идеи до результата
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/60">
                Каждый урок повторяет одну и ту же логику. Вы не ищете, что делать дальше: следующий шаг всегда перед глазами.
              </p>

              <ol className="mt-10 grid gap-4 lg:grid-cols-3">
                {learningSteps.map((step, index) => (
                  <li
                    className="group relative flex min-h-64 flex-col rounded-[26px] border border-white/9 bg-white/[0.035] p-6 transition duration-300 hover:border-phosphor/30 hover:bg-white/[0.055] sm:p-7"
                    key={step.number}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="grid h-12 min-w-12 place-items-center rounded-2xl bg-phosphor/10 px-3 font-mono text-xs font-black text-phosphor">
                        {step.code}
                      </span>
                      <span className="font-mono text-sm font-bold text-white/60">{step.number}</span>
                    </div>
                    <h3 className="mt-8 text-2xl font-bold tracking-[-0.035em]">{step.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/58">{step.text}</p>
                    {index < learningSteps.length - 1 ? (
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-3 left-1/2 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full bg-ink font-mono text-phosphor lg:-right-5 lg:bottom-auto lg:left-auto lg:top-1/2 lg:-translate-y-1/2 lg:translate-x-0"
                      >
                        <span className="rotate-90 lg:rotate-0">→</span>
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>

            <section className="scroll-mt-32 py-16 sm:py-20" id="courses">
              <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-phosphor">
                    Каталог курсов
                  </p>
                  <h2 className="mt-3 text-4xl font-bold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                    Выберите, с чего начать
                  </h2>
                </div>
                {!loadError && !isEmpty ? (
                  <p className="max-w-xs text-sm leading-relaxed text-white/48">
                    Изучите программу до покупки. Оплата нужна только для доступа к урокам и задачам.
                  </p>
                ) : null}
              </div>

              {loadError ? (
                <Alert title="Каталог временно недоступен" tone="danger">
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

      <div className="mx-auto w-full max-w-[1344px] px-4 sm:px-6 lg:px-8">
        <SiteFooter />
      </div>
    </main>
  );
}
