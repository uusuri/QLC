const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const load = require("./load-ts.cjs");
const { DailySubmissionsView } = load(path.join(__dirname, "../components/DailySubmissions.tsx"));

const date = "2026-10-16";
const item = index => ({ id:`submission-${index}`, taskId:3, lessonId:2, lessonName:"Functions", taskType:"CODE",
  language:"CPP23", status:"FINISHED", verdict:"WA", createdAt:`${date}T19:48:00+03:00`, executionTime:12, memoryUsed:1024 });
const page = count => ({ date, page:0, hasNext:count === 20, items:Array.from({length:count}, (_,index) => item(index)) });
function render(options = {}) {
  return renderToStaticMarkup(React.createElement(DailySubmissionsView, {
    date, page:0, data:null, error:"", selectedId:null, cache:new Map(),
    onClose(){}, onReload(){}, onSelect(){}, onPageChange(){}, ...options
  }));
}

test("daily workspace keeps the list and pagination slots in every loading/content state", () => {
  for (const options of [{}, {error:"Temporary error"}, {data:page(0)}, {data:page(1)}, {data:page(20)},
    {data:page(20), selectedId:"submission-10"}, {page:1, data:{...page(1), page:1}}]) {
    const html = render(options);
    for (const className of ["kit-daily-workspace", "kit-daily-list", "kit-daily-pagination"]) {
      assert.ok(html.includes(className), `missing fixed slot ${className}`);
    }
    assert.equal((html.match(/aria-label="Страницы посылок за день"/g) ?? []).length, 1);
    assert.ok(!html.includes("kit-daily-preview"));
  }
});

test("solution expands only inside its selected list row, without a side panel", () => {
  for (const selectedId of ["submission-0", "submission-10", "submission-19"]) {
    const html = render({data:page(20), selectedId});
    const list = html.match(/<ul>([\s\S]*?)<\/ul>/)[1];
    assert.equal((list.match(/<li /g) ?? []).length, 20);
    assert.equal((list.match(/aria-expanded="true"/g) ?? []).length, 1);
    const rows = [...list.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)];
    rows.forEach((row, index) => assert.equal(row[1].includes("kit-daily-detail"), selectedId === `submission-${index}`));
    assert.ok(!html.includes("kit-daily-preview"));
    assert.ok(html.includes('aria-label="Сохранённое решение" aria-busy="true"'));
    assert.ok(html.includes('/lessons/2?task=3'));
  }
});

test("already loaded code is rendered immediately from the page-local cache and remains escaped", () => {
  const cache = new Map([["submission-1", {id:"submission-1", taskId:3, language:"CPP23",
    sourceCode:"<script>not executable</script>\n".repeat(1000), submittedAnswer:null}]]);
  const html = render({data:page(3), selectedId:"submission-1", cache});
  assert.ok(html.includes('aria-label="Сохранённое решение" aria-busy="false"'));
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;not executable&lt;/script&gt;"));
  assert.ok(!html.includes("Загрузка…"));
});

test("list and inline solution reserve fixed heights even before code finishes loading", () => {
  const css = readFileSync(path.join(__dirname, "../app/globals.css"), "utf8");
  assert.match(css, /\.kit-daily-workspace\s*\{[^}]*height:clamp\(360px, 60dvh, 520px\)/);
  assert.match(css, /\.kit-daily-list\s*\{[^}]*overflow:auto[^}]*scrollbar-gutter:stable/);
  assert.match(css, /\.kit-daily-payload pre\s*\{[^}]*min-height:0[^}]*overflow:auto/);
  assert.match(css, /\.kit-daily-submissions\s*\{[^}]*overflow-anchor:none/);
  assert.match(css, /\.kit-daily-detail\s*\{[^}]*height:clamp\(240px, 40dvh, 360px\)/);
  assert.ok(!css.includes(".kit-daily-preview"));
});
