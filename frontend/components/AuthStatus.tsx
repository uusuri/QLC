"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { isAdmin } from "@/components/AdminGuard";
import { useAuth } from "@/components/AuthProvider";
import { logoutUser } from "@/services/api";

export function AuthStatus() {
  const router = useRouter();
  const [currentPath, setCurrentPath] = useState("/");
  const { loading, user } = useAuth();
  const loginHref = useMemo(
    () => `/login?redirectTo=${encodeURIComponent(currentPath)}`,
    [currentPath]
  );

  useEffect(() => {
    setCurrentPath(`${window.location.pathname}${window.location.search}`);
  }, []);

  const handleLogout = () => {
    logoutUser();
    router.replace("/");
    router.refresh();
  };

  if (loading) {
    return (
      <span
        aria-label="Проверяем сессию"
        className="block h-11 w-[72px] animate-pulse rounded-full bg-white/[0.07]"
        role="status"
      />
    );
  }

  if (user) {
    const admin = isAdmin(user);

    return (
      <div className="flex items-center gap-1">
        <span
          className={`hidden min-h-11 max-w-44 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold sm:inline-flex ${
            admin ? "bg-phosphor text-ink" : "bg-white/[0.06] text-white/72"
          }`}
        >
          {admin && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ink" />}
          <span className="truncate">@{user.username}</span>
        </span>
        <button
          className="min-h-11 rounded-full px-3 py-2 text-xs font-semibold text-white/62 transition hover:bg-white/[0.06] hover:text-white"
          onClick={handleLogout}
          type="button"
        >
          Выйти
        </button>
      </div>
    );
  }

  return (
    <Link
      className="inline-flex min-h-11 items-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-phosphor"
      href={loginHref}
    >
      Войти
    </Link>
  );
}
