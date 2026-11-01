const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const { indexCourseProgram, filterCourseProgram, parseProgramSnapshot, emptyProgramState } = require("./load-ts.cjs")(path.join(__dirname, "../services/courseProgram.ts"));
const modules = Array.from({ length: 33 }, (_, m) => ({
  module: { id: m + 1, name: `Модуль ${m + 1}`, level: Math.floor(m / 11) + 1 },
  lessons: Array.from({ length: 9 }, (_, n) => ({ id: m * 9 + n + 1, name: `Урок ${m * 9 + n + 1}`, description: "Алгоритмы", published: true }))
}));
modules[0].lessons[2].name = "Бинарный поиск";
modules[12].lessons[4].description = "Подсчёт рёбер графа";

test("indexes all 297 published lessons with stable course-wide numbers", () => {
  const indexed = indexCourseProgram(modules);
  assert.equal(indexed.flatMap(item => item.lessons).length, 297);
  assert.equal(indexed.at(-1).lessons.at(-1).number, 297);
  const source = structuredClone(modules);
  source[0].lessons[0].published = false;
  assert.equal(indexCourseProgram(source)[0].lessons[0].number, 1);
  assert.equal(indexCourseProgram(source).flatMap(item => item.lessons).length, 296);
});

test("search ignores case/extra whitespace and ё, matches all query words and descriptions", () => {
  const index = indexCourseProgram(modules);
  const search = query => filterCourseProgram(index, { ...emptyProgramState, query }).flatMap(item => item.lessons);
  assert.equal(search("  ПОИСК   бинарный  ")[0].id, 3);
  assert.equal(search("ребер подсчет").length, 1);
  assert.equal(search("297")[0].number, 297);
  assert.equal(search("003")[0].number, 3);
  assert.equal(search("missing").length, 0);
  assert.equal(search("   ").length, 297);
});

test("module name search preserves original lesson numbering", () => {
  const indexed = indexCourseProgram(modules);
  const result = filterCourseProgram(indexed, { query: "Модуль 33" }).find(item => item.module.id === 33);
  assert.equal(result.lessons.length, 9);
  assert.equal(result.lessons[0].number, 289);
});

test("unassigned modules remain searchable and unpublished lessons never appear", () => {
  const source = [{ module: { id: 70, name: "Дополнительно", level: null }, lessons: [
    { id: 1, name: "Открытый", published: true }, { id: 2, name: "Секрет", published: false }
  ] }];
  const index = indexCourseProgram(source);
  assert.equal(filterCourseProgram(index, emptyProgramState)[0].lessons.length, 1);
  assert.equal(filterCourseProgram(index, { ...emptyProgramState, query: "Секрет" }).length, 0);
});

test("validates saved navigation, removes deleted IDs and rejects corrupt storage", () => {
  const snapshot = { version: 1, state: { ...emptyProgramState, query: "Урок", expanded: [1, 33, 999], outline: 297 }, scrollY: 4300, anchor: { id: 297, offset: 300 } };
  const restored = parseProgramSnapshot(JSON.stringify(snapshot), modules);
  assert.deepEqual(restored.state.expanded, [1, 33]);
  assert.equal(restored.state.outline, 297);
  assert.deepEqual(restored.anchor, snapshot.anchor);
  for (const raw of [null, "oops", "{}", JSON.stringify({ ...snapshot, version: 2 }), JSON.stringify({ ...snapshot, scrollY: -1 }), JSON.stringify({ ...snapshot, state: { ...snapshot.state, expanded: null } })]) {
    assert.equal(parseProgramSnapshot(raw, modules), null);
  }
  const mismatched = parseProgramSnapshot(JSON.stringify({ ...snapshot, state: { ...snapshot.state, level: "1", moduleId: 33, outline: 999 } }), modules);
  assert.equal("moduleId" in mismatched.state, false);
  assert.equal("level" in mismatched.state, false);
  assert.equal(filterCourseProgram(indexCourseProgram(modules), mismatched.state).flatMap(item => item.lessons).length, 296);
  assert.equal(mismatched.state.outline, null);
  assert.equal(parseProgramSnapshot(JSON.stringify(snapshot), []).anchor, null);
});
