import type { ReactNode } from "react";
import { cn } from "@/utils/cn";
export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";
export function StatusBadge({ children, className, tone = "neutral" }: { children: ReactNode; className?: string; tone?: StatusTone }) {
  return <span className={cn(`kit-badge kit-tone-${tone}`, className)}>{children}</span>;
}
