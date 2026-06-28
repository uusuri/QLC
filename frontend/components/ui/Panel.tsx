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
        "border border-line",
        muted ? "bg-panel/55" : "bg-ink/90",
        className
      )}
    >
      {children}
    </section>
  );
}

// PanelHeader отделяет заголовочную область тонкой линией.
export function PanelHeader({ children, className }: PanelProps) {
  return <div className={cn("border-b border-line p-5 sm:p-6", className)}>{children}</div>;
}

// PanelBody задает единый внутренний rhythm для содержимого.
export function PanelBody({ children, className }: PanelProps) {
  return <div className={cn("p-5 sm:p-6", className)}>{children}</div>;
}
