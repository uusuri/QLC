// Глобальный auth-контекст: инициализирует состояние на клиенте и раздает по всему дереву.
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";

import { getAuthChangeEventName, getCurrentUser } from "@/services/api";
import type { AuthUserDto } from "@/types";

type AuthContextValue = {
  // Текущий пользователь или null, если сессии нет.
  user: AuthUserDto | null;
  // true, пока идет первичная проверка токена.
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: false
});

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthContextValue>({ user: null, loading: true });

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
      setState((previous) => ({ ...previous, loading: true }));
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

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

// Удобный доступ к текущему пользователю из любого client-компонента.
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
