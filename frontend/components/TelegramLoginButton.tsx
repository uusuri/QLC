"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { TelegramAuthPayload } from "@/types";

type TelegramWidgetUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

type TelegramLoginButtonProps = {
  disabled?: boolean;
  onAuth: (payload: TelegramAuthPayload) => Promise<void>;
  onError: (message: string) => void;
};

export function TelegramLoginButton({ disabled = false, onAuth, onError }: TelegramLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callbackName = `qlcTelegramAuth_${useId().replace(/[^A-Za-z0-9_]/g, "")}`;
  const [loading, setLoading] = useState(false);
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  useEffect(() => {
    if (!botUsername || !containerRef.current) {
      return;
    }

    const callback = async (user: TelegramWidgetUser) => {
      setLoading(true);
      try {
        await onAuth({
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username,
          photoUrl: user.photo_url,
          authDate: user.auth_date,
          hash: user.hash
        });
      } catch (error) {
        onError(error instanceof Error ? error.message : "Не удалось войти через Telegram.");
      } finally {
        setLoading(false);
      }
    };

    window[callbackName as keyof Window] = callback as never;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "0");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", `${callbackName}(user)`);
    containerRef.current.replaceChildren(script);

    return () => {
      delete window[callbackName as keyof Window];
    };
  }, [botUsername, callbackName, onAuth, onError]);

  if (!botUsername) {
    return (
      <p className="text-center font-mono text-xs font-bold leading-relaxed text-white/52">
        Telegram-вход появится после настройки бота.
      </p>
    );
  }

  return (
    <div className={disabled || loading ? "pointer-events-none opacity-50" : ""}>
      <div className="group relative min-h-14 overflow-hidden rounded-2xl border border-[#54a9e7]/70 bg-[#54a9e7] transition hover:border-white hover:bg-[#65b9f1] focus-within:outline focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-[#54a9e7]">
        <div aria-hidden="true" className="pointer-events-none relative flex min-h-14 items-center justify-center gap-3 px-5 text-ink">
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
            <path d="M21.4 3.4 18.2 20c-.2 1.2-.9 1.5-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.3L5.6 13.5.7 12c-1.1-.3-1.1-1 .2-1.5L20 3.1c.9-.3 1.7.2 1.4.3Z" />
          </svg>
          <span className="text-sm font-bold">Продолжить с Telegram</span>
        </div>
        <div
          aria-label="Войти через Telegram"
          className="absolute inset-0 [&_iframe]:!h-full [&_iframe]:!w-full [&_iframe]:!cursor-pointer [&_iframe]:opacity-0"
          ref={containerRef}
        />
      </div>
      {loading && <p className="mt-2 text-center text-xs text-white/54">Проверяем Telegram…</p>}
    </div>
  );
}
