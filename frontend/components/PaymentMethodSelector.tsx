"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import type { PaymentMethodDto, PaymentMethodId, PaymentState } from "@/types";
import { addCourseToCart, getAuthToken, purchaseCart } from "@/services/api";

type PaymentMethodSelectorProps = {
  price: string;
  methods: PaymentMethodDto[];
  courseId: number;
  courseSlug: string;
  skipAddingToCart?: boolean;
};

export function PaymentMethodSelector({ methods, price, courseId, courseSlug, skipAddingToCart = false }: PaymentMethodSelectorProps) {
  const [method, setMethod] = useState<PaymentMethodId>(
    methods.find((item) => item.enabled)?.id ?? methods[0]?.id ?? "stars"
  );
  const [state, setState] = useState<PaymentState>("idle");
  const [error, setError] = useState<string>("");
  const router = useRouter();

  const selected = methods.find((item) => item.id === method) ?? methods[0];
  const isLoading = state === "loading";
  const isBusy = isLoading || state === "ready";
  const isEnabled = selected?.enabled ?? false;

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
      <fieldset className="grid gap-4" disabled={isBusy}>
        <legend className="w-full">
          <span className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-bold">Способ оплаты</span>
            <span className="rounded-full border border-acid/40 bg-acid/10 px-2.5 py-1 font-mono text-[10px] font-black uppercase text-acid">
              Тестовый режим
            </span>
          </span>
        </legend>
        <div className="grid gap-2">
          {methods.map((item) => {
            const isSelected = item.id === method;

            return (
              <label
                className={`grid min-h-20 cursor-pointer gap-3 rounded-2xl border p-4 text-left transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-acid ${
                  isSelected
                    ? "border-acid bg-acid text-ink shadow-[0_0_24px_rgba(184,255,53,0.16)]"
                    : item.enabled
                      ? "border-line bg-panel/95 text-white hover:border-white/25 hover:bg-white/[0.06]"
                      : "cursor-not-allowed border-line bg-white/[0.025] text-white/42"
                }`}
                key={item.id}
              >
                <input
                  checked={isSelected}
                  className="sr-only"
                  disabled={!item.enabled}
                  name="payment-method"
                  onChange={() => {
                    setMethod(item.id);
                    setState("idle");
                  }}
                  type="radio"
                  value={item.id}
                />
                <span className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={`grid h-4 w-4 place-items-center rounded-full border ${isSelected ? "border-current" : "border-white/35"}`}>
                      {isSelected && <span className="h-2 w-2 rounded-full bg-current" />}
                    </span>
                    <strong className="text-sm font-bold">{item.title}</strong>
                  </span>
                  <span className="shrink-0 rounded-full border border-current px-2 py-1 text-[10px] font-black uppercase">
                    {item.enabled ? item.tag : "Скоро"}
                  </span>
                </span>
                <span className={isSelected ? "text-xs text-ink/72" : "text-xs text-white/58"}>
                  {item.description}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <button
        aria-busy={isLoading}
        className="min-h-14 rounded-full border border-acid bg-acid px-5 text-sm font-bold text-ink transition hover:bg-white disabled:border-white/18 disabled:bg-white/8 disabled:text-white/38"
        disabled={isBusy || !isEnabled}
        onClick={handlePayment}
        type="button"
      >
        {!isEnabled && "Скоро"}
        {isLoading && "Открываем тестовый доступ"}
        {state === "ready" && "Доступ открыт"}
        {state === "error" && "Попробовать снова"}
        {isEnabled && state === "idle" && `Открыть доступ · ${price}`}
      </button>
      <span aria-live="polite" className="sr-only">
        {isLoading ? "Открываем тестовый доступ." : state === "ready" ? "Доступ открыт. Переходим в профиль." : ""}
      </span>
      {!getAuthToken() && (
        <p className="text-xs leading-relaxed text-white/48">
          Перед продолжением понадобится <Link className="text-acid underline underline-offset-4" href={`/login?redirectTo=${encodeURIComponent(`/checkout?course=${courseSlug}`)}`}>войти в аккаунт</Link>.
        </p>
      )}
      {error ? <p className="text-xs font-bold text-red-300" role="alert">{error}</p> : null}
    </div>
  );
}
