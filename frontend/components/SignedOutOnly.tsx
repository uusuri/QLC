"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/components/AuthProvider";

export function SignedOutOnly({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();
  return loading || user ? null : children;
}
