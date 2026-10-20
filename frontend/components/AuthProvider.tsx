// Глобальный auth-контекст: инициализирует состояние на клиенте и раздает по всему дереву.
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";

import { getAuthChangeEventName, getCurrentUser, isAuthStorageKey } from "@/services/api";
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
    let verification = 0;

    const verify = async () => {
      const currentVerification = ++verification;
      const nextUser = await getCurrentUser();

      if (!mounted || currentVerification !== verification) {
        return;
      }

      setState({ user: nextUser, loading: false });
    };

    void verify();

    const handleChange = () => {
      setState((previous) => ({ ...previous, loading: true }));
      void verify();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea === window.localStorage && isAuthStorageKey(event.key)) handleChange();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(getAuthChangeEventName(), handleChange);

    return () => {
      mounted = false;
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(getAuthChangeEventName(), handleChange);
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

// Удобный доступ к текущему пользователю из любого client-компонента.
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
