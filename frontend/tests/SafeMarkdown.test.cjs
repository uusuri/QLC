const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const filename = path.join(__dirname, "../components/SafeMarkdown.tsx");
const { SafeMarkdown } = require("./load-ts.cjs")(filename);
const render = (markdown, tone) => renderToStaticMarkup(React.createElement(SafeMarkdown, { markdown, tone }));

test("code text excludes fence language labels when copied or exported", () => {
  const source = "price = int(input())\n    print(price)";
  const html = render("```text\n30\n4\n25\n```\n\n```python\n" + source + "\n```");
  const blocks = [...html.matchAll(/<pre\b[^>]*>([\s\S]*?)<\/pre>/g)];
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0][1].replace(/<[^>]*>/g, ""), "30\n4\n25");
  assert.equal(blocks[1][1].replace(/<[^>]*>/g, ""), source);
  assert.match(html, /aria-label="Код: python"/);
  assert.match(html, /data-language="python"/);
});

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

test("mixed theory keeps tables, code blocks and following sections", () => {
  const markdown = [
    "# Сложность алгоритма", "", "| Алгоритм | Оценка |", "| --- | --- |", "| Один проход | O(n) |", "",
    "```cpp", "for (int i = 0; i < n; ++i) work();", "```", "",
    "| Чисел | Сравнений |", "| ---: | ---: |", "| 10 | 9 |", "",
    "```python", "for value in values:", "    work(value)", "```", "",
    "## Куда уходит память", "", "| Структура | Память |", "| --- | --- |", "| Массив | O(n) |", "",
    "После таблицы остаётся обычный текст.", "", "[Источник](https://example.com/theory)"
  ].join("\n");
  const html = render(markdown);
  assert.equal((html.match(/<table\b/g) || []).length, 3);
  assert.equal((html.match(/<pre\b/g) || []).length, 2);
  assert.match(html, /Куда уходит память/);
  assert.match(html, /После таблицы остаётся обычный текст/);
  assert.match(html, /href="https:\/\/example.com\/theory"/);
});

test("course links open a specific practice task in the same window", () => {
  for (const tone of ["dark", "paper"]) {
    const html = render("[k-й предок](/lessons/144?task=343)", tone);
    assert.match(html, /href="\/lessons\/144\?task=343"/);
    assert.doesNotMatch(html, /target="_blank"/);
  }
});

test("relative links cannot turn into protocol-relative or backslash URLs", () => {
  for (const target of ["//example.com", "/\\example.com", "/lessons\\evil", "javascript:alert", "data:text/html,hello"]) {
    assert.doesNotMatch(render(`[link](${target})`), /<a\b/);
  }
});

test("numbered learning steps render as a semantic list in both themes", () => {
  for (const tone of ["dark", "paper"]) {
    const html = render("3. Прочитать **пары**\n4. Вызвать `sort`\n5. [Решить](/lessons/34?task=75)", tone);
    assert.match(html, /<ol start="3"/);
    assert.equal((html.match(/<li\b/g) || []).length, 3);
    assert.match(html, /<strong[^>]*>пары<\/strong>/);
    assert.match(html, /href="\/lessons\/34\?task=75"/);
    assert.doesNotMatch(html, /<p\b|3\. Прочитать/);
  }
});

test("paragraphs, numbered steps and bullet lists retain their original order", () => {
  const html = render("До\n1. Первый\n2. Второй\n- Проверка\nПосле");
  assert.ok(html.indexOf("До") < html.indexOf("<ol"));
  assert.ok(html.indexOf("</ol>") < html.indexOf("<ul"));
  assert.ok(html.indexOf("</ul>") < html.indexOf("После"));
  assert.equal((html.match(/<li\b/g) || []).length, 3);
});

test("numbered lists end tables and remain literal inside code", () => {
  const html = render("| Шаг |\n| --- |\n| Данные |\n1) Проверить `a | b`\n\n```text\n1. Это вывод программы\n```");
  assert.equal((html.match(/<td\b/g) || []).length, 1);
  assert.match(html, /<ol start="1"/);
  assert.match(html, /<code[^>]*>a \| b<\/code>/);
  assert.equal((html.match(/<ol\b/g) || []).length, 1);
  assert.match(html, /Это вывод программы/);
});
