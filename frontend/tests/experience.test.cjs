const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const load = require("./load-ts.cjs");
const { parseExperienceSummary, experiencePercent, formatAcceptedAnswer } = load(path.join(__dirname, "../services/experience.ts"));
const { ExperienceProgressView } = load(path.join(__dirname, "../components/ExperienceProgress.tsx"));
const { getMyExperience } = load(path.join(__dirname, "../services/api.ts"));
const initial = {level:1,totalXp:0,currentLevelXp:0,xpRequiredForLevel:100,xpRemaining:100};

test("accepted answer shows XP only for a confirmed positive reward", () => {
  for (const xp of [10,20,30]) assert.equal(formatAcceptedAnswer(xp),`Верно. +${xp} XP`);
  for (const value of [0,undefined,null,NaN,Infinity,-10,1.5,'10']) assert.equal(formatAcceptedAnswer(value),"Верно");
});

test("zero and an exact new-level boundary render empty, not full or unavailable", () => {
  for (const summary of [initial, {...initial,level:2,totalXp:100}]) {
    assert.equal(experiencePercent(parseExperienceSummary(summary)),0);
    const html = renderToStaticMarkup(React.createElement(ExperienceProgressView,{summary}));
    assert.ok(html.includes(`Уровень ${summary.level}`));
    assert.ok(html.includes('aria-valuenow="0"'));
    assert.ok(html.includes('width:0%'));
    assert.ok(html.includes('0 / 100 XP'));
    assert.ok(!html.includes('NaN'));
  }
});

test("XP bar uses the server's current XP and threshold with accessible values", () => {
  const summary = parseExperienceSummary({...initial,totalXp:70,currentLevelXp:70,xpRemaining:30});
  const html = renderToStaticMarkup(React.createElement(ExperienceProgressView,{summary}));
  assert.equal(experiencePercent(summary),70);
  assert.ok(html.includes('role="progressbar"'));
  assert.ok(html.includes('aria-valuemax="100"'));
  assert.ok(html.includes('aria-valuenow="70"'));
  assert.ok(html.includes('width:70%'));
  assert.ok(html.includes('До уровня 2 — 30 XP'));
});

test("invalid or missing XP is rejected instead of presenting invented level one", () => {
  for(const value of [null,{}, {...initial,totalXp:NaN}, {...initial,totalXp:-1}, {...initial,level:0},
    {...initial,xpRequiredForLevel:0}, {...initial,currentLevelXp:100}, {...initial,xpRemaining:0},
    {...initial,totalXp:Number.MAX_SAFE_INTEGER+1}, {...initial,totalXp:'10'}]) {
    assert.throws(()=>parseExperienceSummary(value));
  }
});

test("experience request is private, cancellable and validates its response", async t => {
  const controller = new AbortController();
  let received;
  t.mock.method(globalThis,"fetch",async(url,options)=>{
    received={url,options};
    return new Response(JSON.stringify(initial),{status:200});
  });
  assert.deepEqual(await getMyExperience(controller.signal),initial);
  assert.ok(received.url.endsWith('/api/users/me/experience'));
  assert.equal(received.options.signal,controller.signal);
  assert.equal(received.options.cache,'no-store');
});
