// ReactNode нужен для типизации массива JSX-блоков.
import type { ReactNode } from "react";

// Тип блока после простого markdown-парсинга.
type MarkdownBlock =
  | {
      // code — fenced code block.
      code: string;
      kind: "code";
      language: string;
    }
  | {
      // heading — строка #/##/###.
      kind: "heading";
      level: 1 | 2 | 3;
      text: string;
    }
  | {
      // list — набор строк - item.
      items: string[];
      kind: "list";
    }
  | {
      // paragraph — обычный текст.
      kind: "paragraph";
      text: string;
    };

// Props markdown-компонента.
type SafeMarkdownProps = {
  // markdown — исходная строка из backend DTO.
  markdown: string;
};

// Разбирает markdown в ограниченный набор безопасных блоков.
function parseMarkdown(markdown: string): MarkdownBlock[] {
  // Нормализуем переносы строк, чтобы mac/windows/linux работали одинаково.
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let code: string[] | null = null;
  let codeLanguage = "";

  // Сбрасывает накопленный paragraph/list перед новым типом блока.
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

// Рендерит один markdown-блок в JSX без raw HTML.
function renderBlock(block: MarkdownBlock, index: number): ReactNode {
  if (block.kind === "code") {
    return (
      <pre
        className="overflow-x-auto border border-line bg-ink p-4 text-sm leading-relaxed text-white"
        key={index}
      >
        {block.language && (
          <code className="mb-3 block font-mono text-[10px] font-black uppercase text-acid">
            {block.language}
          </code>
        )}
        <code>{block.code}</code>
      </pre>
    );
  }

  if (block.kind === "heading") {
    const className = "font-black uppercase leading-tight text-white";

    if (block.level === 1) {
      return (
        <h2 className={`${className} text-3xl`} key={index}>
          {block.text}
        </h2>
      );
    }

    if (block.level === 2) {
      return (
        <h3 className={`${className} text-2xl`} key={index}>
          {block.text}
        </h3>
      );
    }

    return (
      <h4 className={`${className} text-xl`} key={index}>
        {block.text}
      </h4>
    );
  }

  if (block.kind === "list") {
    return (
      <ul className="grid gap-2 text-sm leading-relaxed text-white/72" key={index}>
        {block.items.map((item, itemIndex) => (
          <li className="grid grid-cols-[auto_1fr] gap-3" key={`${item}-${itemIndex}`}>
            <span className="font-black text-acid">/</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p className="text-sm leading-relaxed text-white/70 sm:text-base" key={index}>
      {block.text}
    </p>
  );
}

// SafeMarkdown — ограниченный markdown-render для backend строк.
export function SafeMarkdown({ markdown }: SafeMarkdownProps) {
  const blocks = parseMarkdown(markdown || "Описание скоро появится.");

  return <div className="grid gap-5">{blocks.map(renderBlock)}</div>;
}
