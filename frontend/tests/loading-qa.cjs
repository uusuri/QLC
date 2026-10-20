// Run against `npm run build && npm run start -- -p 3100`.
// API requests are fixtures; this never writes to real accounts or courses.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.QLC_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.QLC_QA_URL || "http://127.0.0.1:3100";
const manifest = require("../.next/react-loadable-manifest.json");
const editorFiles = manifest["app/lessons/[id]/page.tsx -> @/components/CodeLessonWorkspace"].files;
const monacoFiles = manifest["components/CodeLessonWorkspace.tsx -> monaco-editor/esm/vs/editor/editor.api.js"].files.filter(file => file.endsWith(".js"));
const course = { id: 2, name: "QA", price: 0, priceInStars: 0, multilingual: false };
const moduleItem = { id: 201, courseId: 2, name: "Модуль QA", position: 1 };
const lesson = { id: 301, moduleId: 201, name: "Урок QA", published: true, contentMd: "# Теория без ожидания списка" };
const task = { id: 401, lessonId: 301, taskType: "CODE", statementMd: "# Задача QA", language: "CPP23",
  starterCode: "int main() { return 0; }", testSetVersion: 1, timeLimitMs: 1000, memoryLimitKb: 262144, outputLimitKb: 64 };

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.QLC_CHROMIUM_PATH ? { executablePath: process.env.QLC_CHROMIUM_PATH } : {}) });
  let releaseOutline;
  const outlineGate = new Promise(resolve => { releaseOutline = resolve; });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(() => {
      if (!localStorage.getItem("qlc:auth-token")) localStorage.setItem("qlc:auth-token", "qa-initial");
    });
    const errors = [], requests = [], authRequests = new Map();
    let outlineFinished = false;
    await context.route("**/api/**", async route => {
      const request = route.request(), url = new URL(request.url()).pathname;
      let body;
      if (url === "/api/auth/me") {
        const page = request.frame().page();
        authRequests.set(page, (authRequests.get(page) || 0) + 1);
        body = { id: 999, role: "ROLE_USER", username: request.headers().authorization?.includes("qa-new") ? "new_user" : "qa_user" };
      } else if (url === "/api/lessons/301/learn") body = { course, module: moduleItem, lesson, tasks: [task], hasAccess: true };
      else if (url === "/api/modules/201/lessons") {
        await outlineGate;
        outlineFinished = true;
        body = [lesson];
      } else if (url === "/api/users/me/learning-position/tasks/401") body = { taskId: 401 };
      else if (url === "/api/users/me/learning-courses" || url === "/api/lessons/301/task-outline") body = [];
      else if (url === "/api/cart") body = { courseIds: [] };
      else return route.fulfill({ status: 404, json: { message: `No fixture for ${url}` } });
      return route.fulfill({ status: 200, json: body });
    });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    page.on("request", request => requests.push(new URL(request.url()).pathname));
    await page.goto(base + "/lessons/301");
    await page.getByRole("heading", { name: "Теория без ожидания списка", exact: true }).waitFor();
    assert.equal(outlineFinished, false, "Theory must render while the outline request is still pending");
    await page.waitForTimeout(500);
    assert.equal(await page.locator(".monaco-editor").count(), 0);
    const upfrontEditorRequests = requests.filter(url => [...editorFiles, ...monacoFiles].some(file => url.endsWith(file)));
    assert.deepEqual(upfrontEditorRequests, [], "Neither workspace nor Monaco should load during theory");
    releaseOutline();
    await page.getByRole("navigation", { name: "Уроки модуля", exact: true }).getByRole("link", { name: "Урок QA" }).waitFor();

    await page.getByRole("button", { name: "Практика · 1", exact: true }).click();
    const editor = page.getByRole("textbox", { name: "Редактор решения задачи", exact: true });
    await editor.waitFor();
    assert(requests.some(url => monacoFiles.some(file => url.endsWith(file))));
    await editor.focus();
    await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
    await page.keyboard.insertText("int main() { return 42; }");
    const draftKey = await page.evaluate(() => Object.keys(localStorage).find(key => key.startsWith("qlc:draft:") && localStorage.getItem(key)?.includes("return 42")));
    assert(draftKey);
    const model = page.locator(".monaco-editor").first();
    await model.evaluate(element => { element.dataset.retainedEditor = "yes"; });
    const editorRequestCount = requests.filter(url => [...editorFiles, ...monacoFiles].some(file => url.endsWith(file))).length;
    await page.getByRole("button", { name: "Материал", exact: true }).click();
    await page.getByRole("button", { name: "Практика · 1", exact: true }).click();
    assert.equal(await model.getAttribute("data-retained-editor"), "yes", "Editor must not remount across theory/practice tabs");
    assert.equal(requests.filter(url => [...editorFiles, ...monacoFiles].some(file => url.endsWith(file))).length, editorRequestCount);
    assert.match(await page.evaluate(key => localStorage.getItem(key), draftKey), /return 42/);

    const peer = await context.newPage();
    await peer.goto(base + "/missing-qa-page");
    const before = authRequests.get(page);
    await peer.evaluate(() => {
      for (let i = 0; i < 20; i++) localStorage.setItem("qlc:draft:qa", `typing ${i}`);
      localStorage.setItem("qlc:auth-user", JSON.stringify({ username: "cached-only" }));
      sessionStorage.setItem("qlc:auth-token", "not-a-local-session");
    });
    await page.waitForTimeout(500);
    assert.equal(authRequests.get(page), before, "Draft/cache writes must not revalidate auth");
    await peer.evaluate(() => localStorage.setItem("qlc:auth-token", "qa-new"));
    await page.getByText("@new_user", { exact: true }).waitFor();
    assert.equal(authRequests.get(page), before + 1, "A changed token must still revalidate auth");
    await peer.evaluate(() => localStorage.clear());
    await page.getByRole("link", { name: /Войти/ }).first().waitFor();
    await peer.close();
    await context.close();

    // A direct task link must still open practice without an extra click.
    const direct = await browser.newContext({ viewport: { width: 900, height: 900 } });
    await direct.addInitScript(() => localStorage.setItem("qlc:auth-token", "qa-direct"));
    await direct.route("**/api/**", route => {
      const url = new URL(route.request().url()).pathname;
      const body = url === "/api/auth/me" ? { id: 999, username: "qa", role: "ROLE_USER" }
        : url === "/api/lessons/301/learn" ? { course, module: moduleItem, lesson, tasks: [task], hasAccess: true }
        : url === "/api/modules/201/lessons" ? [lesson] : {};
      return route.fulfill({ status: 200, json: body });
    });
    const deepLink = await direct.newPage();
    deepLink.on("pageerror", error => errors.push(error.message));
    await deepLink.goto(base + "/lessons/301?task=401");
    await deepLink.getByRole("button", { name: "Код", exact: true }).click(); // Mobile workspace tabs at default viewport.
    await deepLink.getByRole("textbox", { name: "Редактор решения задачи", exact: true }).waitFor();
    await direct.close();

    const imageResults = [];
    for (const width of [390, 1440]) {
      const visual = await browser.newContext({ viewport: { width, height: 1000 }, deviceScaleFactor: 1 });
      const home = await visual.newPage();
      await home.goto(base + "/");
      const hero = home.locator(".kit-hero-art");
      await hero.evaluate(image => image.decode());
      const src = await hero.evaluate(image => image.currentSrc);
      assert(src.includes("/_next/image?"), "Hero must use responsive image optimization");
      const response = await visual.request.get(src, { headers: { Accept: "image/webp" } });
      assert.equal(response.status(), 200);
      assert.match(response.headers()["content-type"], /image\/webp/);
      const bytes = (await response.body()).length;
      assert(bytes < fs.statSync(path.join(__dirname, "../public/design/synthetic-art.png")).size * .4);
      assert(await home.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      imageResults.push({ viewport: width, bytes, url: src });
      await visual.close();
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ result: "PASS", upfrontEditorRequests: 0, images: imageResults, errors }));
  } finally {
    releaseOutline();
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
