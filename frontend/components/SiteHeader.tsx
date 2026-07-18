// SiteHeader содержит AuthStatus, поэтому должен выполняться в браузере.
"use client";

import Link from "next/link";

import { AuthStatus } from "@/components/AuthStatus";

// Props SiteHeader.
type SiteHeaderProps = {
  // compact убирает нижнюю навигационную полосу для внутренних страниц.
  compact?: boolean;
};

// Навигационные ссылки.
const navLinks = [
  { href: "/", label: "Витрина" },
  { href: "/profile", label: "Профиль" },
  { href: "/checkout", label: "Checkout" },
  { href: "/admin/content", label: "Admin" }
];

export function SiteHeader({ compact = false }: SiteHeaderProps) {
  return (
    <header className="sticky top-4 z-30 border border-line bg-ink/94 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link className="flex items-center gap-3" href="/">
          <span className="relative inline-flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-acid opacity-40" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-acid shadow-[0_0_18px_rgba(255,106,61,0.55)]" />
          </span>
          <span className="font-mono text-xs font-black uppercase tracking-[0.28em] text-white/90">
            Course Archive
          </span>
        </Link>
        <AuthStatus />
      </div>

      {!compact && (
        <nav className="grid gap-px border-t border-line bg-line sm:grid-cols-4">
          {navLinks.map((link) => (
            <Link
              className="inline-flex min-h-12 items-center justify-center bg-panel px-4 text-center text-xs font-black uppercase tracking-[0.18em] text-white/76 transition hover:border-acid hover:bg-white/[0.06] hover:text-acid"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
