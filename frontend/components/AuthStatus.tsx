// AuthStatus читает auth-контекст и должен работать в браузере.
"use client";

// Link нужен для перехода на /login.
import Link from "next/link";

// useRouter обновляет серверные части после logout.
import { useRouter } from "next/navigation";

// React-хуки держат текущего пользователя.
import { useEffect, useMemo, useState } from "react";

// Auth helpers идут через service layer.
import { useAuth } from "@/components/AuthProvider";
import { logoutUser } from "@/services/api";

// Компактный auth-block для nav/header.
export function AuthStatus() {
  const router = useRouter();
  const [currentPath, setCurrentPath] = useState("/");
  const { user } = useAuth();

  const loginHref = useMemo(
    () => `/login?redirectTo=${encodeURIComponent(currentPath)}`,
    [currentPath]
  );

  useEffect(() => {
    setCurrentPath(`${window.location.pathname}${window.location.search}`);
  }, []);

  const handleLogout = () => {
    logoutUser();
    router.refresh();
  };

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center border border-acid bg-acid px-3 py-2 font-mono text-[10px] font-black uppercase tracking-[0.24em] text-ink">
          @{user.username}
        </span>
        <button
          className="inline-flex items-center border border-line bg-panel/70 px-3 py-2 font-mono text-[10px] font-black uppercase tracking-[0.24em] text-white/70 transition hover:border-acid hover:text-acid"
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
      className="inline-flex items-center border border-line bg-panel/70 px-3 py-2 font-mono text-[10px] font-black uppercase tracking-[0.24em] text-white/72 transition hover:border-acid hover:text-acid"
      href={loginHref}
    >
      Вход
    </Link>
  );
}
