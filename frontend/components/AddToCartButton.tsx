"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { addCourseToCart, getAuthToken } from "@/services/api";
import { Button } from "@/components/ui";

type AddToCartButtonProps = {
  courseId: number;
  courseSlug: string;
};

export function AddToCartButton({ courseId, courseSlug }: AddToCartButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "added" | "error">("idle");
  const [error, setError] = useState<string>("");

  const handleClick = async () => {
    if (state === "added") {
      router.push(`/checkout?course=${courseSlug}`);
      return;
    }

    setError("");

    if (!getAuthToken()) {
      router.push(`/login?redirectTo=${encodeURIComponent(`/checkout?course=${courseSlug}`)}`);
      return;
    }

    setState("loading");

    try {
      await addCourseToCart(courseId);
      setState("added");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Не удалось добавить в корзину");
    }
  };

  return (
    <>
      <Button
        aria-busy={state === "loading"}
        className="w-full"
        disabled={state === "loading"}
        loading={state === "loading"}
        onClick={handleClick}
        variant="primary"
      >
        {state === "added" ? "Перейти к оплате" : state === "error" ? "Попробовать снова" : "В корзину"}
      </Button>
      <span aria-live="polite" className="sr-only">
        {state === "added" ? "Курс добавлен в корзину. Можно перейти к оплате." : ""}
      </span>
      {error ? <p className="mt-2 text-xs font-bold text-red-300" role="alert">{error}</p> : null}
    </>
  );
}
