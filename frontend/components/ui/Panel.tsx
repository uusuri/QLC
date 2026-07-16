// ReactNode описывает любой JSX внутри панели.
import type { ReactNode } from "react";

// Props базовой панели.
type PanelProps = {
  // children — содержимое панели.
  children: ReactNode;
  // className позволяет странице управлять сеткой и отступами.
  className?: string;
  // muted делает фон менее контрастным для вторичных блоков.
  muted?: boolean;
};

// Склеивает классы без внешних зависимостей.
function cn(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

// Panel — базовый прямоугольный контейнер UI-kit.
export function Panel({ children, className, muted = false }: PanelProps) {
  return (
    <section
      className={cn(
        "border border-line bg-gradient-to-b from-white/[0.03] to-transparent shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_24px_80px_rgba(0,0,0,0.5)]",
        muted ? "bg-panel/70" : "bg-ink/92",
        className
      )}
    >
      {children}
    </section>
  );
}

// PanelHeader отделяет заголовочную область тонкой линией.
export function PanelHeader({ children, className }: PanelProps) {
  return (
    <div className={cn("border-b border-line/80 bg-white/[0.02] p-5 sm:p-6", className)}>
      {children}
    </div>
  );
}

// PanelBody задает единый внутренний rhythm для содержимого.
export function PanelBody({ children, className }: PanelProps) {
  return <div className={cn("p-22 sm:p-6", className)}>{children}</div>;
}
