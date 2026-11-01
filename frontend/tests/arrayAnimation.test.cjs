const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const load = require("./load-ts.cjs");
const { parseArrayAnimation, parseArrayValues, blankArrayAnimation, arrayFence, findArrayBlocks, insertArrayBlock, ARRAY_LIMITS } = load(path.join(__dirname, "../services/arrayAnimation.ts"));
const { ArrayFrame, ArrayAnimationPlayer } = load(path.join(__dirname, "../components/array/ArrayAnimationPlayer.tsx"));
const { ArrayAnimationEditor } = load(path.join(__dirname, "../components/array/ArrayAnimationEditor.tsx"));
const { SafeMarkdown } = load(path.join(__dirname, "../components/SafeMarkdown.tsx"));
const { graphPreset } = load(path.join(__dirname, "../services/graphPresets.ts"));
const { graphFence } = load(path.join(__dirname, "../services/graphAnimation.ts"));

function searching() {
  return { version: 1, title: "Поиск числа 7", steps: [
    { values: [1, 4, 7, 9], caption: "Сравниваем среднюю ячейку с искомым числом.", highlights: [2],
      pointers: [{ label: "left", index: 0 }, { label: "right", index: 4 }, { label: "mid", index: 2 }], range: { from: 0, to: 4 } },
    { values: [1, 4, 7, 9], caption: "Искомое число найдено.", highlights: [2], pointers: [{ label: "mid", index: 2 }], range: { from: 2, to: 3 } }
  ] };
}

test("array snapshots validate, round-trip and render through both Markdown themes", () => {
  const animation = searching(), before = JSON.stringify(animation);
  const markdown = `До\n\n${arrayFence(animation)}\n\nПосле`;
  const [block] = findArrayBlocks(markdown);
  assert.equal(markdown.slice(block.start, block.end), arrayFence(animation));
  assert.deepEqual(parseArrayAnimation(block.source), parseArrayAnimation(before));
  assert.equal(JSON.stringify(animation), before);
  for (const tone of ["dark", "paper"]) {
    const html = renderToStaticMarkup(React.createElement(SafeMarkdown, { markdown, tone }));
    assert.match(html, /Массив: Поиск числа 7/);
    assert.match(html, /Воспроизвести/);
    assert.match(html, /Шаг анимации массива/);
    assert.match(html, /Граница 4/);
    assert.match(html, /Индекс 2, значение 7, выделено/);
    assert.match(html, /После/);
    assert.doesNotMatch(html, /<pre/);
  }
});

test("supports boundary pointers, half-open empty ranges and empty arrays", () => {
  for (const length of [0, 1, 4]) {
    const animation = blankArrayAnimation();
    animation.steps[0] = { values: Array(length).fill(0), caption: "Пустой диапазон", highlights: [],
      pointers: [{ label: "prev", index: -1 }, { label: "right", index: length }], range: { from: length, to: length } };
    const parsed = parseArrayAnimation(JSON.stringify(animation));
    const html = renderToStaticMarkup(React.createElement(ArrayFrame, { step: parsed.steps[0] }));
    assert.match(html, /Граница -1/); assert.match(html, new RegExp(`Граница ${length}`));
    assert.match(html, /— пусто/);
    if (!length) assert.match(html, /Пустой массив/);
  }
});

test("swap steps retain independent full values and mark both indices", () => {
  const animation = blankArrayAnimation();
  animation.steps[0].swap = [0, 2];
  animation.steps.push({ values: [1, 3, 2], caption: "Поменяли значения местами.", pointers: [], highlights: [0, 2] });
  const parsed = parseArrayAnimation(JSON.stringify(animation));
  assert.deepEqual(parsed.steps[0].values, [2, 3, 1]);
  assert.deepEqual(parsed.steps[1].values, [1, 3, 2]);
  const before = renderToStaticMarkup(React.createElement(ArrayFrame, { step: parsed.steps[0] }));
  const after = renderToStaticMarkup(React.createElement(ArrayFrame, { step: parsed.steps[1] }));
  assert.match(before, /Индекс 0, значение 2, обмен/); assert.match(before, /Обмен: 0 ↔ 2/);
  assert.match(after, /Индекс 0, значение 1, выделено/);
});

