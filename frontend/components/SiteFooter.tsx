import Link from "next/link";

import { FooterAuthLinks } from "@/components/FooterAuthLinks";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-white/8 py-10 sm:mt-20 sm:py-12">
      <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="grid h-8 w-8 rotate-45 place-items-center bg-phosphor">
              <span className="-rotate-45 text-[9px] font-black text-ink">Q</span>
            </span>
            <p className="text-lg font-black tracking-[-0.04em]">QLC</p>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/58">
            Учитесь программировать через практику и понятную обратную связь.
          </p>
        </div>

        <div>
          <nav aria-label="Ссылки в подвале" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/68">
            <Link className="inline-flex min-h-11 items-center transition hover:text-phosphor" href="/#courses">Курсы</Link>
            <Link className="inline-flex min-h-11 items-center transition hover:text-phosphor" href="/#how">Как устроено</Link>
            <Link className="inline-flex min-h-11 items-center transition hover:text-phosphor" href="/profile">Моё обучение</Link>
            <FooterAuthLinks />
          </nav>
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.12em] text-white/60 lg:text-right">
            © {new Date().getFullYear()} QLC · теория · код · результат
          </p>
        </div>
      </div>
    </footer>
  );
}
