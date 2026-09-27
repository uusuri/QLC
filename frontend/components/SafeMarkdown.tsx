import { memo, type ReactNode } from "react";

type TableAlignment = "left" | "center" | "right";

type MarkdownBlock =
  | {
      code: string;
      kind: "code";
      language: string;
    }
  | {
      kind: "heading";
      level: 1 | 2 | 3;
      text: string;
    }
  | {
      items: string[];
      kind: "list";
    }
  | {
      kind: "table";
      headers: string[];
      alignments: TableAlignment[];
      rows: string[][];
    }
  | {
      kind: "paragraph";
      text: string;
    };

type MarkdownTone = "dark" | "paper";

type SafeMarkdownProps = {
  markdown: string;
  tone?: MarkdownTone;
};

const codeTokens = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:abstract|boolean|break|case|catch|class|const|continue|default|do|double|else|enum|extends|final|float|for|if|implements|import|instanceof|int|interface|long|new|package|private|protected|public|return|short|static|switch|this|throw|throws|try|void|while)\b|\b(?:String|System|Scanner|Files|Path|HttpClient|Main|Integer|Double|Boolean)\b|\b(?:true|false|null)\b|\b\d+(?:\.\d+)?\b/g;

function getCodeTokenClass(token: string) {
  if (token.startsWith("//") || token.startsWith("/*")) return "text-[#6f8174]";
  if (token.startsWith('"') || token.startsWith("'")) return "text-[#f6c177]";
  if (/^(true|false|null)$/.test(token)) return "text-[#c6a0f6]";
  if (/^\d/.test(token)) return "text-[#8bd5ca]";
  if (/^(String|System|Scanner|Files|Path|HttpClient|Main|Integer|Double|Boolean)$/.test(token)) {
    return "text-[#8aadf4]";
  }
  return "text-phosphor";
}

function renderCode(code: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  codeTokens.lastIndex = 0;
  while ((match = codeTokens.exec(code)) !== null) {
    if (match.index > cursor) nodes.push(code.slice(cursor, match.index));
    nodes.push(
      <span className={getCodeTokenClass(match[0])} key={key++}>
        {match[0]}
      </span>
    );
    cursor = match.index + match[0].length;
  }

  if (cursor < code.length) nodes.push(code.slice(cursor));
  return nodes;
}

// Рендерит базовый inline Markdown, не превращая входные данные в HTML.
// Поддерживаем **жирный**, *курсив* и `inline code`; четыре звёздочки с
// обеих сторон также считаем жирным текстом — такой вариант часто вводят
// в редакторе по привычке.
function renderInlineMarkdown(text: string, tone: MarkdownTone = "dark"): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  const appendText = (value: string) => {
    if (value) {
      const last = nodes.length - 1;
      if (typeof nodes[last] === "string") nodes[last] += value;
      else nodes.push(value);
    }
  };

  while (cursor < text.length) {
    const rest = text.slice(cursor);
    const link = rest.match(/^\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/);
    if (link) {
      nodes.push(<a key={key++} href={link[2]} target="_blank" rel="noopener noreferrer"
        className={`underline underline-offset-4 break-words ${tone === "paper" ? "text-[#3c32f5]" : "text-acid"}`}>
        {link[1]}
      </a>);
      cursor += link[0].length;
      continue;
    }
    const token = rest.match(/^(`+|\*{1,}|_{1,})/);

    if (!token) {
      appendText(text[cursor]);
      cursor += 1;
      continue;
    }

    const marker = token[0];
    const contentStart = cursor + marker.length;
    const closingIndex = text.indexOf(marker, contentStart);

    if (closingIndex === -1) {
      appendText(marker);
      cursor = contentStart;
      continue;
    }

    const content = text.slice(contentStart, closingIndex);
    if (!content) {
      appendText(marker);
      cursor = contentStart;
      continue;
    }

    cursor = closingIndex + marker.length;

    if (marker.startsWith("`")) {
      nodes.push(
        <code className={`break-all rounded-sm px-1.5 py-0.5 font-mono text-[0.9em] ${tone === "paper" ? "bg-ink/8 text-[#3c32f5]" : "bg-white/10 text-acid"}`} key={key++}>
          {content}
        </code>
      );
      continue;
    }

    const children = renderInlineMarkdown(content, tone);
    if (marker.length >= 2) {
      nodes.push(
        <strong className={`font-semibold ${tone === "paper" ? "text-ink" : "text-white"}`} key={key++}>
          {children}
        </strong>
      );
    } else {
      nodes.push(
        <em className="italic" key={key++}>
          {children}
        </em>
      );
    }
  }

  return nodes;
}

