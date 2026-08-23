// Auth-зависимые CTA на главной: скрывают вход для уже авторизованных пользователей.
"use client";

import { useAuth } from "@/components/AuthProvider";
import { ButtonLink } from "@/components/ui";

export function HomeHeroLoginButton() {
  const { loading, user } = useAuth();

  if (loading || user) {
    return null;
  }

  return (
    <ButtonLink className="w-full sm:w-auto" href="/login" variant="secondary">
      Войти в аккаунт
    </ButtonLink>
  );
}

export function HomeBottomAuthCTA() {
  const { loading, user } = useAuth();

  if (loading || user) {
    return null;
  }

  return (
    <section className="my-16 overflow-hidden rounded-[32px] bg-phosphor px-6 py-10 text-ink shadow-[0_28px_90px_rgba(184,255,53,0.14)] sm:my-20 sm:px-10 sm:py-12">
      <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
        <div>
          <p className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-ink/72">
            Один аккаунт — весь прогресс
          </p>
          <h2 className="max-w-xl text-3xl font-bold leading-tight tracking-[-0.04em] sm:text-5xl">
            Сохраняйте прогресс и продолжайте с любого устройства
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink/65">
            Создайте аккаунт или войдите через Telegram — это займёт меньше минуты.
          </p>
        </div>
        <div className="grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap">
          <ButtonLink className="w-full !bg-ink !text-white hover:!bg-white hover:!text-ink sm:w-auto" href="/register">
            Создать аккаунт
          </ButtonLink>
          <ButtonLink className="w-full !border-ink/20 !bg-ink/10 !text-ink hover:!bg-ink hover:!text-white sm:w-auto" href="/login" variant="secondary">
            Войти
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
