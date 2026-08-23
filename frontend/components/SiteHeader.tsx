"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthStatus } from "@/components/AuthStatus";
import { useAuth } from "@/components/AuthProvider";

type SiteHeaderProps = {
  compact?: boolean;
};

const userNavLinks = [
  { href: "/#courses", label: "Курсы" },
  { href: "/#how", label: "Как устроено" },
  { href: "/profile", label: "Моё обучение" },
  { href: "/checkout", label: "Корзина" }
];

const adminNavLink = { href: "/admin/content", label: "Админ" };

export function SiteHeader({ compact = false }: SiteHeaderProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [activeHash, setActiveHash] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const navLinks = user?.role === "ROLE_ADMIN" ? [...userNavLinks, adminNavLink] : userNavLinks;

  useEffect(() => {
    const syncLocation = () => {
      setActiveHash(window.location.hash);
      setMobileOpen(false);
    };

    syncLocation();
    window.addEventListener("hashchange", syncLocation);
    window.addEventListener("popstate", syncLocation);

    return () => {
      window.removeEventListener("hashchange", syncLocation);
      window.removeEventListener("popstate", syncLocation);
    };
  }, [pathname]);

  const isLinkActive = (href: string) => {
    if (href === "/#courses") {
      return pathname === "/" && activeHash === "#courses";
    }

    if (href === "/#how") {
      return pathname === "/" && activeHash === "#how";
    }

    return pathname === href;
  };

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith("/#")) {
      setActiveHash(href.slice(1));
    }
  };

  return (
    <header className="sticky top-0 z-30 -mx-4 border-b border-white/8 bg-ink/88 px-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="relative mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-3 sm:min-h-20">
        <Link className="group flex shrink-0 items-center gap-3 rounded-lg" href="/">
          <span className="grid h-9 w-9 rotate-45 place-items-center bg-phosphor transition-transform duration-300 group-hover:rotate-[135deg]">
            <span className="-rotate-45 text-[10px] font-black text-ink transition-transform group-hover:-rotate-[135deg]">
              Q
            </span>
          </span>
          <span>
            <span className="block text-lg font-black leading-none tracking-[-0.04em] text-white">QLC</span>
            <span className="mt-1 hidden font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-white/60 sm:block">
              learn by coding
            </span>
          </span>
        </Link>

        {!compact && (
          <nav
            aria-label="Навигация"
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full bg-white/[0.045] p-1 xl:flex"
          >
            {navLinks.map((link) => {
              const isActive = isLinkActive(link.href);

              return (
                <Link
                  aria-current={isActive ? (link.href.startsWith("/#") ? "location" : "page") : undefined}
                  className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-white/[0.09] text-phosphor"
                      : "text-white/62 hover:bg-white/[0.055] hover:text-white"
                  }`}
                  href={link.href}
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {!compact ? (
            <button
              aria-controls={mobileOpen ? "qlc-mobile-navigation" : undefined}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "Закрыть меню" : "Открыть меню"}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/12 text-white transition hover:border-phosphor/60 hover:text-phosphor xl:hidden"
              onClick={() => setMobileOpen((current) => !current)}
              type="button"
            >
              <span aria-hidden="true" className="grid gap-1.5">
                <span className={`block h-px w-4 bg-current transition ${mobileOpen ? "translate-y-[3.5px] rotate-45" : ""}`} />
                <span className={`block h-px w-4 bg-current transition ${mobileOpen ? "-translate-y-[3.5px] -rotate-45" : ""}`} />
              </span>
            </button>
          ) : null}
          <AuthStatus />
        </div>
      </div>

      {!compact && mobileOpen ? (
        <nav
          aria-label="Мобильная навигация"
          className="mx-auto max-w-7xl border-t border-white/8 py-3 xl:hidden"
          id="qlc-mobile-navigation"
        >
          <div className="grid gap-1 sm:grid-cols-2">
            {navLinks.map((link) => {
              const isActive = isLinkActive(link.href);

              return (
                <Link
                  aria-current={isActive ? (link.href.startsWith("/#") ? "location" : "page") : undefined}
                  className={`flex min-h-12 items-center justify-between rounded-2xl px-4 text-sm font-semibold transition ${
                    isActive
                      ? "bg-phosphor text-ink"
                      : "text-white/72 hover:bg-white/[0.06] hover:text-white"
                  }`}
                  href={link.href}
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                >
                  <span>{link.label}</span>
                  <span aria-hidden="true" className="font-mono opacity-55">→</span>
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
