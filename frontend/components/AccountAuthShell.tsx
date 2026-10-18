import Link from "next/link";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/BrandMark";
import { SiteFooter } from "@/components/SiteFooter";

export function AccountAuthShell({ children }: { children: ReactNode }) {
  return <div className="kit-shell"><header className="kit-auth-nav">
    <Link className="kit-logo" href="/"><BrandMark />QLC</Link>
    <Link className="qlc-text-link" href="/">На главную ↗</Link>
  </header><main className="kit-auth" id="main-content" tabIndex={-1}>{children}</main><SiteFooter /></div>;
}
