const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const load = require("./load-ts.cjs");
const { SafeMarkdown } = load(path.join(__dirname, "../components/SafeMarkdown.tsx"));
const { readInlineMath, readDisplayMath, MAX_MATH_LENGTH } = load(path.join(__dirname, "../services/mathMarkup.ts"));
const render = (markdown, tone = "dark") => renderToStaticMarkup(React.createElement(SafeMarkdown, { markdown, tone }));

test("inline math renders italic variables, indices and powers without Markdown consuming underscores", () => {
  const html = render("Даны $a_i$ и $1 \\le n \\le 10^5$.");
  assert.equal((html.match(/data-math="inline"/g) || []).length, 2);
  assert.match(html, /<msub>/);
  assert.match(html, /<msup>/);
  assert.match(html, /class="mord mathnormal"/);
  assert.doesNotMatch(html, /<em|<code/);
});

test("standard and Codeforces inline delimiters work next to punctuation and emphasis", () => {
  for (const markdown of ["($n$),", "**\\(a_i^2\\)**", "$$$a_i$$$, $$$10^{12}$$$"]) {
    assert.match(render(markdown), /data-math="inline"/);
  }
  assert.match(render("**$n$**"), /<strong[^>]*><span class="qlc-math-inline"/);
});

test("display sums and products keep their limits and the following paragraph", () => {
  for (const markdown of [
    "До\n\n$$\n\\sum_{i=1}^{n} a_i + \\prod_{j=1}^{m} b_j\n$$\n\nПосле",
    "\\[\\sum_{i=1}^{n} a_i\\]\n\nПосле",
    "$$\\prod_{i=1}^{n} a_i$$\n\nПосле"
  ]) {
    const html = render(markdown);
    assert.match(html, /data-math="display"/);
    assert.match(html, /<munderover>/);
    assert.match(html, /После/);
    assert.doesNotMatch(html, /<p[^>]*><div/);
  }
});

test("math works inside all four problem sections and both themes", () => {
  const markdown = [":::problem Массив $a_i$", "## Условие", "Даны $n$ значений $a_1, \\dots, a_n$.",
    "## Ввод", "Сначала $n$, затем $a_i$.", "## Вывод", "Выведите $s$.",
    "## Ограничения", "- $1 \\le n \\le 2 \\cdot 10^5$;", "- $0 \\le a_i \\le 10^9$.", ":::"].join("\n");
  for (const tone of ["dark", "paper"]) {
    const html = render(markdown, tone);
    assert.match(html, /data-problem-statement/);
    assert.equal((html.match(/data-math="inline"/g) || []).length, 8);
    const visible = html.replace(/<annotation\b[^>]*>[\s\S]*?<\/annotation>/g, "");
    assert.doesNotMatch(visible, /:::problem|\\le|\\cdot/);
  }
});

test("pipes inside math stay in their table cell", () => {
  const html = render("| Модуль | Элемент |\n| --- | --- |\n| $|x|$ | $a_i$ |");
  assert.equal((html.match(/<td\b/g) || []).length, 2);
  assert.equal((html.match(/data-math="inline"/g) || []).length, 2);
});

test("inline code and fenced examples preserve formula source literally", () => {
  const html = render("`$a_i$`\n\n```text\n$$\n\\sum_{i=1}^{n} a_i\n$$\n10^5\n```");
  assert.doesNotMatch(html, /data-math|class="katex/);
  assert.match(html, /\$a_i\$/);
  assert.match(html.replace(/<[^>]*>/g, ""), /\\sum_\{i=1\}\^\{n\} a_i/);
});

test("prices, escaped dollars and unfinished expressions stay visible text", () => {
  for (const markdown of ["Цена $10 или $20.", "\\$n\\$", "$a_i", "$$a_i", "$$\na_i\n\nПосле", "\\[a_i"]) {
    assert.doesNotMatch(render(markdown), /data-math/);
  }
  assert.equal(readInlineMath("$" + "a".repeat(MAX_MATH_LENGTH + 1) + "$", 0), null);
  assert.equal(readDisplayMath(["$$", "a".repeat(MAX_MATH_LENGTH + 1), "$$"], 0), null);
});

test("invalid math and untrusted commands cannot inject HTML, links, attributes or resources", () => {
  for (const source of [
    "\\href{javascript:alert(1)}{x}", "\\includegraphics{https://example.com/tracker.png}",
    "\\htmlClass{injected}{x}", "\\unknown{<img src=x onerror=alert(1)>}", "\\def\\f{\\f}\\f"
  ]) {
    const html = render("$" + source + "$\n\nПосле");
    assert.match(html, /После/);
    assert.doesNotMatch(html, /<script|<img\b|<a\b|onerror="|class="injected|src="https:/);
  }
  const html = render("$\\unknown{<script>alert(1)</script>}$");
  assert.match(html, /&lt;script&gt;/);
});

test("macros do not leak into another formula", () => {
  const html = render("$\\gdef\\private{n}\\private$ и $\\private$");
  assert.match(html, /qlc-math-fallback/);
  assert.equal((html.match(/data-math="inline"/g) || []).length, 1);
});
