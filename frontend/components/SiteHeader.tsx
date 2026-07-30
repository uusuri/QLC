"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AuthStatus } from "@/components/AuthStatus";
import { useAuth } from "@/components/AuthProvider";

type SiteHeaderProps = {
  compact?: boolean;
};

const userNavLinks = [
  { href: "/", label: "Главная" },
  { href: "/profile", label: "Моё обучение" },
  { href: "/checkout", label: "Корзина" }
];

const adminNavLink = { href: "/admin/content", label: "Админ" };

export function SiteHeader({ compact = false }: SiteHeaderProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const navLinks = user?.role === "ROLE_ADMIN" ? [...userNavLinks, adminNavLink] : userNavLinks;

  return (
    <header className="sticky top-0 z-30 -mx-4 bg-ink/86 px-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="relative mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-5">
        <Link className="group flex shrink-0 items-center gap-3" href="/">
          <span className="grid h-9 w-9 rotate-45 place-items-center bg-phosphor transition-transform group-hover:rotate-[135deg]">
            <span className="-rotate-45 text-[10px] font-black text-ink transition-transform group-hover:-rotate-[135deg]">
              Q
            </span>
          </span>
          <span className="text-lg font-black tracking-[-0.04em] text-white">QLC</span>
        </Link>

        {!compact && (
          <nav
            aria-label="Навигация"
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full bg-white/[0.045] p-1 md:flex"
          >
            {navLinks.map((link) => {
              const isActive = pathname === link.href;

              return (
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-white/[0.09] text-phosphor"
                      : "text-white/58 hover:bg-white/[0.055] hover:text-white"
                  }`}
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}

        <AuthStatus />
      </div>

      {!compact && (
        <nav
          aria-label="Мобильная навигация"
          className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto rounded-full bg-white/[0.045] p-1 md:hidden"
        >
          {navLinks.map((link) => {
            const isActive = pathname === link.href;

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium transition ${
                  isActive ? "bg-white/[0.09] text-phosphor" : "text-white/52"
                }`}
                href={link.href}
                key={link.href}
              >
                {link.label === "Моё обучение" ? "Обучение" : link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
