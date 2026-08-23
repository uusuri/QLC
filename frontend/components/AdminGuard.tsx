"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";
import type { AuthUserDto } from "@/types";

export function isAdmin(user: AuthUserDto | null): boolean {
  return user?.role === "ROLE_ADMIN";
}

type AdminGuardProps = {
  children: React.ReactNode;
};

export function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!isAdmin(user)) {
      router.replace("/");
    }
  }, [loading, router, user]);

  if (loading || !isAdmin(user)) {
    return (
      <div className="grid min-h-screen place-items-center px-4" id="main-content" tabIndex={-1}>
        <div className="border border-line bg-panel/95 p-6 text-center">
          <p className="font-mono text-xs font-black uppercase text-white/48">QLC</p>
          <p className="mt-3 text-sm font-bold uppercase text-white/72">Проверка доступа...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
