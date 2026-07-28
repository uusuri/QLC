"use client";

import type { ReactNode } from "react";

type PanelProps = {
  children: ReactNode;
  className?: string;
  muted?: boolean;
};

function cn(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

export function Panel({ children, className, muted = false }: PanelProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[28px]",
        muted ? "bg-white/[0.045]" : "bg-panel",
        className
      )}
    >
      {children}
    </section>
  );
}

export function PanelHeader({ children, className }: PanelProps) {
  return <div className={cn("p-5 sm:p-7", className)}>{children}</div>;
}

export function PanelBody({ children, className }: PanelProps) {
  return <div className={cn("p-5 sm:p-7", className)}>{children}</div>;
}
