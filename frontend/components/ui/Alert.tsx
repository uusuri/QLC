// ReactNode позволяет передать в Alert текст, ссылки или маленькую разметку.
import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

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

// Возвращает классы по смыслу alert.
function getToneClassName(tone: AlertTone) {
  if (tone === "success") {
    return "border-acid/70 bg-acid/[0.08] text-acid";
  }

  if (tone === "warning") {
    return "border-amber-300/70 bg-amber-300/[0.08] text-amber-100";
  }

  if (tone === "danger") {
    return "border-red-400/60 bg-red-400/[0.08] text-red-100";
  }

  if (tone === "neutral") {
    return "border-line bg-panel/70 text-white/72";
  }

  return "border-cyan-300/50 bg-cyan-300/[0.08] text-cyan-100";
}

// Возвращает короткий ASCII-маркер для заголовка.
function getToneMarker(tone: AlertTone) {
  if (tone === "success") return "✓";
  if (tone === "warning") return "!";
  if (tone === "danger") return "×";
  if (tone === "neutral") return "·";
  return "i";
}

// Alert — единый блок для error/empty/success/info состояний.
export function Alert({ children, className, title, tone = "info" }: AlertProps) {
  return (
    <div
      aria-live={tone === "danger" ? "assertive" : "polite"}
      className={cn(
        "relative rounded-2xl border p-4 shadow-[0_18px_50px_rgba(0,0,0,0.12)]",
        getToneClassName(tone),
        className
      )}
      role={tone === "danger" ? "alert" : "status"}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 h-full w-px bg-gradient-to-b from-current to-transparent opacity-30"
      />
      <p className="flex items-center gap-2 font-mono text-xs font-black uppercase tracking-[0.08em]">
        <span
          aria-hidden="true"
          className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-current text-[10px]"
        >
          {getToneMarker(tone)}
        </span>
        {title}
      </p>
      <div className="mt-3 text-sm leading-relaxed text-white/80">{children}</div>
    </div>
  );
}
