"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
    setError("");

    if (!getAuthToken()) {
      router.push(`/login?redirectTo=${encodeURIComponent("/")}`);
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

  if (state === "added") {
    return (
      <Link
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-phosphor px-6 text-sm font-semibold text-ink transition hover:bg-white"
        href={`/checkout?course=${courseSlug}`}
      >
        Оплатить
      </Link>
    );
  }

  return (
    <>
      <Button
        disabled={state === "loading"}
        loading={state === "loading"}
        onClick={handleClick}
        variant="primary"
      >
        В корзину
      </Button>
      {error ? <p className="mt-2 text-xs font-bold text-red-300">{error}</p> : null}
    </>
  );
}
