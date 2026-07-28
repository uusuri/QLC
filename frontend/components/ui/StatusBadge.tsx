"use client";

// ReactNode позволяет бейджу принимать текст с числами/inline JSX.
import type { ReactNode } from "react";

// StatusBadge показывает статус текстом, формой и цветом, а не только цветом.
export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

// Props бейджа статуса.
type StatusBadgeProps = {
  // children — короткий текст статуса.
  children: ReactNode;
  // className нужен для редких layout-правок.
  className?: string;
  // tone выбирает визуальный смысл статуса.
  tone?: StatusTone;
};

// Склеивает классы без clsx.
function cn(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

// Возвращает цветовую схему статуса.
function getToneClassName(tone: StatusTone) {
  if (tone === "success") {
    return "bg-phosphor text-ink";
  }

  if (tone === "warning") {
    return "bg-yellow-300/12 text-yellow-100";
  }

  if (tone === "danger") {
    return "bg-red-400/12 text-red-100";
  }

  if (tone === "info") {
    return "bg-cyan-300/12 text-cyan-100";
  }

  return "bg-white/[0.08] text-white/74";
}

// Возвращает маленький маркер состояния.
function getToneDot(tone: StatusTone) {
  if (tone === "success") {
    return <span className="h-1.5 w-1.5 rounded-full bg-ink" />;
  }

  if (tone === "warning") {
    return <span className="h-1.5 w-1.5 rounded-full bg-yellow-300" />;
  }

  if (tone === "danger") {
    return <span className="h-1.5 w-1.5 rounded-full bg-red-400" />;
  }

  if (tone === "info") {
    return <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />;
  }

  return <span className="h-1.5 w-1.5 rounded-full bg-white/40" />;
}

// Маленький бейдж для статусов API, задач, доступа и очереди.
export function StatusBadge({ children, className, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
        getToneClassName(tone),
        className
      )}
    >
      {getToneDot(tone)}
      <span>{children}</span>
    </span>
  );
}
