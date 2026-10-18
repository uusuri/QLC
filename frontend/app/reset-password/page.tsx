import { AccountAuthShell } from "@/components/AccountAuthShell";
import { ResetPasswordForm } from "@/components/AccountRecovery";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <AccountAuthShell><ResetPasswordForm token={token} /></AccountAuthShell>;
}
