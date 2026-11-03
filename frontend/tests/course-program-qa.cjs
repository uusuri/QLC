// Production-browser regression: 297 lesson fixtures; no real API/database writes.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.QLC_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.QLC_QA_URL || "http://127.0.0.1:3100";
const out = process.env.QLC_QA_OUTPUT || path.join(require("node:os").tmpdir(), "qlc-course-program-qa");
const course = { id: 2, name: "Алгоритмы QA", description: "Курс из 297 уроков", price: 0, priceInStars: 0, multilingual: false };
const modules = Array.from({ length: 33 }, (_, m) => ({
  module: { id: m + 1, courseId: 2, name: `Модуль ${m + 1}`, description: "Описание раздела", level: Math.floor(m / 11) + 1, position: m + 1 },
  lessons: Array.from({ length: 9 }, (_, n) => {
    const id = m * 9 + n + 1;
    return { id, moduleId: m + 1, name: [42, 150, 285].includes(id) ? `Бинарный поиск ${id}` : `Урок ${id}`, description: id === 120 ? "Подсчёт рёбер" : `Тема ${id}`, published: true, position: n + 1, contentMd: `# Теория ${id}` };
  })
}));
const lessons = modules.flatMap(item => item.lessons);
const errors = [], report = [];
async function fixture(context, emptyCourseResponses = 0) {
  await context.addInitScript(() => localStorage.setItem("qlc:auth-token", "qa-only"));
  await context.route("**/api/**", async route => {
    const url = new URL(route.request().url()).pathname;
    if (url === "/api/catalog/courses/2" && emptyCourseResponses > 0) {
      emptyCourseResponses--;
      return route.fulfill({ status: 200, contentType: "application/json", body: "" });
    }
    let body;
    if (url === "/api/auth/me") body = { id: 999, username: "qa", role: "ROLE_USER" };
    else if (url === "/api/courses/2/language") body = { selectedLanguage: "CPP23", availableLanguages: ["CPP23", "JAVA21"] };
    else if (/^\/api\/catalog\/courses\/[23]$/.test(url)) {
      await new Promise(resolve => setTimeout(resolve, 250));
      body = { course: url.endsWith("3") ? { ...course, id: 3, price: 1000 } : course, modules };
    } else if (url === "/api/courses/3/access") body = { access: false };
    else if (/^\/api\/lessons\/\d+\/learn$/.test(url)) {
      const lesson = lessons.find(item => item.id === Number(url.split("/")[3]));
      body = { course, module: modules.find(item => item.module.id === lesson.moduleId).module, lesson, tasks: [], hasAccess: true };
    } else if (/^\/api\/modules\/\d+\/lessons$/.test(url)) body = modules.find(item => item.module.id === Number(url.split("/")[3])).lessons;
    else if (/\/task-outline$/.test(url)) {
      await new Promise(resolve => setTimeout(resolve, 200));
      body = [{ id: 901, taskType: "CODE", difficulty: 2 }, { id: 902, taskType: "TEST", difficulty: 1 }, { id: 903, taskType: "NUMERIC", difficulty: 3 }];
    } else if (url === "/api/users/me/learning-courses") body = [];
    else if (url === "/api/cart") body = { courseIds: [] };
    else return route.fulfill({ status: 404, json: { message: `Missing fixture: ${url}` } });
    return route.fulfill({ status: 200, json: body });
  });
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.QLC_CHROMIUM_PATH ? { executablePath: process.env.QLC_CHROMIUM_PATH } : {}) });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await fixture(context);
      const page = await context.newPage();
      page.on("pageerror", error => errors.push(error.message));
      const program = page.getByRole("region", { name: "Программа курса", exact: true });
      const search = program.getByRole("searchbox", { name: "Найти урок", exact: true });
      const rows = program.locator("[data-program-lesson]");
      await page.goto(base + "/courses/course-2");
      await search.waitFor();
      assert((await program.getByRole("search").boundingBox()).height <= 64, "Sticky search must remain a single compact row");
      assert.equal(await program.getByRole("combobox").count(), 0, "Filters have been removed");
      assert.equal(await rows.count(), 0, "Modules should start collapsed");
      assert.equal(await program.locator(".kit-program-module").count(), 33);
      await program.getByRole("button", { name: "Раскрыть модули", exact: true }).click();
      assert.equal(await rows.count(), 297);
      await program.getByRole("button", { name: "Свернуть модули", exact: true }).click();
      assert.equal(await rows.count(), 0);
      await program.getByRole("region", { name: "Модуль 30", exact: true }).locator(".kit-program-module").click();
      assert.equal(await rows.count(), 9);
      const row = page.locator("#program-lesson-270");
      await page.evaluate(() => document.fonts.ready);
      await row.evaluate(element => window.scrollTo({ top: scrollY + element.getBoundingClientRect().top - 400, behavior: "instant" }));
      const before = await page.evaluate(() => scrollY);
      await row.getByRole("link", { name: "Урок 270", exact: true }).click();
      await page.getByRole("heading", { name: "Теория 270", exact: true }).waitFor();
      await page.goBack();
      await search.waitFor();
      await page.waitForFunction(y => Math.abs(scrollY - y) < 5, before);
      assert.equal(await rows.count(), 9);
      assert.equal(await program.getByRole("region", { name: "Модуль 30", exact: true }).locator(".kit-program-module").getAttribute("aria-expanded"), "true");
      // Site breadcrumb must restore the same state as browser Back.
      await row.getByRole("link", { name: "Урок 270", exact: true }).click();
      await page.getByRole("heading", { name: "Теория 270", exact: true }).waitFor();
      await page.getByRole("link", { name: "← Алгоритмы QA", exact: true }).click();
      await search.waitFor();
      await page.waitForFunction(y => Math.abs(scrollY - y) < 5, before);

      await search.fill("  ПОИСК бинарный  ");
      assert.equal(await rows.count(), 3);
      await page.reload();
      await search.waitFor();
      assert.equal(await search.inputValue(), "  ПОИСК бинарный  ");
      assert.equal(await rows.count(), 3);
      await program.getByRole("button", { name: "Очистить поиск" }).click();
      await search.fill("ребер");
      assert.equal(await rows.count(), 1);
      await search.fill("297");
      assert.equal(await rows.count(), 1);
      assert(await program.getByRole("link", { name: "Урок 297", exact: true }).count());
      await search.fill("нет такого урока");
      await program.getByRole("heading", { name: "Уроки не найдены" }).waitFor();
      await search.fill("285");
      await program.getByRole("button", { name: "Показать содержание урока «Бинарный поиск 285»", exact: true }).click();
      await program.getByText("Задача 1", { exact: true }).waitFor();
      await page.locator("#program-lesson-285").evaluate(element => window.scrollTo({ top: scrollY + element.getBoundingClientRect().top - 400, behavior: "instant" }));
      const searchedY = await page.evaluate(() => scrollY);
      await program.getByRole("link", { name: "Бинарный поиск 285", exact: true }).click();
      await page.getByRole("heading", { name: "Теория 285", exact: true }).waitFor();
      await page.goBack();
      await search.waitFor();
      assert.equal(await search.inputValue(), "285");
      assert.equal(await program.getByRole("button", { name: /^Фильтры/ }).count(), 0);
      await program.getByText("Задача 1", { exact: true }).waitFor();
      await page.waitForFunction(y => Math.abs(scrollY - y) < 5, searchedY);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: path.join(out, `program-${width}.png`) });
      report.push({ width, scrollBefore: before, restoredSearchScroll: await page.evaluate(() => scrollY) });
      await page.goto(base + "/courses/course-3");
      await search.waitFor();
      assert.equal(await search.inputValue(), "", "Different courses must not share state");
      await search.fill("бинарный");
      assert.equal(await rows.count(), 3);
      assert.equal(await program.locator('a[href^="/lessons/"]').count(), 0, "Locked course must not expose study links");
      await context.close();
    }
    for (const emptyResponses of [1, 2]) {
      const context = await browser.newContext();
      await fixture(context, emptyResponses);
      const page = await context.newPage();
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(base + "/courses/course-2");
      if (emptyResponses === 2) {
        await page.getByText("Сервер вернул неполный или некорректный ответ.", { exact: true }).waitFor();
        await page.getByRole("button", { name: "Повторить загрузку", exact: true }).click();
      }
      await page.getByRole("searchbox", { name: "Найти урок", exact: true }).waitFor();
      assert.equal(await page.locator(".kit-program-module").count(), 33);
      report.push({ emptyResponses, recovered: true });
      await context.close();
    }
    const blocked = await browser.newContext();
    await fixture(blocked);
    await blocked.addInitScript(() => Object.defineProperty(window, "sessionStorage", { get() { throw new DOMException("Blocked", "SecurityError"); } }));
    const page = await blocked.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + "/courses/course-2");
    await page.getByRole("searchbox", { name: "Найти урок" }).fill("297");
    await page.getByRole("link", { name: "Урок 297", exact: true }).waitFor();
    await blocked.close();
    course.name = "Алгоритмы и структуры данных";
    course.multilingual = true;
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await fixture(context);
      const page = await context.newPage();
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(base + "/courses/course-2");
      await page.getByRole("button", { name: "Язык решений: C++", exact: true }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      const searchHeight = (await page.getByRole("search").boundingBox()).height;
      const moduleTop = (await page.locator(".kit-program-module").first().boundingBox()).y;
      assert(searchHeight <= 64);
      assert(moduleTop < 500, "Curriculum must be visible on the first screen");
      assert.equal(await page.locator(".kit-course-hero, .kit-course-summary").count(), 0);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: path.join(out, `compact-${width}.png`) });
      await page.getByRole("button", { name: "Язык решений: C++", exact: true }).click();
      await page.getByRole("dialog").waitFor();
      await page.getByRole("button", { name: "Отмена", exact: true }).click();
      await page.locator(".kit-program-module").first().click();
      await page.getByRole("button", { name: "Показать содержание урока «Урок 1»", exact: true }).click();
      await page.getByText("Задача 3", { exact: true }).waitFor();
      assert.equal(await page.getByText("Описание раздела", { exact: true }).count(), 0);
      assert.equal(await page.getByText("О курсе", { exact: true }).count(), 0);
      assert.equal(await page.getByRole("list", { name: "Задачи урока «Урок 1»", exact: true }).getByRole("listitem").count(), 3);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: path.join(out, `expanded-${width}.png`) });
      report.push({ width, searchHeight, moduleTop });
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ result: "PASS", lessons: 297, report, errors, out }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
