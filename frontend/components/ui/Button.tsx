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
    return "border-red-400/80 bg-red-400/12 text-red-100 hover:bg-red-400 hover:text-ink";
  }

  if (variant === "secondary") {
    return "border-line bg-panel text-white/78 hover:border-acid hover:text-acid";
  }

  return "border-acid bg-acid text-ink hover:bg-transparent hover:text-acid";
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
    "inline-flex min-h-12 items-center justify-center gap-2 border px-5 text-xs font-black uppercase transition",
    "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-acid",
    "disabled:cursor-not-allowed disabled:border-white/16 disabled:bg-white/8 disabled:text-white/34",
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
      {loading && <span aria-hidden="true">...</span>}
      <span>{children}</span>
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
      {loading && <span aria-hidden="true">...</span>}
      <span>{children}</span>
    </Link>
  );
}
