import { BrandAtom } from "@/components/BrandAtom";
import { CourseList } from "@/components/CourseList";
import { HomeContinueLearning } from "@/components/ContinueLearning";
import { LearningOverviewProvider } from "@/components/LearningOverviewProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SignedOutOnly } from "@/components/SignedOutOnly";
import {
  TechBarcode,
  TechCrosshair,
  TechDotMatrix,
  TechRuler,
  TechStripes
} from "@/components/TechnicalMarks";
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
    <LearningOverviewProvider>
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
                  <SignedOutOnly>
                    <ButtonLink className="w-full sm:w-auto" href="/login" variant="secondary">
                      Войти в аккаунт
                    </ButtonLink>
                  </SignedOutOnly>
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

              <div className="qlc-packaging-split relative grid min-h-[320px] place-items-center overflow-hidden rounded-[32px] border border-white/8 p-4 shadow-[inset_0_0_80px_rgba(184,255,53,0.025)] sm:min-h-[430px]">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none overflow-hidden">
                  <span className="qlc-signal-rail absolute inset-x-0 top-0 h-1" />
                  <span className="absolute left-5 top-5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/46">
                    QLC / learning loop
                  </span>
                  <span className="qlc-tech-vertical absolute bottom-20 left-5 hidden font-mono text-[9px] font-black uppercase tracking-[0.22em] text-phosphor/45 sm:block">
                    Quantum learning core
                  </span>
                  <TechCrosshair className="right-8 top-9 text-white/22" />
                  <TechCrosshair className="bottom-9 left-[35%] hidden text-phosphor/28 sm:block" />
                  <TechDotMatrix className="bottom-5 left-5 text-phosphor/28" />
                  <TechBarcode className="absolute bottom-6 right-6 text-white/32" label="QLC-LOOP/270" />
                  <TechStripes className="absolute right-0 top-[42%] h-20 w-3 text-phosphor/45" />
                  <TechRuler className="absolute bottom-3 left-[23%] right-32 hidden text-white/12 sm:block" />
                </div>
                <div className="relative z-10 w-full">
                  <BrandAtom />
                </div>
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
                    className="group relative flex min-h-64 flex-col overflow-hidden rounded-[26px] border border-white/9 bg-white/[0.035] p-6 transition duration-300 hover:border-phosphor/30 hover:bg-white/[0.055] sm:p-7"
                    key={step.number}
                  >
                    <span aria-hidden="true" className="qlc-signal-rail absolute inset-x-0 top-0 h-1 opacity-70" />
                    <TechDotMatrix className="bottom-5 right-5 text-white/[0.07] transition group-hover:text-phosphor/10" />
                    <span aria-hidden="true" className="absolute -bottom-5 right-16 font-mono text-[92px] font-black leading-none tracking-[-0.12em] text-white/[0.025]">
                      {step.number}
                    </span>
                    <div className="relative z-10 flex items-center justify-between gap-4">
                      <span className="grid h-12 min-w-12 place-items-center rounded-2xl bg-phosphor/10 px-3 font-mono text-xs font-black text-phosphor">
                        {step.code}
                      </span>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white/46">
                        QLC / {step.number}
                      </span>
                    </div>
                    <h3 className="relative z-10 mt-8 text-2xl font-bold tracking-[-0.035em]">{step.title}</h3>
                    <p className="relative z-10 mt-3 text-sm leading-relaxed text-white/58">{step.text}</p>
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
                  <div className="flex items-end gap-5">
                    <TechBarcode className="hidden text-white/22 sm:inline-flex" label="QLC-CATALOG/ALL" />
                    <p className="max-w-xs text-sm leading-relaxed text-white/48">
                      Изучите программу до покупки. Оплата нужна только для доступа к урокам и задачам.
                    </p>
                  </div>
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

            <SignedOutOnly>
              <section className="relative my-16 overflow-hidden rounded-[32px] bg-phosphor px-6 py-10 text-ink shadow-[0_28px_90px_rgba(184,255,53,0.14)] sm:my-20 sm:px-10 sm:py-12">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none overflow-hidden">
                  <span className="qlc-signal-rail absolute inset-x-0 top-0 h-1.5" />
                  <span className="absolute inset-y-0 right-0 hidden w-[34%] border-l border-ink/10 bg-[#f4f5ec]/45 lg:block" />
                  <span className="absolute -bottom-3 right-[30%] hidden text-[88px] font-black leading-none tracking-[-0.09em] text-ink/[0.045] lg:block">
                    QLC//ACCESS
                  </span>
                  <TechCrosshair className="right-7 top-7 hidden text-ink/28 sm:block" />
                  <TechDotMatrix className="right-7 top-20 hidden text-ink/18 lg:block" />
                  <TechBarcode className="absolute right-7 top-36 hidden text-ink/32 lg:inline-flex" label="QLC-ACCESS/OPEN" />
                  <TechStripes className="absolute bottom-0 left-[44%] h-4 w-24 text-ink/42" />
                </div>
                <div className="relative z-10 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
                  <div>
                    <p className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-ink/72">
                      Один аккаунт — весь прогресс
                    </p>
                    <h2 className="max-w-xl text-3xl font-bold leading-tight tracking-[-0.04em] sm:text-5xl">
                      Сохраняйте прогресс и продолжайте с любого устройства
                    </h2>
                    <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink/65">
                      Создайте аккаунт или войдите через Telegram — это займёт меньше минуты.
                    </p>
                  </div>
                  <div className="grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap">
                    <ButtonLink className="w-full !border-ink !bg-ink !text-white hover:!border-white hover:!bg-white hover:!text-ink focus-visible:!outline-ink sm:w-auto" href="/register">
                      Создать аккаунт
                    </ButtonLink>
                    <ButtonLink className="w-full !border-ink/20 !bg-ink/10 !text-ink hover:!bg-ink hover:!text-white focus-visible:!outline-ink sm:w-auto" href="/login" variant="secondary">
                      Войти
                    </ButtonLink>
                  </div>
                </div>
              </section>
            </SignedOutOnly>
          </section>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1344px] px-4 sm:px-6 lg:px-8">
        <SiteFooter />
      </div>
    </main>
    </LearningOverviewProvider>
  );
}
