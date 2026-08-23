"use client";

// Link нужен для кнопок-ссылок, которые ведут между страницами Next.js без reload.
import Link from "next/link";

// ReactNode описывает любой JSX-контент внутри кнопки.
import type { ButtonHTMLAttributes, ReactNode } from "react";

// Варианты кнопки зафиксированы UI-kit карточкой S2-FE-01.
export type ButtonVariant = "primary" | "secondary" | "danger";

// Общие props для визуального состояния кнопки.
type ButtonVisualProps = {
  // children — текст или иконка внутри кнопки.
  children: ReactNode;
  // className позволяет точечно добавлять layout-классы без смены базового вида.
  className?: string;
  // loading визуально и функционально блокирует действие.
  loading?: boolean;
  // variant выбирает цветовую схему.
  variant?: ButtonVariant;
};

// Props обычной HTML-кнопки.
type ButtonProps = ButtonVisualProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    // type по умолчанию button, чтобы случайно не отправлять формы.
    type?: "button" | "submit" | "reset";
  };

// Props кнопки-ссылки.
type ButtonLinkProps = ButtonVisualProps & {
  // disabled для ссылки делает ее визуально и семантически недоступной.
  disabled?: boolean;
  // href — адрес перехода.
  href: string;
};

// Склеивает className без внешней зависимости clsx.
function cn(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

// Возвращает Tailwind-классы для выбранного варианта.
function getVariantClassName(variant: ButtonVariant) {
  if (variant === "danger") {
    return "border border-red-300/20 bg-red-400/12 text-red-100 hover:border-red-300/50 hover:bg-red-400 hover:text-ink";
  }

  if (variant === "secondary") {
    return "border border-white/10 bg-white/[0.055] text-white/86 hover:border-phosphor/35 hover:bg-white/[0.1] hover:text-white";
  }

  return "relative border border-phosphor bg-phosphor text-ink shadow-acid hover:border-white hover:bg-white";
}

// Общий набор классов: рубленая геометрия, видимый focus, disabled/loading.
function getButtonClassName({
  className,
  disabled,
  variant
}: {
  className?: string;
  disabled?: boolean;
  variant: ButtonVariant;
}) {
  return cn(
    "group isolate inline-flex min-h-12 items-center justify-center gap-2 overflow-hidden rounded-full px-6 text-sm font-semibold transition duration-200 motion-safe:hover:-translate-y-0.5",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-phosphor",
    "disabled:cursor-not-allowed disabled:border-white/8 disabled:bg-white/8 disabled:text-white/38 disabled:hover:translate-y-0",
    disabled && "pointer-events-none cursor-not-allowed opacity-55",
    getVariantClassName(variant),
    className
  );
}

// Унифицированная кнопка для форм и действий.
export function Button({
  children,
  className,
  disabled,
  loading = false,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  // loading тоже блокирует кнопку, чтобы не было двойного submit.
  const isDisabled = disabled || loading;

  return (
    <button
      className={getButtonClassName({ className, disabled: isDisabled, variant })}
      disabled={isDisabled}
      type={type}
      {...props}
    >
      {loading && (
        <span aria-hidden="true" className="animate-spin">
          ↻
        </span>
      )}
      <span>{children}</span>
      {variant === "primary" && !isDisabled && (
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-0 transition-opacity group-hover:opacity-100"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)"
          }}
          suppressHydrationWarning
        />
      )}
    </button>
  );
}

// Унифицированная кнопка-ссылка.
export function ButtonLink({
  children,
  className,
  disabled = false,
  href,
  loading = false,
  variant = "primary"
}: ButtonLinkProps) {
  // Ссылку нельзя реально disabled-нуть, поэтому aria + pointer-events.
  const isDisabled = disabled || loading;

  return (
    <Link
      aria-disabled={isDisabled}
      className={getButtonClassName({ className, disabled: isDisabled, variant })}
      href={isDisabled ? "#" : href}
      tabIndex={isDisabled ? -1 : undefined}
    >
      {loading && (
        <span aria-hidden="true" className="animate-spin">
          ↻
        </span>
      )}
      <span>{children}</span>
    </Link>
  );
}
