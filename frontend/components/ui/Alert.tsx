import type { ReactNode } from "react";
import { cn } from "@/utils/cn";
import { KitIcon } from "@/components/DesignKit";
export type AlertTone = "info" | "success" | "warning" | "danger" | "neutral";
export function Alert({ children, className, title, tone = "info" }: { children: ReactNode; className?: string; title: string; tone?: AlertTone }) {
  return <div aria-live={tone === "danger" ? "assertive" : "polite"} className={cn(`kit-alert kit-tone-${tone}`, className)} role={tone === "danger" ? "alert" : "status"}>
    <p className="kit-alert-title"><KitIcon name={tone === "success" ? "check" : tone === "warning" || tone === "danger" ? "warning" : "info"} />{title}</p><div className="kit-alert-body">{children}</div>
  </div>;
}
