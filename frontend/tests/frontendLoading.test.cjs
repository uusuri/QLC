const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const load = require("./load-ts.cjs");
const { isAuthStorageKey, getAdminLessons } = load(path.join(__dirname, "../services/api.ts"));

test("only a changed auth token or cleared storage triggers cross-tab auth verification", () => {
  assert.equal(isAuthStorageKey("qlc:auth-token"), true);
  assert.equal(isAuthStorageKey(null), true);
  for (const key of ["qlc:auth-user", "qlc:last-account", "qlc:draft:task:401:v1", "qlc:admin-content-workspace:v1", "unrelated"]) {
    assert.equal(isAuthStorageKey(key), false, key);
  }
});

test("module outline fetch forwards the abort signal", async t => {
  const controller = new AbortController();
  const lessons = [{ id: 301, name: "Урок" }];
  let received;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    received = { url, options };
    return new Response(JSON.stringify(lessons), { status: 200 });
  });
  assert.deepEqual(await getAdminLessons(201, controller.signal), lessons);
  assert.ok(received.url.endsWith("/api/modules/201/lessons"));
  assert.equal(received.options.signal, controller.signal);
});
