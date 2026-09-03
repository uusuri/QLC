import type { ReactNode } from "react";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ButtonLink, StatusBadge } from "@/components/ui";

type PageStateProps = {
  actionHref?: string;
  actionText?: string;
  children?: ReactNode;
  eyebrow: string;
  showLoginAction?: boolean;
  text: string;
  title: string;
};

export function PageState({
  actionHref = "/",
  actionText = "На главную",
  children,
  eyebrow,
  showLoginAction = false,
  text,
  title
}: PageStateProps) {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex-1 px-4 py-4 sm:px-6 lg:px-8">
        <SiteHeader />
        <section className="mx-auto max-w-7xl">
          <section
            className="mt-6 grid min-h-[70vh] content-center gap-6 rounded-[28px] border border-line bg-white/[0.025] p-5 sm:p-7"
            id="main-content"
            tabIndex={-1}
          >
            <StatusBadge tone="warning">{eyebrow}</StatusBadge>
            <h1 className="max-w-4xl text-5xl font-bold leading-[1.02] tracking-[-0.045em] sm:text-7xl">
              {title}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-white/66">{text}</p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={actionHref}>{actionText}</ButtonLink>
              {showLoginAction ? (
                <ButtonLink href="/login" variant="secondary">Вход</ButtonLink>
              ) : null}
            </div>
            {children}
          </section>
        </section>
      </div>

      <div className="mx-auto w-full max-w-[1344px] px-4 sm:px-6 lg:px-8">
        <SiteFooter />
      </div>
    </main>
  );
}
