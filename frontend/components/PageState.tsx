import type { ReactNode } from "react";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ButtonLink } from "@/components/ui";

type PageStateProps = {
  actionHref?: string;
  actionText?: string;
  children?: ReactNode;
  eyebrow: string;
  showLoginAction?: boolean;
  showPrimaryAction?: boolean;
  text: string;
  title: string;
};

export function PageState({
  actionHref = "/courses",
  actionText = "К каталогу курсов",
  children,
  eyebrow,
  showLoginAction = false,
  showPrimaryAction = true,
  text,
  title
}: PageStateProps) {
  return <div className="kit-shell"><SiteHeader /><main className="flex-1" id="main-content" tabIndex={-1}><section className="kit-state"><p className="qlc-eyebrow text-muted">{eyebrow}</p><h1>{title}</h1><p>{text}</p>{(showPrimaryAction || showLoginAction) && <div className="flex flex-wrap gap-3">{showPrimaryAction && <ButtonLink href={actionHref}>{actionText} →</ButtonLink>}{showLoginAction && <ButtonLink href="/login" variant="secondary">Войти</ButtonLink>}</div>}{children}</section></main><SiteFooter /></div>;
}
