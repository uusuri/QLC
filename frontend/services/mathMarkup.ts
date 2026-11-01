export const MAX_MATH_LENGTH = 8192;

type MathSpan = { source: string; length: number };

function escaped(text: string, index: number) {
  let slashes = 0;
  while (index > 0 && text[--index] === "\\") slashes += 1;
  return slashes % 2 === 1;
}

/** Math is explicit: ordinary text, prices and code never become formulas automatically. */
export function readInlineMath(text: string, start: number): MathSpan | null {
  if (escaped(text, start)) return null;
  const rest = text.slice(start);
  let open: string;
  let close: string;
  if (rest.startsWith("\\(")) {
    open = "\\(";
    close = "\\)";
  } else if (rest.startsWith("$$$") && rest[3] !== "$" && text[start - 1] !== "$") {
    open = close = "$$$";
  } else if (rest.startsWith("$") && rest[1] !== "$" && text[start - 1] !== "$") {
    open = close = "$";
    if (!rest[1] || /\s/.test(rest[1])) return null;
  } else {
    return null;
  }

  const from = start + open.length;
  const limit = Math.min(text.length, from + MAX_MATH_LENGTH + close.length);
  for (let index = from; index < limit; index += 1) {
    if (text[index] === "\n") return null;
    if (!text.startsWith(close, index) || escaped(text, index)) continue;
    if (close[0] === "$" && (text[index - 1] === "$" || text[index + close.length] === "$")) continue;
    if (close === "$" && (/\s/.test(text[index - 1]) || /\d/.test(text[index + 1] ?? ""))) continue;
    const source = text.slice(from, index).trim();
    return source && source.length <= MAX_MATH_LENGTH
      ? { source, length: index + close.length - start }
      : null;
  }
  return null;
}

/** Display formulas occupy their own block; an unfinished delimiter stays ordinary Markdown. */
export function readDisplayMath(lines: readonly string[], start: number) {
  const first = lines[start]?.trim() ?? "";
  const open = first.startsWith("$$") && !first.startsWith("$$$") ? "$$"
    : first.startsWith("\\[") ? "\\[" : null;
  if (!open) return null;
  const close = open === "$$" ? "$$" : "\\]";
  let body = first.slice(open.length);
  const inlineClose = body.indexOf(close);
  if (inlineClose >= 0) {
    if (body.slice(inlineClose + close.length).trim()) return null;
    const source = body.slice(0, inlineClose).trim();
    return source && source.length <= MAX_MATH_LENGTH ? { source, nextLine: start + 1 } : null;
  }
  for (let index = start + 1; index < lines.length && index - start <= 128; index += 1) {
    if (lines[index].trim() === close) {
      const source = body.trim();
      return source && source.length <= MAX_MATH_LENGTH ? { source, nextLine: index + 1 } : null;
    }
    body += "\n" + lines[index];
    if (body.length > MAX_MATH_LENGTH) return null;
  }
  return null;
}
