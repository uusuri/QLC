"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { BrandMark } from "@/components/BrandMark";
import { AuthStatus } from "@/components/AuthStatus";
import { useAuth } from "@/components/AuthProvider";

type SiteHeaderProps = {
  compact?: boolean;
};

const userNavLinks = [
  { href: "/courses", label: "Курсы" },
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
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    const syncLocation = () => {
      setActiveHash(window.location.hash);
      setMobileOpen(false);
    };

    syncLocation();
    window.addEventListener("hashchange", syncLocation);
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("popstate", syncLocation);

    return () => {
      window.removeEventListener("hashchange", syncLocation);
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("popstate", syncLocation);
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/") return;
    const sections = ["courses", "how"].map((id) => document.getElementById(id)).filter((node): node is HTMLElement => node !== null);
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActiveHash(`#${entry.target.id}`);
      }
    }, { rootMargin: "-15% 0px -60% 0px" });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [pathname]);

  const isLinkActive = (href: string) => {
    if (href === "/courses") {
      return pathname === "/courses" || pathname.startsWith("/courses/") || pathname.startsWith("/lessons/");
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
    <header className="kit-header">
      <div className="kit-header-inner">
        <Link className="kit-logo" href="/"><BrandMark />QLC</Link>

        {!compact && (
          <nav
            aria-label="Навигация"
            className="hidden items-center gap-1 lg:flex"
          >
            {navLinks.map((link) => {
              const isActive = isLinkActive(link.href);

              return (
                <Link
                  aria-current={isActive ? (link.href.startsWith("/#") ? "location" : "page") : undefined}
                  className={`flex min-h-11 items-center gap-2 px-3 py-2 text-[13px] font-normal transition ${
                    isActive
                      ? "text-acid"
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
              className="grid h-11 w-11 shrink-0 place-items-center border border-white/12 text-white transition hover:border-phosphor/60 hover:text-phosphor lg:hidden"
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
          className="mx-auto max-w-7xl border-t border-white/8 py-3 lg:hidden"
          id="qlc-mobile-navigation"
        >
          <div className="grid gap-1 sm:grid-cols-2">
            {navLinks.map((link) => {
              const isActive = isLinkActive(link.href);

              return (
                <Link
                  aria-current={isActive ? (link.href.startsWith("/#") ? "location" : "page") : undefined}
                  className={`flex min-h-12 items-center justify-between border border-transparent px-4 text-sm font-semibold transition ${
                    isActive
                      ? "text-acid"
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
