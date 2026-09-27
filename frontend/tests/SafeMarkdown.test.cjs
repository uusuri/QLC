const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const { test } = require("node:test");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const filename = path.join(__dirname, "../components/SafeMarkdown.tsx");
const compiled = new Module(filename, module);
compiled.paths = Module._nodeModulePaths(path.dirname(filename));
compiled._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 }
}).outputText, filename);
const { SafeMarkdown } = compiled.exports;
const render = (markdown, tone) => renderToStaticMarkup(React.createElement(SafeMarkdown, { markdown, tone }));

test("renders semantic tables with column alignment and inline formatting in both themes", () => {
  for (const tone of ["dark", "paper"]) {
    const html = render("| Случай | Работа | Оценка |\n| :--- | :---: | ---: |\n| **Проход** | `n` | Θ(n) |", tone);
    assert.match(html, /<table/);
    assert.equal((html.match(/scope="col"/g) || []).length, 3);
    assert.match(html, /text-align:center/);
    assert.match(html, /text-align:right/);
    assert.match(html, /<strong[^>]*>Проход<\/strong>/);
    assert.match(html, /<code[^>]*>n<\/code>/);
    assert.match(html, /overflow-x-auto/);
    assert.match(html, /tabindex="0"/);
  }
});

test("optional outer pipes, empty cells, and uneven rows keep the header column count", () => {
  const html = render("A | B\n--- | ---\none | two | ignored\n| only |\n| | end |\n\nAfter");
  assert.equal((html.match(/<td\b/g) || []).length, 6);
  assert.doesNotMatch(html, /ignored/);
  assert.match(html, /<td[^>]*><\/td>/);
  assert.match(html, /<p[^>]*>After<\/p>/);
});

test("escaped pipes and pipes in code spans stay in their own cells", () => {
  const html = render("| Expression | Value |\n| --- | --- |\n| `a | b` | left \\| right |\n| ``a `|` b`` | trailing\\| |");
  assert.equal((html.match(/<td\b/g) || []).length, 4);
  assert.match(html, /<code[^>]*>a \| b<\/code>/);
  assert.match(html, /left \| right/);
  assert.match(html, /a `\|` b/);
  assert.match(html, /trailing\|/);
});

test("invalid delimiters and ordinary pipes remain text; fenced examples remain code", () => {
  for (const markdown of ["a | b\n--- | nope", "a | b\n| --- |", "a | b", "```md\n| A | B |\n| --- | --- |\n| 1 | 2 |\n```", "| `a | b` |", "| `a | b |\nplain paragraph"]) {
    assert.doesNotMatch(render(markdown), /<table/);
  }
  const html = render("| A |\n| --- |\n| one |\n## Next\nText\n\n- Item");
  assert.match(html, /<h3[^>]*>Next<\/h3>/);
  assert.match(html, /<ul/);
});

test("HTML and unsafe link schemes are never executable in a cell", () => {
  const html = render('| A | B |\n| --- | --- |\n| <script>alert(1)</script> | [bad](javascript:alert) |\n| <img src=x onerror=alert(1)> | [source](https://example.com) |');
  assert.doesNotMatch(html, /<script|<img|href="javascript:/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /href="https:\/\/example.com"/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test("published introduction renders its three tables, two code examples and following sections", () => {
  const markdown = readFileSync(path.join(__dirname, "../../courses/algorithms/lessons/01.md"), "utf8");
  const html = render(markdown);
  assert.equal((html.match(/<table\b/g) || []).length, 3);
  assert.equal((html.match(/<pre\b/g) || []).length, 2);
  assert.match(html, /Куда уходит память/);
  assert.match(html, /https:\/\/education.yandex.ru\/handbook\/algorithms\//);
});
