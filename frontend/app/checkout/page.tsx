import Link from "next/link";

import { PaymentMethodSelector } from "@/components/PaymentMethodSelector";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Alert, ButtonLink } from "@/components/ui";
import { COURSE_ACCESS_COPY, getCourseCatalog, getPaymentMethods } from "@/services/api";
import type { CourseAccessStatus, CourseDto } from "@/types";

export const dynamic = "force-dynamic";

type CheckoutPageProps = {
  searchParams?: Promise<{
    course?: string;
  }>;
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  let courses: CourseDto[] = [];
  let loadError = "";

  try {
    courses = await getCourseCatalog();
  } catch {
    loadError = "Не удалось загрузить курс для оплаты. Проверь backend.";
  }

  if (loadError) {
    return (
      <CheckoutStatePage
        eyebrow="checkout / backend error"
        title="Оплата недоступна."
        text={loadError}
      />
    );
  }

  if (courses.length === 0) {
    return (
      <CheckoutStatePage
        eyebrow="checkout / empty catalog"
        title="Курсов пока нет."
        text="Курсов пока нет. Создай курс в /admin/content."
        actionHref="/admin/content"
        actionText="Перейти в админку"
      />
    );
  }

  const selectedCourse = courses.find((course) => course.slug === params?.course) ?? null;

  if (!selectedCourse) {
    return (
      <CheckoutStatePage
        eyebrow="checkout / not found"
        title="Курс не найден."
        text="Курс не найден. Вернись на главную и выбери курс."
      />
    );
  }

  const paymentMethods = await getPaymentMethods();
  const access = COURSE_ACCESS_COPY[selectedCourse.access];
  const needsPayment = selectedCourse.access === "locked";

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex-1 px-4 py-4 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-7xl">
          <SiteHeader />

          {loadError && (
            <Alert className="mb-4" title="backend error" tone="danger">
              {loadError}
            </Alert>
          )}

          <section className="mt-4 border border-line bg-ink/90">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-5 text-xs font-black uppercase sm:px-7">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-2 w-2 rounded-full bg-acid shadow-[0_0_12px_rgba(255,106,61,0.5)]" />
                <Link className="transition hover:text-acid" href="/">
                  Course Archive
                </Link>
              </div>
              <nav className="flex items-center gap-5 text-white/50">
                <Link className="transition hover:text-acid" href="/profile">
                  Профиль
                </Link>
                <Link className="transition hover:text-acid" href="/">
                  Витрина
                </Link>
              </nav>
            </header>

            <section className="grid border-b border-line lg:grid-cols-[1fr_440px]">
              <div className="grid gap-12 border-b border-line p-5 sm:p-7 lg:min-h-[620px] lg:border-b-0 lg:border-r">
                <div>
                  <p className="mb-5 text-xs font-black uppercase text-acid">
                    checkout / instant access
                  </p>
                  <h1 className="max-w-5xl text-5xl font-black uppercase leading-[1.02] sm:text-7xl lg:text-8xl">
                    Оплата курса.
                  </h1>
                  <p className="mt-5 max-w-xl text-base leading-relaxed text-white/58">
                    Мгновенный доступ после оплаты. Выбранный курс активируется в профиле,
                    а первый урок откроется сразу.
                  </p>
                </div>

                <div className="grid gap-px border border-line bg-line sm:grid-cols-3">
                  <AccessState state="open" active={selectedCourse.access === "open"} />
                  <AccessState state="locked" active={selectedCourse.access === "locked"} />
                  <AccessState state="pending" active={selectedCourse.access === "pending"} />
                </div>
              </div>

              <aside className="grid content-start p-5 sm:p-7">
                <div className="border border-line bg-panel/95 shadow-hud">
                  <div className="border-b border-line p-5">
                    <p className="text-xs font-black uppercase text-acid">{access.label}</p>
                    <h2 className="mt-4 text-3xl font-black uppercase leading-[1.04] sm:text-5xl">
                      {selectedCourse.title}
                    </h2>
                    <p className="mt-5 text-sm leading-snug text-white/58">
                      {selectedCourse.description}
                    </p>
                  </div>

                  <div className="grid gap-px border-b border-line bg-line sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <div className="bg-ink p-5">
                      <p className="text-[10px] font-black uppercase text-white/40">Цена</p>
                      <strong className="mt-3 block text-4xl font-black leading-none">
                        {selectedCourse.price.formatted}
                      </strong>
                      {selectedCourse.oldPrice.amount > selectedCourse.price.amount && (
                        <span className="mt-2 block text-xs font-bold text-white/36 line-through">
                          {selectedCourse.oldPrice.formatted}
                        </span>
                      )}
                    </div>
                    <div className="bg-ink p-5">
                      <p className="text-[10px] font-black uppercase text-white/40">Состав</p>
                      <strong className="mt-3 block text-4xl font-black leading-none text-acid">
                        {selectedCourse.lessonsLabel}
                      </strong>
                    </div>
                  </div>

                  <div className="grid gap-5 p-5">
                    <div className="border border-line p-4">
                      <p className="text-xs font-black uppercase text-white">{access.title}</p>
                      <p className="mt-3 text-xs leading-snug text-white/50">
                        {access.description}
                      </p>
                    </div>

                    {needsPayment ? (
                      <PaymentMethodSelector
                        methods={paymentMethods}
                        price={selectedCourse.price.formatted}
                      />
                    ) : (
                      <Link
                        className="inline-flex min-h-14 items-center justify-center border border-acid bg-acid px-5 text-xs font-black uppercase text-ink transition hover:bg-transparent hover:text-acid"
                        href="/profile"
                      >
                        Начать учиться
                      </Link>
                    )}
                  </div>
                </div>
              </aside>
            </section>

            <section className="p-5 sm:p-7">
              <p className="mb-4 font-mono text-xs font-black uppercase text-white/40">
                выбери другой курс
              </p>
              <div className="grid gap-px bg-line sm:grid-cols-3">
                {courses.map((course) => (
                  <Link
                    className={`grid gap-3 p-5 transition ${
                      course.slug === selectedCourse.slug
                        ? "bg-acid text-ink"
                        : "bg-ink text-white hover:bg-white/8"
                    }`}
                    href={`/checkout?course=${course.slug}`}
                    key={course.slug}
                  >
                    <span className="text-[10px] font-black uppercase opacity-70">
                      {COURSE_ACCESS_COPY[course.access].label}
                    </span>
                    <strong className="text-xl font-black uppercase leading-[1.04]">
                      {course.title}
                    </strong>
                    <span className="text-xs font-bold uppercase opacity-70">
                      {course.price.formatted}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </section>
        </section>
      </div>

      <div className="mx-auto max-w-7xl">
        <SiteFooter />
      </div>
    </main>
  );
}

function CheckoutStatePage({
  actionHref = "/",
  actionText = "На главную",
  eyebrow,
  text,
  title
}: {
  actionHref?: string;
  actionText?: string;
  eyebrow: string;
  text: string;
  title: string;
}) {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex-1 px-4 py-4 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-7xl">
          <SiteHeader />

          <section className="mt-4 grid min-h-[560px] content-center gap-6 border border-line bg-ink/90 p-5 sm:p-7">
            <p className="font-mono text-xs font-black uppercase text-acid">{eyebrow}</p>
            <h1 className="max-w-4xl text-5xl font-black uppercase leading-[1.02] sm:text-7xl">
              {title}
            </h1>
            <p className="max-w-2xl text-base font-bold uppercase leading-snug text-white/62">
              {text}
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={actionHref}>{actionText}</ButtonLink>
              <ButtonLink href="/" variant="secondary">
                Витрина
              </ButtonLink>
            </div>
          </section>
        </section>
      </div>

      <div className="mx-auto max-w-7xl">
        <SiteFooter />
      </div>
    </main>
  );
}

function AccessState({ state, active }: { state: CourseAccessStatus; active: boolean }) {
  const item = COURSE_ACCESS_COPY[state];

  return (
    <div className={active ? "bg-acid p-5 text-ink" : "bg-panel/95 p-5 text-white"}>
      <p className="text-[10px] font-black uppercase opacity-70">{item.label}</p>
      <div className="mt-6 flex items-center gap-3">
        <span
          aria-hidden="true"
          className={`inline-flex h-5 w-5 items-center justify-center border ${
            active ? "border-ink text-ink" : "border-current"
          } text-[10px] font-black`}
        >
          {active ? "✓" : "○"}
        </span>
        <h3 className="text-lg font-black uppercase leading-tight">{item.title}</h3>
      </div>
    </div>
  );
}
