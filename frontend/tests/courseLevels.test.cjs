const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const load = require("./load-ts.cjs");
const { groupCourseModules, courseLevelTitle, taskDifficultyLabel } = load(path.join(__dirname, "../services/courseLevels.ts"));
const { getCourseLearningView } = load(path.join(__dirname, "../services/api.ts"));

test("courses without assigned levels preserve existing module order and presentation", () => {
  const modules = [{ module: { id: 7 } }, { module: { id: 2, level: null } }];
  assert.deepEqual(groupCourseModules(modules), [{ level: null, modules }]);
  assert.deepEqual(groupCourseModules([]), [{ level: null, modules: [] }]);
});

test("levels are grouped from basic to advanced without losing legacy modules or changing within-level order", () => {
  const modules = [
    { module: { id: 5, level: 3 } }, { module: { id: 2, level: 1 } },
    { module: { id: 3, level: null } }, { module: { id: 6, level: 1 } },
    { module: { id: 1, level: 2 } }, { module: { id: 4, level: 99 } }
  ];
  assert.deepEqual(groupCourseModules(modules).map(group => [group.level, group.modules.map(item => item.module.id)]),
    [[1, [2, 6]], [2, [1]], [3, [5]], [null, [3, 4]]]);
  assert.equal(courseLevelTitle(1), "Уровень 1");
});

test("task stars communicate relative difficulty inside a course level, not global skill or user XP level", () => {
  assert.equal(taskDifficultyLabel(3, 1), "Сложность внутри уровня 1: 3 из 3");
  assert.equal(taskDifficultyLabel(1, 3), "Сложность внутри уровня 3: 1 из 3");
  assert.equal(taskDifficultyLabel(2), "Сложность: 2 из 3");
  assert.equal(taskDifficultyLabel(NaN, 2), "Сложность внутри уровня 2: 1 из 3");
});

test("course entry CTA and displayed modules start at the first published lesson in the first level", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({
    course: { id: 3, name: "Algorithms", description: "", price: 0, priceInStars: 0 },
    modules: [
      { module: { id: 9, level: 3 }, lessons: [{ id: 90, published: true }] },
      { module: { id: 1, level: 1 }, lessons: [{ id: 10, published: false }, { id: 11, published: true }] }
    ]
  }), { status: 200 }));
  const view = await getCourseLearningView("course-3");
  assert.equal(view.firstLesson.id, 11);
  assert.deepEqual(view.modules.map(item => item.module.level), [1, 3]);
});
