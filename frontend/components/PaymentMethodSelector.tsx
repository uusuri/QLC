"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import type { PaymentMethodDto, PaymentState } from "@/types";
import { addCourseToCart, getAuthToken, purchaseCart } from "@/services/api";

type PaymentMethodSelectorProps = {
  price: string;
  methods: PaymentMethodDto[];
  courseId: number;
  courseSlug: string;
  skipAddingToCart?: boolean;
};

export function PaymentMethodSelector({ methods, courseId, courseSlug, skipAddingToCart = false }: PaymentMethodSelectorProps) {
  const [state, setState] = useState<PaymentState>("idle");
  const [error, setError] = useState<string>("");
  const router = useRouter();

  const isLoading = state === "loading";
  const isBusy = isLoading || state === "ready";
  const isEnabled = methods.some(item => item.enabled);

  const handlePayment = async () => {
    if (!getAuthToken()) {
      router.push(`/login?redirectTo=${encodeURIComponent(`/checkout?course=${courseSlug}`)}`);
      return;
    }

    setState("loading");
    setError("");

    try {
      if (!skipAddingToCart) {
        await addCourseToCart(courseId);
      }
      await purchaseCart();
      setState("ready");
      window.setTimeout(() => {
        router.push("/profile");
      }, 900);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Оплата не удалась");
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3 text-sm"><span>Тестовый доступ</span><span className="kit-badge kit-tone-neutral">Без списания</span></div>

      <button
        aria-busy={isLoading}
        className="min-h-12 rounded-sm border border-acid bg-acid px-5 text-sm font-semibold text-ink transition hover:border-paper hover:bg-paper focus-visible:outline-white disabled:border-line disabled:bg-surface-raised disabled:text-muted"
        disabled={isBusy || !isEnabled}
        onClick={handlePayment}
        type="button"
      >
        {!isEnabled && "Скоро"}
        {isLoading && "Открываем тестовый доступ"}
        {state === "ready" && "Доступ открыт"}
        {state === "error" && "Попробовать снова"}
        {isEnabled && state === "idle" && "Открыть тестовый доступ →"}
      </button>
      <span aria-live="polite" className="sr-only">
        {isLoading ? "Открываем тестовый доступ." : state === "ready" ? "Доступ открыт. Переходим в профиль." : ""}
      </span>
      {!getAuthToken() && (
        <p className="text-xs leading-relaxed text-paper/60">
          Перед продолжением понадобится <Link className="font-bold text-[#B3ACFF] underline underline-offset-4" href={`/login?redirectTo=${encodeURIComponent(`/checkout?course=${courseSlug}`)}`}>войти в аккаунт</Link>.
        </p>
      )}
      {error ? <p className="text-xs font-bold text-[#FF8074]" role="alert">{error}</p> : null}
    </div>
  );
}
