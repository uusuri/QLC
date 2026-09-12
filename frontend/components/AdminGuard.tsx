"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { PageState } from "@/components/PageState";
import { useAuth } from "@/components/AuthProvider";
import { isAdmin } from "@/services/auth";

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
    return <PageState eyebrow="Доступ" showPrimaryAction={false} title="Проверка доступа" text="Проверяем права для управления контентом." />;
  }

  return <>{children}</>;
}
