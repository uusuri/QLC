"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CourseArtwork } from "@/components/DesignKit";
import { PageState } from "@/components/PageState";
import { PaymentMethodSelector } from "@/components/PaymentMethodSelector";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ButtonLink } from "@/components/ui";
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

  return <div className="kit-shell"><SiteHeader /><main className="kit-page" id="main-content" tabIndex={-1}>
    <nav aria-label="Хлебные крошки" className="flex items-center gap-3 text-sm text-muted"><Link className="qlc-text-link" href="/courses">Курсы</Link><span>/</span><span aria-current="page">Корзина</span></nav>
    <h1>Оформление заказа</h1><p className="kit-lead">Проверьте выбранные курсы и откройте доступ к обучению.</p>
    <div className="kit-checkout"><section aria-label="Курсы в заказе"><h2 className="text-2xl">Ваш заказ · {coursesToPay.length}</h2>{coursesToPay.map(course => <article className="kit-order-item" key={course.slug}><CourseArtwork title={course.title} /><div className="min-w-0"><h2><Link href={`/courses/${course.slug}`}>{course.title}</Link></h2><p>{course.lessonsLabel}</p><p className="!text-paper">{course.price.formatted}</p></div></article>)}<Link className="qlc-text-link mt-5 text-muted" href="/courses">← Вернуться к курсам</Link></section>
    <aside className="kit-checkout-summary" aria-label="Итого и оплата"><h2 className="text-2xl">Итого</h2><p className="my-6 text-3xl">{displayPrice}</p><p className="mb-6 border-y border-line py-4 text-sm leading-6 text-muted"><strong className="text-paper">Тестовая оплата.</strong> Деньги не списываются, платёжные данные не требуются.</p>{needsPayment ? <PaymentMethodSelector courseId={requestedCourseId ?? parseCourseIdFromSlug(coursesToPay[0].slug) ?? 0} courseSlug={requestedCourseToAdd?.slug ?? coursesToPay[0].slug} methods={paymentMethods} price={displayPrice} skipAddingToCart={!requestedCourseToAdd} /> : <ButtonLink className="w-full" href="/profile">Перейти к обучению →</ButtonLink>}</aside></div>
  </main><SiteFooter /></div>;
}
