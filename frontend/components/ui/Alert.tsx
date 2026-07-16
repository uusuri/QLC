// ReactNode позволяет передать в Alert текст, ссылки или маленькую разметку.
import type { ReactNode } from "react";

// Варианты Alert по смыслу сообщения.
export type AlertTone = "info" | "success" | "warning" | "danger" | "neutral";

// Props alert-компонента.
type AlertProps = {
  // children — основной текст сообщения.
  children: ReactNode;
  // className нужен для локальных layout-отступов.
  className?: string;
  // title — короткий заголовок в верхней строке.
  title: string;
  // tone задает смысл и цвет.
  tone?: AlertTone;
};

// Склеивает className без отдельного пакета.
function cn(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

// Возвращает классы по смыслу alert.
function getToneClassName(tone: AlertTone) {
  if (tone === "success") {
    return "border-acid bg-acid/10 text-acid";
  }

  if (tone === "warning") {
    return "border-amber-300/70 bg-amber-300/10 text-amber-100";
  }

  if (tone === "danger") {
    return "border-red-400/60 bg-red-400/10 text-red-100";
  }

  if (tone === "neutral") {
    return "border-line bg-panel/70 text-white/72";
  }

  return "border-cyan-300/50 bg-cyan-300/10 text-cyan-100";
}

// Alert — единый блок для error/empty/success/info состояний.
export function Alert({ children, className, title, tone = "info" }: AlertProps) {
  return (
    <div className={cn("border p-4 shadow-[0_0_40px_rgba(255,106,61,0.06)]", getToneClassName(tone), className)} role="status">
      <p className="font-mono text-xs font-black uppercase">{title}</p>
      <div className="mt-3 text-sm leading-snug text-white/76">{children}</div>
    </div>
  );
}
