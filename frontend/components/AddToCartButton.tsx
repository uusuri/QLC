"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui";
import { addCourseToCart, getAuthToken } from "@/services/api";
import { cn } from "@/utils/cn";

type AddToCartButtonProps = {
  className?: string;
  courseId: number;
  courseSlug: string;
};

export function AddToCartButton({ className, courseId, courseSlug }: AddToCartButtonProps) {
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
        className={cn("w-full", className)}
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
      {error ? (
        <p className="mt-2 text-xs font-bold text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
