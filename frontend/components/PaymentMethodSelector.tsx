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
  const [method, setMethod] = useState<PaymentMethodId>(methods[0]?.id ?? "stars");
  const [state, setState] = useState<PaymentState>("idle");
  const [error, setError] = useState<string>("");
  const router = useRouter();

  const selected = methods.find((item) => item.id === method) ?? methods[0];
  const isLoading = state === "loading";
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
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black uppercase">Способ оплаты</h3>
        <span className="border border-acid/40 bg-acid/10 px-2 py-1 font-mono text-[10px] font-black uppercase text-acid">
          Тестовый режим
        </span>
      </div>
      <div className="grid gap-px border border-line bg-line">
        {methods.map((item) => {
          const isSelected = item.id === method;

          return (
            <button
              className={`grid gap-3 border border-transparent p-4 text-left transition focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-acid ${
                isSelected
                  ? "border-acid bg-acid text-ink shadow-[0_0_24px_rgba(255,106,61,0.18)]"
                  : "bg-panel/95 text-white hover:border-white/18 hover:bg-white/8"
              }`}
              key={item.id}
              onClick={() => {
                setMethod(item.id);
                setState("idle");
              }}
              type="button"
            >
              <span className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-3">
                  <span className={`grid h-4 w-4 place-items-center rounded-full border ${isSelected ? "border-current" : "border-white/35"}`}>
                    {isSelected && <span className="h-2 w-2 rounded-full bg-current" />}
                  </span>
                  <strong className="text-sm font-black uppercase">{item.title}</strong>
                </span>
                <span className="border border-current px-2 py-1 text-[10px] font-black uppercase">
                  {item.tag}
                </span>
              </span>
              <span className={isSelected ? "text-xs text-ink/72" : "text-xs text-white/50"}>
                {item.description}
              </span>
            </button>
          );
        })}
      </div>

      <button
        className="min-h-14 border border-acid bg-acid px-5 text-xs font-black uppercase tracking-[0.18em] text-ink transition hover:bg-transparent hover:text-acid disabled:border-white/18 disabled:bg-white/8 disabled:text-white/32"
        disabled={isLoading || !isEnabled}
        onClick={handlePayment}
        type="button"
      >
        {!isEnabled && "Скоро"}
        {isLoading && "Открываем тестовый доступ"}
        {state === "ready" && "Доступ открыт"}
        {state === "error" && "Попробовать снова"}
        {isEnabled && state === "idle" && `Открыть доступ · ${price}`}
      </button>
      {!getAuthToken() && (
        <p className="text-xs leading-relaxed text-white/48">
          Перед продолжением понадобится <Link className="text-acid underline underline-offset-4" href={`/login?redirectTo=${encodeURIComponent(`/checkout?course=${courseSlug}`)}`}>войти в аккаунт</Link>.
        </p>
      )}
      {error ? <p className="text-xs font-bold text-red-300">{error}</p> : null}
    </div>
  );
}
