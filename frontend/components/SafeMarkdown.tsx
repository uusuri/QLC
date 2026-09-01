import { memo, type ReactNode } from "react";

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
      kind: "paragraph";
      text: string;
    };

type SafeMarkdownProps = {
  markdown: string;
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
function renderInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  const appendText = (value: string) => {
    if (value) {
      nodes.push(value);
    }
  };

  while (cursor < text.length) {
    const rest = text.slice(cursor);
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
        <code className="break-all rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.9em] text-acid" key={key++}>
          {content}
        </code>
      );
      continue;
    }

    const children = renderInlineMarkdown(content);
    if (marker.length >= 2) {
      nodes.push(
        <strong className="font-black text-white" key={key++}>
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

  for (const rawLine of lines) {
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

function renderBlock(block: MarkdownBlock, index: number): ReactNode {
  if (block.kind === "code") {
    return (
      <pre
        className="overflow-x-auto rounded-2xl border border-line bg-ink p-4 text-sm leading-relaxed text-white shadow-[0_0_40px_rgba(184,255,53,0.05)]"
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
    const className = "[overflow-wrap:anywhere] font-bold leading-tight tracking-[-0.025em] text-white";

    if (block.level === 1) {
      return (
        <h2 className={`${className} text-3xl`} key={index}>
          {renderInlineMarkdown(block.text)}
        </h2>
      );
    }

    if (block.level === 2) {
      return (
        <h3 className={`${className} text-2xl`} key={index}>
          {renderInlineMarkdown(block.text)}
        </h3>
      );
    }

    return (
      <h4 className={`${className} text-xl`} key={index}>
        {renderInlineMarkdown(block.text)}
      </h4>
    );
  }

  if (block.kind === "list") {
    return (
      <ul className="grid gap-2 text-sm leading-relaxed text-white/76" key={index}>
        {block.items.map((item, itemIndex) => (
          <li className="grid grid-cols-[auto_1fr] gap-3" key={`${item}-${itemIndex}`}>
            <span className="font-black text-acid">/</span>
            <span className="min-w-0 [overflow-wrap:anywhere]">{renderInlineMarkdown(item)}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p className="[overflow-wrap:anywhere] text-sm leading-relaxed text-white/70 sm:text-base" key={index}>
      {renderInlineMarkdown(block.text)}
    </p>
  );
}

export const SafeMarkdown = memo(function SafeMarkdown({ markdown }: SafeMarkdownProps) {
  const blocks = parseMarkdown(markdown || "Описание скоро появится.");

  return <div className="grid w-full max-w-[80ch] gap-5">{blocks.map(renderBlock)}</div>;
});
