"use client";
import { PageState } from "@/components/PageState";
import { Button } from "@/components/ui";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PageState eyebrow="Ошибка" title="Не удалось открыть страницу" text="Попробуйте ещё раз. Сохранённые на устройстве черновики останутся на месте." showPrimaryAction={false}><Button onClick={reset}>Попробовать снова →</Button></PageState>;
}