// Pipes escaped with a backslash or contained in an inline code span belong
// to the cell. A plain pipe separates cells; outer pipes are optional.
function splitTableRow(line: string) {
  const text = line.trim();
  const cells: string[] = [];
  let cell = "";
  let lastSeparator = -1;
  let cursor = 0;

  while (cursor < text.length) {
    if (text[cursor] === "\\" && (text[cursor + 1] === "|" || text[cursor + 1] === "\\")) {
      cell += text[cursor + 1];
      cursor += 2;
      continue;
    }
    if (text[cursor] === "`") {
      const marker = text.slice(cursor).match(/^`+/)![0];
      const rest = text.slice(cursor + marker.length);
      const closing = [...rest.matchAll(/`+/g)].find((match) => match[0].length === marker.length);
      if (closing) {
        const end = cursor + marker.length + closing.index! + marker.length;
        cell += text.slice(cursor, end).replace(/\\\|/g, "|");
        cursor = end;
        continue;
      }
      cell += marker;
      cursor += marker.length;
      continue;
    }
    if (text[cursor] === "|") {
      cells.push(cell.trim());
      cell = "";
      lastSeparator = cursor;
    } else {
      cell += text[cursor];
    }
    cursor += 1;
  }
  cells.push(cell.trim());
  if (text.startsWith("|")) cells.shift();
  if (lastSeparator === text.length - 1) cells.pop();
  return { cells, hasSeparator: lastSeparator >= 0 };
}

function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let code: string[] | null = null;
  let codeLanguage = "";

  const flushTextBlocks = () => {
    if (paragraph.length > 0) {
      blocks.push({
        kind: "paragraph",
        text: paragraph.join(" ").trim()
      });
      paragraph = [];
    }

    if (list.length > 0) {
      blocks.push({
        items: list,
        kind: "list"
      });
      list = [];
    }
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const rawLine = lines[lineIndex];
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (code) {
        blocks.push({
          code: code.join("\n"),
          kind: "code",
          language: codeLanguage
        });
        code = null;
        codeLanguage = "";
      } else {
        flushTextBlocks();
        code = [];
        codeLanguage = trimmed.replace(/^```/, "").trim();
      }
      continue;
    }

    if (code) {
      code.push(rawLine);
      continue;
    }

    if (!trimmed) {
      flushTextBlocks();
      continue;
    }

    if (lineIndex + 1 < lines.length) {
      const header = splitTableRow(line);
      const separator = splitTableRow(lines[lineIndex + 1]);
      if (
        (header.hasSeparator || separator.hasSeparator) && header.cells.length > 0 &&
        header.cells.length === separator.cells.length &&
        separator.cells.every((cell) => /^:?-{3,}:?$/.test(cell))
      ) {
        flushTextBlocks();
        const alignments: TableAlignment[] = separator.cells.map((cell) =>
          cell.endsWith(":") ? (cell.startsWith(":") ? "center" : "right") : "left"
        );
        const rows: string[][] = [];
        lineIndex += 1;
        while (lineIndex + 1 < lines.length) {
          const next = lines[lineIndex + 1].trim();
          if (!next || /^(#{1,3}\s|[-*]\s|```)/.test(next)) break;
          const row = splitTableRow(next);
          if (!row.hasSeparator) break;
          rows.push(header.cells.map((_, column) => row.cells[column] ?? ""));
          lineIndex += 1;
        }
        blocks.push({ kind: "table", headers: header.cells, alignments, rows });
        continue;
      }
    }

    if (trimmed.startsWith("### ")) {
      flushTextBlocks();
      blocks.push({ kind: "heading", level: 3, text: trimmed.slice(4) });
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushTextBlocks();
      blocks.push({ kind: "heading", level: 2, text: trimmed.slice(3) });
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushTextBlocks();
      blocks.push({ kind: "heading", level: 1, text: trimmed.slice(2) });
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      paragraph = paragraph.length > 0 ? paragraph : [];
      list.push(trimmed.slice(2));
      continue;
    }

    if (list.length > 0) {
      flushTextBlocks();
    }

    paragraph.push(trimmed);
  }

  if (code) {
    blocks.push({
      code: code.join("\n"),
      kind: "code",
      language: codeLanguage
    });
  }

  flushTextBlocks();
  return blocks;
}

