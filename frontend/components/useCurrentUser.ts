// Хук для чтения текущего пользователя из localStorage с фоновой проверкой токена.
"use client";

import { useEffect, useState } from "react";

import { getAuthChangeEventName, getAuthToken, getCurrentUser, getStoredUser } from "@/services/api";
import type { AuthUserDto } from "@/types";

type UseCurrentUserResult = {
  // Текущий пользователь или null, если сессии нет/токен невалиден.
  user: AuthUserDto | null;
  // true, пока идет первая проверка токена или фоновое обновление после события.
  loading: boolean;
};

export function useCurrentUser(): UseCurrentUserResult {
  const [state, setState] = useState<UseCurrentUserResult>(() => {
    const storedUser = getStoredUser();
    const hasToken = Boolean(getAuthToken());

    return {
      user: storedUser,
      // Если есть токен, но нет сохраненного summary — показываем loading,
      // чтобы не мелькнуть кнопкой "Вход" для уже вошедшего пользователя.
      loading: hasToken && !storedUser
    };
  });

  useEffect(() => {
    let mounted = true;

    const verify = async () => {
      const nextUser = await getCurrentUser();

      if (!mounted) {
        return;
      }

      setState({ user: nextUser, loading: false });
    };

    void verify();

    const handleChange = () => {
      const storedUser = getStoredUser();
      const hasToken = Boolean(getAuthToken());

      setState({ user: storedUser, loading: hasToken && !storedUser });
      void verify();
    };

    window.addEventListener("storage", handleChange);
    window.addEventListener(getAuthChangeEventName(), handleChange);

    return () => {
      mounted = false;
      window.removeEventListener("storage", handleChange);
      window.removeEventListener(getAuthChangeEventName(), handleChange);
    };
  }, []);

  return state;
}
