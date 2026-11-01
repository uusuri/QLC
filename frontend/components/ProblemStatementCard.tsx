import type { ReactNode } from "react";

type ProblemStatementCardProps = {
  label: string;
  title: ReactNode;
  condition: ReactNode;
  input: ReactNode;
  output: ReactNode;
  constraints: ReactNode;
  tone: "dark" | "paper";
};

/** Layout only: Markdown parsing remains in SafeMarkdown, with no circular import. */
export function ProblemStatementCard({ label, title, condition, input, output, constraints, tone }: ProblemStatementCardProps) {
  const paper = tone === "paper";
  const border = paper ? "border-ink/15" : "border-white/15";
  const heading = paper ? "text-ink/60" : "text-white/55";
  const sectionClass = "min-w-0 px-5 py-4 sm:px-6";
  const sectionHeading = `mb-2 font-mono text-xs font-medium uppercase tracking-[0.08em] ${heading}`;
  // Outrank the legacy .kit-markdown p/li colours, only inside this light card.
  const paperTypography = paper
    ? "[&_.kit-markdown>p]:text-ink/75 [&_.kit-markdown>ul>li]:text-ink/75 [&_.kit-markdown>ol>li]:text-ink/75"
    : "";

  return (
    <section
      aria-label={label}
      data-problem-statement=""
      className={`min-w-0 w-full max-w-[74ch] overflow-hidden rounded border ${border} ${paper ? "bg-[#f6f6ef] text-ink" : "bg-white/[0.025] text-white"} ${paperTypography} [&_.kit-markdown]:gap-3 [&_p]:leading-7 [&_pre]:p-3`}
    >
      <div className={`${sectionClass} pb-5 sm:pb-5`}>
        <div className="mb-4 flex min-w-0 items-start gap-3">
          <span aria-hidden="true" className={`mt-1 h-5 w-0.5 shrink-0 ${paper ? "bg-[#778900]" : "bg-acid"}`} />
          <h3 className="min-w-0 text-xl font-semibold leading-7 tracking-[-0.02em] [overflow-wrap:anywhere]">{title}</h3>
        </div>
        <h4 className="sr-only">Условие</h4>
        {condition}
      </div>
      <div className={`grid min-w-0 grid-cols-1 border-t sm:grid-cols-2 ${border}`}>
        <div className={sectionClass}>
          <h4 className={sectionHeading}>Ввод</h4>
          {input}
        </div>
        <div className={`${sectionClass} border-t sm:border-l sm:border-t-0 ${border}`}>
          <h4 className={sectionHeading}>Вывод</h4>
          {output}
        </div>
      </div>
      <div className={`${sectionClass} border-t ${border} ${paper ? "bg-ink/[0.025]" : "bg-white/[0.015]"}`}>
        <h4 className={sectionHeading}>Ограничения</h4>
        <div className="italic">{constraints}</div>
      </div>
    </section>
  );
}
