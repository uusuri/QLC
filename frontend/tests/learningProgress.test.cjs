const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const { test } = require("node:test");
const ts = require("typescript");

const filename = path.join(__dirname, "../services/learningProgress.ts");
const compiled = new Module(filename, module);
compiled._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText, filename);
const { getNextLearningLesson, getLearningHref } = compiled.exports;

function course(id, lastTaskId, percent = 0) {
  return {
    id, lastTaskId, lastLessonId: lastTaskId == null ? null : id * 10,
    modules: [{ id, position: 0, lessons: [
      { id: id * 10, position: 0, totalTasks: 2, progressPercent: percent }
    ] }]
  };
}

test("resume the exact saved task in the last course, ahead of the first course", () => {
  const next = getNextLearningLesson([course(1), course(9, 902)]);
  assert.equal(next.course.id, 9);
  assert.equal(next.taskId, 902);
  assert.equal(getLearningHref(next), "/lessons/90?task=902");
});

test("a completed task remains a valid saved position", () => {
  const next = getNextLearningLesson([course(1), course(9, 902, 100)]);
  assert.equal(next.course.id, 9);
  assert.equal(next.taskId, 902);
});

test("without a saved task, find the first unfinished lesson in curriculum order", () => {
  const next = getNextLearningLesson([course(9), course(1, null, 100), course(3)]);
  assert.equal(next.course.id, 3);
  assert.equal(getLearningHref(next), "/lessons/30");
});

test("ignore a saved position whose lesson is no longer available", () => {
  const unavailable = course(9, 902);
  unavailable.modules = [];
  const next = getNextLearningLesson([unavailable, course(1)]);
  assert.equal(getLearningHref(next), "/lessons/10");
});

test("empty and completed curricula have no fallback lesson", () => {
  assert.equal(getNextLearningLesson([]), null);
  assert.equal(getNextLearningLesson([course(1, null, 100)]), null);
});