test("rejects malformed shapes, changing lengths and invalid references", () => {
  const invalid = mutate => { const animation = searching(); mutate(animation); assert.throws(() => parseArrayAnimation(JSON.stringify(animation))); };
  invalid(a => { a.version = 2; });
  invalid(a => { a.steps = []; });
  invalid(a => { a.steps[0].values = "[1, 4, 7, 9]"; });
  invalid(a => { a.steps[1].values.pop(); });
  invalid(a => { a.steps[0].values[0] = { value: 4 }; });
  invalid(a => { a.steps[0].values[0] = true; });
  invalid(a => { a.steps[0].values[0] = Number.MAX_SAFE_INTEGER + 1; });
  invalid(a => { a.steps[0].values[0] = "x".repeat(33); });
  invalid(a => { a.steps[0].highlights = [-1]; });
  invalid(a => { a.steps[0].highlights = [4]; });
  invalid(a => { a.steps[0].highlights = [1, 1]; });
  invalid(a => { a.steps[0].pointers = [{ label: "i", index: 1.5 }]; });
  invalid(a => { a.steps[0].pointers = [{ label: "i", index: -2 }]; });
  invalid(a => { a.steps[0].pointers = [{ label: "i", index: 5 }]; });
  invalid(a => { a.steps[0].pointers = [{ label: " ", index: 0 }]; });
  invalid(a => { a.steps[0].pointers = [{ label: "i", index: 1 }, { label: "i", index: 2 }]; });
  invalid(a => { a.steps[0].range = { from: 3, to: 2 }; });
  invalid(a => { a.steps[0].range = { from: -1, to: 2 }; });
  invalid(a => { a.steps[0].range = { from: 0, to: 5 }; });
  invalid(a => { a.steps[0].swap = [0]; });
  invalid(a => { a.steps[0].swap = [0, 4]; });
  invalid(a => { a.steps[0].swap = [0, 0]; });
  assert.throws(() => parseArrayAnimation("{}"));
  assert.throws(() => parseArrayAnimation("null"));
  assert.throws(() => parseArrayAnimation("not json"));
});

test("enforces source, cell, step, pointer and text limits", () => {
  const invalid = mutate => { const animation = blankArrayAnimation(); mutate(animation); assert.throws(() => parseArrayAnimation(JSON.stringify(animation))); };
  invalid(a => { a.steps[0].values = Array(ARRAY_LIMITS.cells + 1).fill(1); });
  invalid(a => { a.steps = Array(ARRAY_LIMITS.steps + 1).fill(a.steps[0]); });
  invalid(a => { a.steps[0].pointers = Array.from({ length: ARRAY_LIMITS.pointers + 1 }, (_, i) => ({ label: `p${i}`, index: 0 })); });
  invalid(a => { a.steps[0].caption = "x".repeat(1001); });
  invalid(a => { a.title = "x".repeat(161); });
  assert.throws(() => parseArrayAnimation(" ".repeat(ARRAY_LIMITS.source + 1)));
  assert.throws(() => parseArrayValues(" ".repeat(10_001)));
});

test("values input accepts only bounded JSON numbers and strings", () => {
  assert.deepEqual(parseArrayValues('[1, -2, 0.5, "а", ""]'), [1, -2, 0.5, "а", ""]);
  assert.deepEqual(parseArrayValues("[]"), []);
  for (const text of ['[1,]', "1, 2", "{}", '["x", null]', "[1e309]", "(()=>[1])()", '["x".repeat(100)]']) {
    assert.throws(() => parseArrayValues(text));
  }
});

