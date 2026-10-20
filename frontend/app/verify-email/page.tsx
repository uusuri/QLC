import { AccountAuthShell } from "@/components/AccountAuthShell";
import { VerifyEmailStatus } from "@/components/AccountRecovery";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <AccountAuthShell><VerifyEmailStatus token={token} /></AccountAuthShell>;
}
