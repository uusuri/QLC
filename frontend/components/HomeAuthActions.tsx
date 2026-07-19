// Auth-зависимые CTA на главной: скрывают вход для уже авторизованных пользователей.
"use client";

import { useAuth } from "@/components/AuthProvider";
import { ButtonLink, Panel, PanelBody } from "@/components/ui";

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
    <Panel muted>
      <PanelBody className="flex flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-acid">
            next step
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase sm:text-3xl">
            Готов начать обучение?
          </h2>
          <p className="mt-2 text-sm text-white/58">
            Авторизуйся, чтобы сохранять прогресс и отправлять решения на проверку.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <ButtonLink href="/register">Создать аккаунт</ButtonLink>
          <ButtonLink href="/login" variant="secondary">
            Войти
          </ButtonLink>
        </div>
      </PanelBody>
    </Panel>
  );
}
