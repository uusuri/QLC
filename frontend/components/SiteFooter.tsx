"use client";

import Link from "next/link";

import { isAdmin } from "@/components/AdminGuard";
import { useAuth } from "@/components/AuthProvider";

export function SiteFooter() {
  const { user } = useAuth();

  return (
    <footer className="mt-20 border-t border-white/8 py-10">
      <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
        <div>
          <p className="text-lg font-black tracking-[-0.04em]">QLC</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/40">
            Учитесь программировать через практику и понятную обратную связь.
          </p>
        </div>

        <div>
          <div className="flex flex-wrap gap-5 text-sm text-white/46">
            <Link className="transition hover:text-phosphor" href="/">Курсы</Link>
            <Link className="transition hover:text-phosphor" href="/profile">Моё обучение</Link>
            {!user && <Link className="transition hover:text-phosphor" href="/login">Вход</Link>}
            {isAdmin(user) && (
              <Link className="transition hover:text-phosphor" href="/admin/content">Админ</Link>
            )}
          </div>
          <p className="mt-4 text-xs text-white/24 sm:text-right">© {new Date().getFullYear()} QLC</p>
        </div>
      </div>
    </footer>
  );
}
