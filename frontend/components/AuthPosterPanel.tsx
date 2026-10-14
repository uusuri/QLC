import Link from "next/link";

import { BrandMark } from "@/components/BrandMark";

type AuthPosterPanelProps = {
  description: string;
  eyebrow: string;
  notes: string[];
  switchHref: string;
  switchLabel: string;
  titleLines: [string, string];
};

export function AuthPosterPanel({
  description,
  eyebrow,
  notes,
  switchHref,
  switchLabel,
  titleLines
}: AuthPosterPanelProps) {
  return (
    <div className="relative hidden min-w-0 grid-rows-[auto_1fr_auto] overflow-hidden border-r border-[#0a0a0a] bg-[#f5f5ef] p-8 text-[#0a0a0a] lg:grid xl:p-10">
      <header className="relative z-10 flex items-center justify-between gap-4">
        <Link className="inline-flex min-h-11 items-center gap-3 text-xl font-black tracking-[-0.05em]" href="/" aria-label="QLC — на главную">
          <BrandMark className="text-phosphor" />
          QLC<span className="ml-2 font-mono text-[10px] font-medium tracking-normal">LEARN. BUILD. REPEAT.</span>
        </Link>
        <Link className="inline-flex min-h-11 items-center border-b border-ink/30 text-xs font-semibold transition hover:border-ink" href={switchHref}>
          {switchLabel} ↗
        </Link>
      </header>

      <div className="relative grid content-center py-12 xl:py-16">
        <p className="qlc-eyebrow mb-6 text-ink/60">{eyebrow} / QLC</p>
        <p aria-hidden="true" className="relative z-10 font-display text-[clamp(4.5rem,7.5vw,7.5rem)] font-bold uppercase leading-[0.86] tracking-[-0.045em]">
          {titleLines[0]}<br />
          <span>{titleLines[1]}</span><span>.</span>
        </p>
        <p className="relative z-10 mt-7 max-w-[360px] text-sm leading-relaxed text-ink/65">{description}</p>

        <div aria-hidden="true" className="mt-10 flex items-end justify-between gap-6 border-t border-[#0a0a0a]/20 pt-7">
          <svg className="h-40 w-40 shrink-0 xl:h-48 xl:w-48" viewBox="0 0 200 200" fill="none">
            <path d="M100 4 196 100 100 196 4 100 100 4Z" fill="#0a0a0a" />
            <path d="M100 52 148 100 100 148 52 100 100 52Z" fill="#c4ff00" />
            <path d="M100 82 118 100 100 118 82 100 100 82Z" fill="#0a0a0a" />
          </svg>
          <div className="flex min-w-0 flex-col items-end gap-9 pb-2">
            <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none"><path d="M16 0v32M0 16h32" stroke="#0a0a0a" strokeWidth="2" /></svg>
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#0a0a0a]/60">LEARN / REPEAT</span>
          </div>
        </div>
      </div>

      <footer className="relative z-10 grid grid-cols-3 gap-5 border-t-4 border-ink bg-[#c4ff00] p-5 -mx-8 -mb-8 xl:-mx-10 xl:-mb-10">
        {notes.map((note, index) => (
          <div className="min-w-0" key={`${index}-${note}`}>
            <span className="font-mono text-[10px] text-ink/45">0{index + 1} /</span>
            <p className="mt-3 text-xs font-semibold leading-relaxed text-ink/75 [overflow-wrap:anywhere]">{note}</p>
          </div>
        ))}
      </footer>
    </div>
  );
}
