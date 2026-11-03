const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const { getCourseLearningView, getAdminLessons, createAdminCourse, ApiClientError } = require("./load-ts.cjs")(path.join(__dirname, "../services/api.ts"));
const course = { course: { id: 3, name: "Алгоритмы", price: 0 }, modules: [] };

test("first course read recovers from empty or truncated JSON with one uncached GET", async t => {
  for (const body of ["", "   ", '{"course":']) {
    const calls = [];
    const mock = t.mock.method(globalThis, "fetch", async (url, options) => {
      calls.push({ url, options });
      return new Response(calls.length === 1 ? body : JSON.stringify(course));
    });
    assert.equal((await getCourseLearningView("course-3")).course.name, "Алгоритмы");
    assert.equal(calls.length, 2);
    assert.equal(calls[1].url, calls[0].url);
    assert.equal(calls[1].options.cache, "no-store");
    mock.mock.restore();
  }
});

test("persistent invalid JSON stops after two reads and reports a readable error", async t => {
  const mock = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 204 }));
  await assert.rejects(getCourseLearningView("course-3"), /Сервер вернул неполный или некорректный ответ/);
  assert.equal(mock.mock.callCount(), 2);
});

test("an empty mutation response never repeats the mutation", async t => {
  const mock = t.mock.method(globalThis, "fetch", async () => new Response(""));
  await assert.rejects(createAdminCourse({ name: "Test", price: 0 }), /Сервер вернул/);
  assert.equal(mock.mock.callCount(), 1);
  assert.equal(mock.mock.calls[0].arguments[1].method, "POST");
});

test("HTTP failures preserve their status and do not enter JSON retries", async t => {
  const mock = t.mock.method(globalThis, "fetch", async () => new Response("", { status: 503 }));
  await assert.rejects(getCourseLearningView("course-3"), error => error instanceof ApiClientError && error.status === 503);
  assert.equal(mock.mock.callCount(), 1);
});

test("aborting a read prevents retrying an empty response", async t => {
  const controller = new AbortController();
  const mock = t.mock.method(globalThis, "fetch", async () => {
    controller.abort();
    return new Response("");
  });
  await assert.rejects(getAdminLessons(1, controller.signal), { name: "AbortError" });
  assert.equal(mock.mock.callCount(), 1);
});
