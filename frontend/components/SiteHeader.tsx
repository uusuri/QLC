// SiteHeader содержит AuthStatus, поэтому должен выполняться в браузере.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AuthStatus } from "@/components/AuthStatus";
import { useAuth } from "@/components/AuthProvider";

// Props SiteHeader.
type SiteHeaderProps = {
  // compact убирает нижнюю навигационную полосу для внутренних страниц.
  compact?: boolean;
};

// Основные навигационные ссылки для пользователя.
const userNavLinks = [
  { href: "/", label: "Витрина" },
  { href: "/profile", label: "Профиль" },
  { href: "/checkout", label: "Оплата" }
];

// Ссылка в админ-панель. Видна только ROLE_ADMIN.
const adminNavLink = { href: "/admin/content", label: "Админ" };

export function SiteHeader({ compact = false }: SiteHeaderProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isAdmin = user?.role === "ROLE_ADMIN";
  const navLinks = isAdmin ? [...userNavLinks, adminNavLink] : userNavLinks;

  // Динамическое число колонок: 3 у обычного пользователя, 4 у админа.
  const gridColsClass = isAdmin ? "sm:grid-cols-4" : "sm:grid-cols-3";

  return (
    <header className="sticky top-4 z-30 mx-auto max-w-7xl overflow-hidden border border-line bg-ink/94 shadow-hud backdrop-blur-xl">
      {/* Верхняя акцентная линия в духе Marathon HUD. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-acid/70 to-transparent"
      />

      <div className="relative flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link className="group flex items-center gap-3" href="/">
          <span className="relative inline-flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-acid opacity-40" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-acid shadow-[0_0_18px_rgba(255,106,61,0.55)] transition-shadow group-hover:shadow-[0_0_26px_rgba(255,106,61,0.75)]" />
          </span>
          <span className="font-mono text-xs font-black uppercase tracking-[0.28em] text-white/90 transition-colors group-hover:text-acid">
            Course Archive
          </span>
        </Link>

        <AuthStatus />
      </div>

      {!compact && (
        <nav
          aria-label="Навигация"
          className={`grid grid-cols-1 gap-px border-t border-line bg-line ${gridColsClass}`}
        >
          {navLinks.map((link) => {
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                aria-current={isActive ? "page" : undefined}
                className="relative inline-flex min-h-12 items-center justify-center overflow-hidden bg-panel px-4 text-center text-[10px] font-black uppercase tracking-[0.18em] text-white/76 transition-colors before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-acid before:opacity-0 hover:bg-white/[0.05] hover:text-acid data-[active=true]:bg-white/[0.07] data-[active=true]:text-acid data-[active=true]:before:opacity-100 sm:text-xs"
                data-active={isActive}
                href={link.href}
              >
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
