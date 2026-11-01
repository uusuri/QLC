const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const load = require("./load-ts.cjs");
const { activityWeeks, activityLevel, activityCountLabel, activityDateLabel } = load(path.join(__dirname, "../services/activity.ts"));
const { ActivityCalendar } = load(path.join(__dirname, "../components/ActivityCalendar.tsx"));
const api = load(path.join(__dirname, "../services/api.ts"));

function year(from = "2025-10-25", to = "2026-10-24", days = []) {
  return { from, to, timeZone: "Europe/Moscow", totalSubmissions: days.reduce((sum, day) => sum + day.count, 0), days };
}

test("calendar lays out 365 actual days Monday-first, including zeroes and partial weeks", () => {
  const data = year(undefined, undefined, [{ date: "2026-10-24", count: 12 }]);
  const weeks = activityWeeks(data), days = weeks.flat().filter(Boolean);
  assert.equal(weeks.length, 53);
  assert.ok(weeks.every(week => week.length === 7));
  assert.deepEqual(weeks[0].slice(0, 5), [null, null, null, null, null]);
  assert.equal(days.length, 365);
  assert.deepEqual(days[0], { date: data.from, count: 0 });
  assert.deepEqual(days.at(-1), { date: data.to, count: 12 });
  assert.equal(new Set(days.map(day => day.date)).size, 365);
});

test("calendar is timezone independent, includes February 29 and rejects malformed/unbounded ranges", () => {
  const leap = activityWeeks(year("2024-02-28", "2024-03-01")).flat().filter(Boolean);
  assert.deepEqual(leap.map(day => day.date), ["2024-02-28", "2024-02-29", "2024-03-01"]);
  assert.equal(activityDateLabel("2026-01-01"), "1 января 2026 г.");
  for (const range of [["2026-02-30", "2026-03-01"], ["2026-01-02", "2026-01-01"], ["2020-01-01", "2026-01-01"], ["bad", "2026-01-01"]]) {
    assert.throws(() => activityWeeks(year(...range)));
  }
});

test("activity colours and labels do not turn invalid or absent data into activity", () => {
  assert.deepEqual([0,1,2,3,5,6,9,10,100].map(activityLevel), [0,1,1,2,2,3,3,4,4]);
  for (const value of [-1, NaN, Infinity, 1.1, "3"]) assert.equal(activityLevel(value), 0);
  assert.equal(activityCountLabel(1), "1 отправка");
  assert.equal(activityCountLabel(2), "2 отправки");
  assert.equal(activityCountLabel(11), "11 отправок");
  const days = activityWeeks(year("2026-01-01", "2026-01-02", [{ date:"2026-01-01", count:NaN }])).flat().filter(Boolean);
  assert.ok(days.every(day => day.count === 0));
});

test("calendar renders accessible labels, one keyboard entry point and counts only actual displayed days", () => {
  const data = year(undefined, undefined, [{ date:"2026-10-24", count:5 }, { date:"2026-01-01", count:2 }]);
  const html = renderToStaticMarkup(React.createElement(ActivityCalendar, { activity:data }));
  assert.equal((html.match(/<button/g) ?? []).length, 365);
  assert.equal((html.match(/tabindex="0"/g) ?? []).length, 1);
  assert.ok(html.includes("7 отправок за год"));
  assert.ok(html.includes("24 октября 2026 г.: 5 отправок решений"));
  assert.ok(html.includes('data-level="2"'));
  assert.ok(!html.includes("Практика за год"));
  assert.ok(!html.includes("Меньше</span>"));
  assert.ok(!html.includes("NaN"));
});

test("profile, search and friends reads are cancellable no-store requests with encoded user names", async t => {
  const received = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    received.push({ url, options });
    return new Response("{}", { status:200 });
  });
  const signal = new AbortController().signal;
  await api.getPublicProfile("test/name", signal);
  await api.getUserActivity("test/name", signal);
  await api.getUserFriends("test/name", signal);
  await api.getMyFriends(signal);
  await api.getFriendRequests(signal);
  await api.searchUsers(" a_b% ", signal);
  await api.getMyDailySubmissions("2026-10-24", 2, signal);
  assert.ok(received[0].url.endsWith("/api/users/profiles/test%2Fname"));
  assert.ok(received[1].url.endsWith("/api/users/profiles/test%2Fname/activity"));
  assert.ok(received[2].url.endsWith("/api/users/profiles/test%2Fname/friends"));
  assert.ok(received[3].url.endsWith("/api/friends"));
  assert.ok(received[4].url.endsWith("/api/friends/requests"));
  assert.ok(received[5].url.endsWith("/api/users/search?q=a_b%25"));
  assert.ok(received[6].url.endsWith("/api/users/me/activity?date=2026-10-24&page=2"));
  for (const request of received) {
    assert.equal(request.options.signal, signal);
    assert.equal(request.options.cache, "no-store");
  }
  assert.ok(api.publicAvatarUrl("a/b").endsWith("/api/users/profiles/a%2Fb/avatar"));
});

test("social mutations use server-authoritative current account and handle empty204 responses", async t => {
  const received = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    received.push({ url, options });
    return url.endsWith("/privacy") ? new Response('{"privateProfile":true}', {status:200}) : new Response(null, {status:204});
  });
  await api.sendFriendRequest(42);
  await api.acceptFriendRequest(42);
  await api.dismissFriendRequest(42);
  await api.removeFriend(42);
  assert.deepEqual(await api.updateProfilePrivacy(true), {privateProfile:true});
  assert.deepEqual(received.map(request => request.options.method), ["POST", "PUT", "DELETE", "DELETE", "PUT"]);
  assert.ok(received[0].url.endsWith("/api/friends/requests/42"));
  assert.ok(received[1].url.endsWith("/api/friends/requests/42/accept"));
  assert.ok(received[2].url.endsWith("/api/friends/requests/42"));
  assert.ok(received[3].url.endsWith("/api/friends/42"));
  assert.deepEqual(JSON.parse(received[4].options.body), {privateProfile:true});
  for (const request of received) assert.equal(request.options.cache, "no-store");
});
