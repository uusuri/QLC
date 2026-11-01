const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");
const load = require("./load-ts.cjs");
const { publicExampleTests, runTestsError } = load(path.join(__dirname, "../services/codeRuns.ts"));
const example = "## Пример\n\nВвод:\n\n```text\n3 5\n```\n\nВывод:\n\n```text\n8\n```\n";

test("public examples become editable tests with their expected outputs", () => {
  assert.deepEqual(publicExampleTests(example), [{ input: "3 5\n", output: "8\n" }]);
  assert.equal(publicExampleTests(example + example.replace("## Пример", "## Пример 2")).length, 2);
});
test("does not treat input specifications or solution code as examples", () => {
  assert.deepEqual(publicExampleTests(example.replace("## Пример\n", "")), []);
  assert.equal(publicExampleTests(example + "## Решение\nВвод:\n```text\nsecret\n```\nВывод:\n```text\nsecret\n```").length, 1);
  assert.deepEqual(publicExampleTests("````markdown\n" + example + "````"), []);
});
test("supports bold labels, nested headings, tilde fences and CRLF", () => {
  const markdown = example.replace("Ввод:", "**Входные данные:**").replace("Вывод:", "### Выходные данные").replaceAll("```", "~~~").replaceAll("\n", "\r\n");
  assert.deepEqual(publicExampleTests(markdown), [{ input: "3 5\n", output: "8\n" }]);
});
test("empty input/output is real data; a missing expected answer is not guessed", () => {
  assert.deepEqual(publicExampleTests(example.replace("3 5\n", "").replace("8\n", "")), [{ input: "", output: "" }]);
  assert.deepEqual(publicExampleTests(example.split("Вывод:")[0]), []);
  assert.deepEqual(publicExampleTests(example.slice(0, -5)), []);
});
test("limits public examples to ten", () => assert.equal(publicExampleTests(example.repeat(20)).length, 10));
test("validates UTF-8 bytes and aggregate size but allows no-input runs", () => {
  assert.equal(runTestsError([{ input: "", output: null }]), null);
  assert.ok(runTestsError([]));
  assert.ok(runTestsError(Array.from({ length: 11 }, () => ({ input: "", output: null }))));
  assert.ok(runTestsError([{ input: "я".repeat(9000), output: null }]));
  assert.ok(runTestsError(Array.from({ length: 5 }, () => ({ input: "x".repeat(16384), output: null }))));
});
