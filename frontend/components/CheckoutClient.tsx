"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PageState } from "@/components/PageState";
import { PaymentMethodSelector } from "@/components/PaymentMethodSelector";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ButtonLink, Panel, PanelBody, PanelHeader, StatusBadge } from "@/components/ui";
import { getAuthToken, getCart, parseCourseIdFromSlug } from "@/services/api";
import type { CourseDto, PaymentMethodDto } from "@/types";

type CheckoutClientProps = {
  courses: CourseDto[];
  paymentMethods: PaymentMethodDto[];
  requestedCourseSlug?: string;
};

type CartState = "loading" | "ready" | "guest" | "error";

function formatTotal(amount: number) {
  return new Intl.NumberFormat("ru-RU", {
    currency: "RUB",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(amount);
}

export function CheckoutClient({ courses, paymentMethods, requestedCourseSlug }: CheckoutClientProps) {
  const [cartIds, setCartIds] = useState<number[]>([]);
  const [state, setState] = useState<CartState>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAuthToken()) {
      setState("guest");
      return;
    }

    let active = true;
    getCart()
      .then((cart) => {
        if (!active) return;
        setCartIds(cart.courseIds);
        setState("ready");
      })
      .catch((reason) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Не удалось загрузить корзину.");
        setState("error");
      });

    return () => {
      active = false;
    };
  }, []);

  const cartCourses = useMemo(
    () => courses.filter((course) => {
      const id = parseCourseIdFromSlug(course.slug);
      return id !== null && cartIds.includes(id);
    }),
    [cartIds, courses]
  );
  const requestedCourse = courses.find((course) => course.slug === requestedCourseSlug);
  const requestedCourseId = requestedCourse ? parseCourseIdFromSlug(requestedCourse.slug) : null;
  const requestedCourseIsInCart = requestedCourseId !== null && cartIds.includes(requestedCourseId);
  const requestedCourseToAdd = requestedCourse && requestedCourseId !== null && !requestedCourseIsInCart
    ? requestedCourse
    : null;
  const coursesToPay = requestedCourseToAdd ? [...cartCourses, requestedCourseToAdd] : cartCourses;
  const checkoutTarget = requestedCourseSlug
    ? `/checkout?course=${encodeURIComponent(requestedCourseSlug)}`
    : "/checkout";

  if (state === "loading") return <PageState eyebrow="Корзина" title="Загружаем корзину" text="Проверяем сохранённые курсы." />;
  if (state === "guest") {
    return <PageState eyebrow="Корзина" actionHref={`/login?redirectTo=${encodeURIComponent(checkoutTarget)}`} actionText="Войти" title="Войдите, чтобы открыть корзину" text="Корзина привязана к вашему аккаунту и будет сохранена между устройствами." />;
  }
  if (state === "error") return <PageState eyebrow="Корзина" title="Не удалось открыть корзину" text={error} />;
  if (coursesToPay.length === 0) {
    return <PageState eyebrow="Корзина" title="Корзина пуста" text="Добавьте курс на витрине — он сохранится здесь даже после обновления страницы." />;
  }

  const needsPayment = coursesToPay.some((course) => course.access === "locked");
  const displayTotal = coursesToPay.reduce((sum, course) => sum + course.price.amount, 0);
  const displayPrice = coursesToPay.length > 1 ? formatTotal(displayTotal) : coursesToPay[0].price.formatted;

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex-1 px-4 py-4 sm:px-6 lg:px-8">
        <SiteHeader />
        <section className="mx-auto max-w-7xl">
          <section className="mt-6 overflow-clip rounded-[28px] border border-line bg-white/[0.025]" id="main-content" tabIndex={-1}>
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4 text-xs font-black uppercase sm:px-7">
              <div className="flex items-center gap-3"><span className="inline-flex h-2 w-2 rounded-full bg-acid shadow-[0_0_12px_rgba(184,255,53,0.5)]" /><Link className="transition hover:text-acid" href="/">Курсы</Link><span className="text-white/25">/</span><span className="text-white/48">Корзина</span></div>
              <Link className="text-white/50 transition hover:text-acid" href="/profile">Моё обучение</Link>
            </header>
            <section className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:p-8">
              <div className="grid gap-6">
                <div>
                  <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-acid">Корзина</p>
                  <h1 className="mt-3 text-4xl font-bold leading-[1.02] tracking-[-0.04em] sm:text-6xl">Ваш заказ</h1>
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/58">Выбранные курсы хранятся в аккаунте. Можно вернуться позже — состав заказа никуда не исчезнет.</p>
                </div>
                <div className="grid gap-3">
                  {coursesToPay.map((course) => <CourseItem course={course} key={course.slug} />)}
                </div>
                <div className="grid gap-px border border-line bg-line sm:grid-cols-3">
                  <CheckoutStep number="01" title="Корзина" text="Курсы сохранены в аккаунте." />
                  <CheckoutStep number="02" title="Подтвердите" text="Проверьте сумму и способ оплаты." />
                  <CheckoutStep number="03" title="Начинайте" text="Доступ появится в профиле." />
                </div>
                <ButtonLink href="/" variant="secondary">Продолжить выбирать курсы</ButtonLink>
              </div>
              <aside className="lg:sticky lg:top-24">
                <div className="border border-line bg-panel/95 shadow-hud">
                  <div className="border-b border-line p-5"><p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/42">Итого · {coursesToPay.length}</p><strong className="mt-3 block text-4xl font-black leading-none">{displayPrice}</strong></div>
                  <div className="grid gap-5 p-5">
                    {needsPayment ? <PaymentMethodSelector courseId={requestedCourseId ?? parseCourseIdFromSlug(coursesToPay[0].slug) ?? 0} courseSlug={requestedCourseToAdd?.slug ?? coursesToPay[0].slug} methods={paymentMethods} price={displayPrice} skipAddingToCart={!requestedCourseToAdd} /> : <Link className="inline-flex min-h-14 items-center justify-center border border-acid bg-acid px-5 text-xs font-black uppercase text-ink transition hover:bg-transparent hover:text-acid" href="/profile">Перейти к обучению</Link>}
                    <p className="text-xs leading-relaxed text-white/42">Тестовый checkout не списывает деньги и не передаёт платёжные данные сторонним сервисам.</p>
                  </div>
                </div>
              </aside>
            </section>
          </section>
        </section>
      </div>
      <div className="mx-auto w-full max-w-[1344px] px-4 sm:px-6 lg:px-8"><SiteFooter /></div>
    </main>
  );
}

function CourseItem({ course }: { course: CourseDto }) {
  return <Panel muted><PanelHeader className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between"><div className="min-w-0"><p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-acid">В заказе</p><h2 className="mt-2 [overflow-wrap:anywhere] text-2xl font-black uppercase leading-tight">{course.title}</h2></div><StatusBadge tone={course.access === "locked" ? "warning" : "success"}>{course.access === "locked" ? "В заказе" : "Доступен"}</StatusBadge></PanelHeader><PanelBody className="grid gap-4"><p className="[overflow-wrap:anywhere] text-sm leading-relaxed text-white/60">{course.description}</p><div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"><span className="font-mono text-xs font-black uppercase text-white/45">{course.lessonsLabel} · доступ навсегда</span><strong className="text-xl font-black text-acid">{course.price.formatted}</strong></div></PanelBody></Panel>;
}

function CheckoutStep({ number, text, title }: { number: string; text: string; title: string }) {
  return <div className="bg-panel/80 p-4"><span className="font-mono text-xs font-black text-acid">{number}</span><h3 className="mt-5 text-sm font-black uppercase">{title}</h3><p className="mt-2 text-xs leading-relaxed text-white/48">{text}</p></div>;
}
