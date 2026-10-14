import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

type PanelProps = {
  children: ReactNode;
  className?: string;
  muted?: boolean;
};

export function Panel({ children, className, muted = false }: PanelProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[4px] border border-line ",
        muted ? "bg-surface" : "bg-panel",
        className
      )}
    >
      {children}
    </section>
  );
}

export function PanelHeader({ children, className }: PanelProps) {
  return <div className={cn("p-5 sm:p-6", className)}>{children}</div>;
}

export function PanelBody({ children, className }: PanelProps) {
  return <div className={cn("p-5 sm:p-6", className)}>{children}</div>;
}
