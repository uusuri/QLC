import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { BrandMark } from "@/components/BrandMark";
import { RedirectIfAuthenticated } from "@/components/RedirectIfAuthenticated";
import { SiteFooter } from "@/components/SiteFooter";
export default async function AuthPage({ searchParams }: { searchParams?: Promise<{ redirectTo?: string }> }) {
  const params = await searchParams;
  return <div className="kit-shell"><RedirectIfAuthenticated redirectTo={params?.redirectTo} /><header className="kit-auth-nav"><Link className="kit-logo" href="/"><BrandMark />QLC</Link><Link className="qlc-text-link" href="/">На главную ↗</Link></header><main className="kit-auth" id="main-content" tabIndex={-1}><AuthForm mode="register" redirectTo={params?.redirectTo} /></main><SiteFooter /></div>;
}
