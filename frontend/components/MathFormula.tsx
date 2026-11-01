import { memo } from "react";
import katex from "katex";
import { MAX_MATH_LENGTH } from "../services/mathMarkup";

export const MathFormula = memo(function MathFormula({ source, display = false }: { source: string; display?: boolean }) {
  let markup: string;
  try {
    if (source.length > MAX_MATH_LENGTH) throw new Error("Formula too long");
    markup = katex.renderToString(source, {
      displayMode: display,
      output: "htmlAndMathml",
      throwOnError: true,
      trust: false,
      strict: "ignore",
      maxExpand: 1000,
      maxSize: 20,
      macros: {}
    });
  } catch {
    // React escapes the source; neither parser errors nor raw author HTML are injected.
    return <span className="qlc-math-fallback">{source}</span>;
  }

  // Only KaTeX-generated markup reaches this sink, with untrusted commands disabled.
  return display
    ? <div className="qlc-math-display" data-math="display" dangerouslySetInnerHTML={{ __html: markup }} />
    : <span className="qlc-math-inline" data-math="inline" dangerouslySetInnerHTML={{ __html: markup }} />;
});
