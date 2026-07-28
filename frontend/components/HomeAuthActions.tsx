// Auth-зависимые CTA на главной: скрывают вход для уже авторизованных пользователей.
"use client";

import { useAuth } from "@/components/AuthProvider";
import { ButtonLink } from "@/components/ui";

export function HomeHeroLoginButton() {
  const { user } = useAuth();

  if (user) {
    return null;
  }

  return (
    <ButtonLink href="/login" variant="secondary">
      Войти в аккаунт
    </ButtonLink>
  );
}

export function HomeBottomAuthCTA() {
  const { user } = useAuth();

  if (user) {
    return null;
  }

  return (
    <section className="my-20 overflow-hidden rounded-[32px] bg-phosphor px-6 py-10 text-ink sm:px-10 sm:py-12">
      <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end">
        <div>
          <h2 className="max-w-xl text-3xl font-bold leading-tight tracking-[-0.04em] sm:text-5xl">
            Сохраняйте прогресс и продолжайте с любого устройства
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink/65">
            Создайте аккаунт или войдите через Telegram — это займёт меньше минуты.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <ButtonLink className="bg-ink text-white hover:bg-white hover:text-ink" href="/register">
            Создать аккаунт
          </ButtonLink>
          <ButtonLink className="bg-ink/10 text-ink hover:bg-ink hover:text-white" href="/login" variant="secondary">
            Войти
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