function renderBlock(block: MarkdownBlock, index: number, tone: MarkdownTone): ReactNode {
  if (block.kind === "table") {
    const border = tone === "paper" ? "border-ink/15" : "border-white/15";
    return (
      <div
        className={`min-w-0 max-w-full overflow-x-auto rounded-sm border ${border} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
        role="region"
        aria-label={`Таблица: ${block.headers.join(", ")}`}
        tabIndex={0}
        key={index}
      >
        <table className={`w-full border-collapse text-sm leading-6 ${tone === "paper" ? "text-ink/80" : "text-white/80"}`}>
          <thead className={tone === "paper" ? "bg-ink/5 text-ink" : "bg-white/5 text-white"}>
            <tr>
              {block.headers.map((header, column) => (
                <th className={`min-w-[5rem] border-b px-4 py-3 align-top font-semibold ${border}`} scope="col" style={{ textAlign: block.alignments[column] }} key={column}>
                  {renderInlineMarkdown(header, tone)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr className={rowIndex < block.rows.length - 1 ? `border-b ${border}` : undefined} key={rowIndex}>
                {row.map((cell, column) => (
                  <td className="px-4 py-3 align-top [overflow-wrap:anywhere]" style={{ textAlign: block.alignments[column] }} key={column}>
                    {renderInlineMarkdown(cell, tone)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.kind === "code") {
    return (
      <pre
        className="min-w-0 overflow-x-auto rounded-sm border border-line bg-ink p-4 text-sm leading-7 text-white sm:p-5"
        tabIndex={0}
        key={index}
      >
        {block.language && (
          <code className="mb-3 block font-mono text-[10px] font-black uppercase text-acid">
            {block.language}
          </code>
        )}
        <code className="font-mono text-[#e8ece8]">{renderCode(block.code)}</code>
      </pre>
    );
  }

  if (block.kind === "heading") {
    const className = `[overflow-wrap:anywhere] font-semibold leading-tight tracking-[-0.025em] ${tone === "paper" ? "text-ink" : "text-white"}`;

    if (block.level === 1) {
      return (
        <h2 className={`${className} text-3xl`} key={index}>
          {renderInlineMarkdown(block.text, tone)}
        </h2>
      );
    }

    if (block.level === 2) {
      return (
        <h3 className={`${className} text-2xl`} key={index}>
          {renderInlineMarkdown(block.text, tone)}
        </h3>
      );
    }

    return (
      <h4 className={`${className} text-xl`} key={index}>
        {renderInlineMarkdown(block.text, tone)}
      </h4>
    );
  }

  if (block.kind === "list") {
    return (
      <ul className={`grid gap-3 text-base leading-7 ${tone === "paper" ? "text-ink/75" : "text-white/76"}`} key={index}>
        {block.items.map((item, itemIndex) => (
          <li className="grid grid-cols-[auto_1fr] gap-3" key={`${item}-${itemIndex}`}>
            <span aria-hidden="true" className={`font-mono ${tone === "paper" ? "text-ink/45" : "text-acid"}`}>/</span>
            <span className="min-w-0 [overflow-wrap:anywhere]">{renderInlineMarkdown(item, tone)}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p className={`[overflow-wrap:anywhere] text-base leading-[1.8] ${tone === "paper" ? "text-ink/75" : "text-white/70"}`} key={index}>
      {renderInlineMarkdown(block.text, tone)}
    </p>
  );
}

export const SafeMarkdown = memo(function SafeMarkdown({ markdown, tone = "dark" }: SafeMarkdownProps) {
  const blocks = parseMarkdown(markdown || "Описание скоро появится.");

  return <div className="kit-markdown grid w-full min-w-0 max-w-[74ch] gap-5">{blocks.map((block, index) => renderBlock(block, index, tone))}</div>;
});