test("mixed graph, array and code fences keep precise ranges with CRLF", () => {
  const array = arrayFence(searching());
  const markdown = ("```js\nqlc-array\n```\n\n" + graphFence(graphPreset("blank")) + "\n\n" + array + "\nМежду\n" + array).replace(/\n/g, "\r\n");
  const blocks = findArrayBlocks(markdown);
  assert.equal(blocks.length, 2);
  for (const block of blocks) assert.equal(markdown.slice(block.start, block.end).replace(/\r\n/g, "\n"), array);
  assert.equal(findArrayBlocks("```qlc-array\n{}").length, 0);
});

test("inserting and editing preserves neighboring theory and other animation types", () => {
  const animation = searching(), original = "До\n\nПосле";
  const inserted = insertArrayBlock(original, 4, 4, animation);
  assert.equal(inserted, `До\n\n${arrayFence(animation)}\n\nПосле`);
  const [range] = findArrayBlocks(inserted);
  animation.title = "Другой заголовок";
  const replaced = insertArrayBlock(inserted, range.start, range.end, animation);
  assert.equal(replaced, `До\n\n${arrayFence(animation)}\n\nПосле`);
  assert.equal(insertArrayBlock("", 0, 0, animation), arrayFence(animation));
  assert.throws(() => insertArrayBlock(original, -1, 0, animation));
  assert.throws(() => insertArrayBlock(original, 4, 2, animation));
});

test("unsafe-looking captions and values stay escaped text and cannot close a fence", () => {
  const animation = blankArrayAnimation();
  animation.title = '<img src=x onerror="alert(1)">';
  animation.steps[0].caption = "<script>alert(1)</script>\n```\n# Заголовок";
  animation.steps[0].values[0] = "<b>5</b>";
  const fenced = arrayFence(animation);
  assert.equal((fenced.match(/```/g) || []).length, 2);
  assert.equal(parseArrayAnimation(findArrayBlocks(fenced)[0].source).steps[0].caption, animation.steps[0].caption);
  const html = renderToStaticMarkup(React.createElement(SafeMarkdown, { markdown: fenced }));
  assert.doesNotMatch(html, /<script>|<img|<b>/);
  assert.match(html, /&lt;script&gt;/); assert.match(html, /&lt;b&gt;5&lt;\/b&gt;/);
});

test("invalid arrays do not break surrounding Markdown", () => {
  const html = renderToStaticMarkup(React.createElement(SafeMarkdown, { markdown: "До\n\n```qlc-array\n{}\n```\n\nПосле" }));
  assert.match(html, /Не удалось показать массив/); assert.match(html, /После/);
});

test("player and editor expose manual navigation and complete snapshot editing", () => {
  const animation = searching();
  const player = renderToStaticMarkup(React.createElement(ArrayAnimationPlayer, { animation }));
  assert.match(player, /Назад/); assert.match(player, /Вперёд/); assert.match(player, /В начало/);
  assert.match(player, /Скорость анимации массива/); assert.doesNotMatch(player, />Пауза</);
  const editor = renderToStaticMarkup(React.createElement(ArrayAnimationEditor, { initial: animation, onApply() {}, onCancel() {} }));
  for (const label of ["Значения на шаге", "Добавить шаг-копию", "Диапазон", "Отметить обмен", "Вставить в теорию", "Название указателя массива 1"]) assert.ok(editor.includes(label), label);
});

test("caption and legend reserve bounded scrollable space and long text wraps", () => {
  const animation = searching();
  animation.title = "a".repeat(160);
  animation.steps[0].caption = "x".repeat(1000);
  const html = renderToStaticMarkup(React.createElement(ArrayAnimationPlayer, { animation }));
  assert.match(html, /<h3 class="[^"]*\[overflow-wrap:anywhere\]/);
  assert.match(html, /<p class="[^"]*h-\[4\.5rem\][^"]*overflow-y-auto[^"]*\[overflow-wrap:anywhere\]/);
  assert.match(html, /<div class="[^"]*h-8[^"]*flex-wrap[^"]*overflow-y-auto[^>]*aria-label="Диапазон и обмен"/);
  assert.match(html, /aria-label="Описание шага"/);
});
