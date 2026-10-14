import type { AuthUserDto } from "@/types";

export function isAdmin(user: AuthUserDto | null): boolean {
  return user?.role === "ROLE_ADMIN";
}
