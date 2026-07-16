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
    return "border-acid bg-acid text-ink";
  }

  if (tone === "warning") {
    return "border-yellow-300/70 bg-yellow-300/12 text-yellow-100";
  }

  if (tone === "danger") {
    return "border-red-400/70 bg-red-400/12 text-red-100";
  }

  if (tone === "info") {
    return "border-cyan-300/70 bg-cyan-300/12 text-cyan-100";
  }

  return "border-line bg-panel text-white/74";
}

// Маленький бейдж для статусов API, задач, доступа и очереди.
export function StatusBadge({ children, className, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-2 border px-2 py-1 font-mono text-[10px] font-black uppercase",
        getToneClassName(tone),
        className
      )}
    >
      <span aria-hidden="true">⟦</span>
      <span>{children}</span>
      <span aria-hidden="true">⟧</span>
    </span>
  );
}
