const assert = require("node:assert/strict");
const path = require("node:path");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const load = require("./load-ts.cjs");
const { readProblemStatement, MAX_PROBLEM_SOURCE_LENGTH } = load(path.join(__dirname, "../services/problemStatement.ts"));
const { SafeMarkdown } = load(path.join(__dirname, "../components/SafeMarkdown.tsx"));
const render = (markdown, tone = "dark") => renderToStaticMarkup(React.createElement(SafeMarkdown, { markdown, tone }));
const source = [
  ":::problem Хватит ли мест?", "## Условие", "В зале **n** рядов по `m` мест. Хватит ли их для `k` человек?",
  "## Ввод", "Три целых числа `n m k`.", "## Вывод", "Напечатайте `YES` или `NO`.",
  "## Ограничения", "`1 ≤ n, m ≤ 100`, `1 ≤ k ≤ 10 000`.", ":::"
].join("\n");

test("problem directive parses all four sections and leaves following Markdown", () => {
  const lines = (source + "\n\n## Решение\nПосле карточки.").split("\n");
  const result = readProblemStatement(lines, 0);
  assert.equal(result.kind, "problem");
  assert.equal(result.statement.title, "Хватит ли мест?");
  assert.equal(result.nextLine, 10);
  const html = render(lines.join("\n"));
  assert.equal((html.match(/data-problem-statement=/g) || []).length, 1);
  assert.ok(html.indexOf("</section>") < html.indexOf("Решение"));
  assert.match(html, /<strong[^>]*>n<\/strong>/);
  assert.match(html, /<code[^>]*>m<\/code>/);
  assert.match(html, /После карточки/);
});

test("compact responsive layout stacks on narrow screens and works in both tones", () => {
  for (const tone of ["dark", "paper"]) {
    const html = render(source, tone);
    assert.match(html, /<section aria-label="Хватит ли мест\?"/);
    assert.match(html, /grid-cols-1 border-t sm:grid-cols-2/);
    assert.match(html, /min-w-0/);
    assert.match(html, /max-w-\[74ch\]/);
    assert.match(html, /sm:border-l sm:border-t-0/);
    assert.doesNotMatch(html, /min-w-\[|style="width:|<button/);
    assert.equal((html.match(/<h4\b/g) || []).length, 4);
  }
});

test("paper card text colours outrank the later legacy Markdown CSS without changing dark cards", async () => {
  const postcss = require("postcss");
  const tailwindcss = require("tailwindcss");
  const paper = render(source, "paper");
  const dark = render(source, "dark");
  const config = load(path.join(__dirname, "../tailwind.config.ts")).default;
  assert.match(paper, /\[&amp;_\.kit-markdown&gt;p\]:text-ink\/75/);
  const raw = readFileSync(path.join(__dirname, "../components/ProblemStatementCard.tsx"), "utf8")
    + readFileSync(path.join(__dirname, "../components/SafeMarkdown.tsx"), "utf8");
  const css = await postcss([tailwindcss({ ...config, content: [{ raw, extension: "tsx" }] })])
    .process(readFileSync(path.join(__dirname, "../app/globals.css"), "utf8"), { from: undefined });
  const rules = [];
  css.root.walkRules((rule) => rules.push(rule));
  const legacy = rules.find((rule) => rule.selector === ".kit-markdown p,.kit-markdown li");
  assert.ok(legacy, "the actual legacy override is included in the cascade test");
  const ordinary = rules.find((rule) => rule.selector === ".text-ink\\/75");
  assert.ok(ordinary && rules.indexOf(ordinary) < rules.indexOf(legacy), "ordinary text utilities lose to the later legacy rule");
  for (const suffix of [" .kit-markdown>p", " .kit-markdown>ul>li", " .kit-markdown>ol>li"]) {
    const scoped = rules.find((rule) => rule.selector.endsWith(suffix));
    assert.ok(scoped, `Tailwind generated the scoped ${suffix} selector`);
    assert.match(scoped.selector, /^\.\\\[/, "extra utility class raises specificity above legacy .kit-markdown p/li");
    assert.equal(scoped.nodes.find((node) => node.prop === "color")?.value, "rgb(10 10 10 / 0.75)");
  }
  assert.doesNotMatch(dark, /\[&amp;_\.kit-markdown&gt;(?:p|ul|ol)/);
});

test("code fences may contain section labels, closing delimiters and directive examples", () => {
  const markdown = source.replace("Три целых числа `n m k`.", "```text\n:::problem Пример\n## Вывод\n:::\n2 3 6\n```");
  const result = readProblemStatement(markdown.split("\n"), 0);
  assert.equal(result.kind, "problem");
  assert.match(result.statement.input, /:::problem Пример\n## Вывод\n:::/);
  const html = render(markdown);
  assert.equal((html.match(/data-problem-statement=/g) || []).length, 1);
  assert.match(html, /<pre/);
  assert.match(html.replace(/<[^>]*>/g, ""), /2 3 6/);
  assert.doesNotMatch(render("```markdown\n" + source + "\n```"), /data-problem-statement=/);
  assert.doesNotMatch(render("~~~markdown\n" + source + "\n~~~"), /data-problem-statement=/);
  const longFence = source.replace("Три целых числа `n m k`.", "````text\n```\n:::\n```\n````");
  const longHtml = render(longFence);
  assert.equal((longHtml.match(/data-problem-statement=/g) || []).length, 1);
  assert.match(longHtml, /<pre[\s\S]*?```\n:::\n```/);
});

test("missing or duplicate sections and nested problems remain visible source", () => {
  const cases = [
    source.replace("Хватит ли мест?", ""),
    source.replace("## Ограничения\n`1 ≤ n, m ≤ 100`, `1 ≤ k ≤ 10 000`.\n", ""),
    source.replace("## Ограничения", "## Ввод"),
    source.replace("## Ограничения", "## Что-то другое"),
    source.replace("## Ввод\nТри целых числа `n m k`.", "## Ввод\n"),
    source.replace("## Вывод", ":::problem Вложенная задача\n:::\n## Вывод")
  ];
  for (const markdown of cases) {
    const html = render(markdown + "\n\n## Следом\nСоседний текст.");
    assert.doesNotMatch(html, /data-problem-statement=/);
    assert.match(html, /:::problem/);
    assert.match(html, /<h3[^>]*>Следом<\/h3>/);
    assert.match(html, /Соседний текст/);
  }
});

test("unterminated or oversized directives do not swallow following Markdown", () => {
  for (const markdown of [source.replace(/\n:::$/, ""), ":::problem Заголовок\n" + "x".repeat(MAX_PROBLEM_SOURCE_LENGTH)]) {
    const html = render(markdown + "\n\n## Следом\nПоследний абзац.");
    assert.doesNotMatch(html, /data-problem-statement=/);
    assert.match(html, /<h3[^>]*>Следом<\/h3>/);
    assert.match(html, /Последний абзац/);
  }
});

test("problem sections escape HTML and unsafe URLs while keeping safe Markdown", () => {
  const html = render(source.replace("В зале **n** рядов", '<script>alert(1)</script> <img src=x onerror=alert(1)> [bad](javascript:alert) [ok](https://example.com) В зале **n** рядов'));
  assert.doesNotMatch(html, /<script|<img|href="javascript:/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /href="https:\/\/example.com"/);
  assert.match(html, /rel="noopener noreferrer"/);
});
