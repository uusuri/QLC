// AuthStatus читает localStorage и должен работать в браузере.
"use client";

// Link нужен для перехода на /login.
import Link from "next/link";

// useRouter обновляет серверные части после logout.
import { useRouter } from "next/navigation";

// React-хуки держат текущего пользователя.
import { useEffect, useMemo, useState } from "react";

// Auth helpers идут через service layer.
import { getAuthChangeEventName, getCurrentUser, logoutUser } from "@/services/api";

// Тип пользователя.
import type { AuthUserDto } from "@/types";

// Компактный auth-block для nav/header.
export function AuthStatus() {
  const router = useRouter();
  const [currentPath, setCurrentPath] = useState("/");
  const [user, setUser] = useState<AuthUserDto | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const loginHref = useMemo(
    () => `/login?redirectTo=${encodeURIComponent(currentPath)}`,
    [currentPath]
  );

  useEffect(() => {
    const refreshUser = () => {
      setCurrentPath(`${window.location.pathname}${window.location.search}`);
      void getCurrentUser().then((nextUser) => {
        setUser(nextUser);
        setHydrated(true);
      });
    };

    refreshUser();

    window.addEventListener("storage", refreshUser);
    window.addEventListener(getAuthChangeEventName(), refreshUser);

    return () => {
      window.removeEventListener("storage", refreshUser);
      window.removeEventListener(getAuthChangeEventName(), refreshUser);
    };
  }, []);

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    router.refresh();
  };

  if (!hydrated || !user) {
    return (
      <Link className="transition hover:text-acid" href={loginHref}>
        Вход
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="max-w-[160px] truncate text-acid">@{user.username}</span>
      <button className="transition hover:text-acid" onClick={handleLogout} type="button">
        Выйти
      </button>
    </div>
  );
}
