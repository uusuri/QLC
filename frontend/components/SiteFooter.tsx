"use client";

import Link from "next/link";

import { useAuth } from "@/components/AuthProvider";

export function SiteFooter() {
  const { user } = useAuth();

  return (
    <footer className="border-t border-line bg-ink/90">
      <div className="mx-auto max-w-[92vw] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-2 w-2 rounded-full bg-acid shadow-[0_0_12px_rgba(255,106,61,0.5)]" />
              <span className="font-mono text-xs font-black uppercase tracking-[0.24em] text-white/80">
                Course Archive / Marathon Edition
              </span>
            </div>
            <p className="mt-3 max-w-md text-xs leading-relaxed text-white/40">
              Образовательная платформа в визуальном ключе классического sci-fi терминала.
              Жесткая сетка, моноширинная типографика и акцентный оранжевый фосфор.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-[10px] font-black uppercase tracking-[0.18em] text-white/48">
            <Link className="transition hover:text-acid" href="/">
              Витрина
            </Link>
            <Link className="transition hover:text-acid" href="/profile">
              Профиль
            </Link>
            {!user && (
              <Link className="transition hover:text-acid" href="/login">
                Вход
              </Link>
            )}
            <Link className="transition hover:text-acid" href="/admin/content">
              Admin
            </Link>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-[10px] font-mono uppercase tracking-[0.16em] text-white/32">
          <span>© {new Date().getFullYear()} Course Archive</span>
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-acid" />
            system operational
          </span>
        </div>
      </div>
    </footer>
  );
}
