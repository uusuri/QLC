// Директива Next.js: компонент выполняется в браузере.
// Она нужна, потому что ниже есть useState и onClick.
"use client";

// useState хранит состояние mock-авторизации.
import { useState } from "react";

// Тип состояния login-кнопки общий для проекта.
import type { LoginState } from "@/types";

// Компонент кнопки входа через Telegram.
export function TelegramLoginButton() {
  // state хранит текущий текст/режим кнопки.
  const [state, setState] = useState<LoginState>("idle");

  // Обработчик клика по кнопке.
  const handleTelegramLogin = () => {
    // Сразу показываем загрузку.
    setState("loading");

    // TODO: Интегрировать с бэком, когда появится эндпоинт авторизации через Telegram.
    // TODO: заменить mock на Telegram Login Widget или Telegram WebApps API.
    // Сейчас это имитация задержки будущей авторизации.
    window.setTimeout(() => {
      // После задержки показываем mock-успех.
      setState("ready");
    }, 1100);
  };

  // Удобный boolean для состояния загрузки.
  const isLoading = state === "loading";

  // Удобный boolean для состояния mock-успеха.
  const isReady = state === "ready";

  // Возвращаем кнопку Telegram-входа.
  return (
    <button
      // Явное имя кнопки для screen reader.
      aria-label="Войти через Telegram"
      // Просим screen reader озвучивать изменения текста.
      aria-live="polite"
      // Сетка кнопки: иконка слева, текст по центру, подпись Launch справа.
      className="group grid min-h-14 w-full grid-cols-[44px_1fr_auto] items-center border border-acid bg-acid text-left text-ink transition hover:bg-transparent hover:text-acid disabled:cursor-wait sm:min-h-16"
      // Во время загрузки кнопку нельзя нажимать повторно.
      disabled={isLoading}
      // Запускаем mock-авторизацию.
      onClick={handleTelegramLogin}
      // type="button" не дает кнопке отправлять форму.
      type="button"
    >
      {/* Левая ячейка с иконкой Telegram. */}
      <span className="flex h-full items-center justify-center border-r border-ink/30 transition group-hover:border-acid/50">
        {/* SVG-иконка Telegram. */}
        <TelegramMark />
      </span>

      {/* Центральный текст кнопки меняется в зависимости от state. */}
      <span className="px-4 text-xs font-black uppercase tracking-wide sm:text-sm">
        {/* Текст во время загрузки. */}
        {isLoading && "Подключаем Telegram"}
        {/* Текст после mock-успеха. */}
        {isReady && "Mock-вход готов"}
        {/* Текст по умолчанию. */}
        {state === "idle" && "Войти через Telegram"}
      </span>

      {/* Правая техническая подпись; aria-hidden скрывает ее от screen reader. */}
      <span
        aria-hidden="true"
        className="pr-4 font-mono text-[10px] font-bold uppercase opacity-70"
      >
        {/* Во время загрузки показываем ..., иначе Launch. */}
        {isLoading ? "..." : "Launch"}
      </span>
    </button>
  );
}

// SVG-иконка Telegram.
function TelegramMark() {
  // Возвращаем inline-svg, чтобы цвет наследовался через currentColor.
  return (
    <svg
      // Иконка декоративная, название уже есть на кнопке.
      aria-hidden="true"
      // Размер иконки.
      className="h-5 w-5"
      // fill none оставляет только stroke-линии.
      fill="none"
      // viewBox задает систему координат SVG.
      viewBox="0 0 24 24"
      // XML namespace SVG.
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Основной контур бумажного самолетика. */}
      <path
        d="M20 4.6 3.7 10.9c-1.1.4-1.1 1.1-.2 1.4l4.2 1.3 1.6 5c.2.6.3.8.7.8.3 0 .5-.1.8-.4l2-1.9 4.1 3c.8.4 1.3.2 1.5-.7L21 5.8c.3-1.1-.4-1.6-1-1.2Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      {/* Внутренняя линия самолетика. */}
      <path d="m7.8 13.6 9.6-6.1-7.5 7.8" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
