// Если пользователь уже вошел — уводит со страниц авторизации/регистрации.
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";

type RedirectIfAuthenticatedProps = {
  // Куда перейти, если пользователь уже авторизован.
  redirectTo?: string;
  // Fallback, когда redirectTo не задан или не является внутренним путем.
  fallback?: string;
};

export function RedirectIfAuthenticated({
  redirectTo,
  fallback = "/profile"
}: RedirectIfAuthenticatedProps) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) {
      return;
    }

    const target =
      redirectTo && redirectTo.startsWith("/") ? redirectTo : fallback;

    router.replace(target);
  }, [user, loading, redirectTo, fallback, router]);

  return null;
}
