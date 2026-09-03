"use client";

import Link from "next/link";

import { useAuth } from "@/components/AuthProvider";
import { isAdmin } from "@/services/auth";

const linkClassName = "inline-flex min-h-11 items-center transition hover:text-phosphor";

export function FooterAuthLinks() {
  const { loading, user } = useAuth();

  if (loading) {
    return null;
  }

  return user ? (
    isAdmin(user) ? <Link className={linkClassName} href="/admin/content">Админ</Link> : null
  ) : (
    <Link className={linkClassName} href="/login">Вход</Link>
  );
}
