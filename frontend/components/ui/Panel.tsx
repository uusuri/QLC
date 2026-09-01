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
        "overflow-hidden rounded-[26px] border border-white/8 shadow-[0_20px_70px_rgba(0,0,0,0.12)]",
        muted ? "bg-white/[0.035]" : "bg-panel",
        className
      )}
    >
      {children}
    </section>
  );
}

export function PanelHeader({ children, className }: PanelProps) {
  return <div className={cn("p-5 sm:p-6 lg:p-7", className)}>{children}</div>;
}

export function PanelBody({ children, className }: PanelProps) {
  return <div className={cn("p-5 sm:p-6 lg:p-7", className)}>{children}</div>;
}
