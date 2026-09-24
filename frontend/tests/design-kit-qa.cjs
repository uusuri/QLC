const { chromium } = require(process.env.QLC_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const out = process.env.QLC_QA_OUTPUT || require('node:path').join(require('node:os').tmpdir(),'qlc-design-qa');
const base = process.env.QLC_QA_URL || 'http://127.0.0.1:3100';
const course = {id:2,name:'Java-разработчик',description:'Практический курс Java: от основ программирования до Spring.',price:0,priceInStars:0};
const moduleItem = {id:201,courseId:2,name:'Коллекции',description:'Научитесь выбирать структуру данных для задачи.',position:1};
const lesson = {id:301,moduleId:201,name:'HashMap: поиск по ключу',description:'Сохраняйте пары ключ — значение и быстро находите нужные данные.',position:1,published:true,contentMd:'# HashMap: поиск по ключу\n\nКоллекция связывает ключ со значением. Найти данные можно по ключу, без последовательного просмотра всех элементов.\n\n## Частоты значений\n\nИспользуйте merge, чтобы увеличивать счётчик при каждом повторении.\n\n```java\nMap<String, Integer> counts = new HashMap<>();\nfor (String item : items) {\n  counts.merge(item, 1, Integer::sum);\n}\nreturn counts;\n```\n\n- Ключи уникальны.\n- Значения могут повторяться.\n\n## Когда применять\n\nHashMap подходит для подсчёта частот и поиска по идентификатору.'};
const task = {id:401,lessonId:301,taskType:'CODE',statementMd:'# Частоты значений\n\nДан массив строк. Для каждой строки подсчитайте число появлений.\n\n## Пример\n\n```text\njava cpp java\njava: 2\ncpp: 1\n```',language:'JAVA21',starterCode:'public class Main {\n  public static void main(String[] args) {\n    // Ваше решение\n  }\n}',templateCode:null,timeLimitMs:1000,memoryLimitKb:262144,outputLimitKb:64,testSetVersion:1,options:null};
const progress = [{...course,solvedTasks:3,totalTasks:7,progressPercent:43,modules:[{...moduleItem,lessons:[{...lesson,solvedTasks:1,totalTasks:3,progressPercent:33},{...lesson,id:302,name:'Обход коллекций',position:2,solvedTasks:2,totalTasks:4,progressPercent:50}]}]}];
const errors = [];
const report = [];
async function fixture(context, role='ROLE_USER') {
  await context.addInitScript(() => localStorage.setItem('qlc:auth-token','visual-test-only'));
  await context.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let body;
    if(path==='/api/auth/me') body={id:999,username:'design_tester',email:'visual-test@example.invalid',role};
    else if(path==='/api/users/me/learning-courses') body=progress;
    else if(path==='/api/cart') body={courseIds:[1]};
    else if(path==='/api/catalog/courses') body=[{...course,lessonsCount:1}];
    else if(path==='/api/catalog/courses/2') body={course,modules:[{module:moduleItem,lessons:[lesson]}]};
    else if(path==='/api/courses') body=[course];
    else if(path==='/api/courses/2') body=course;
    else if(path==='/api/courses/2/access') body={access:true};
    else if(path==='/api/courses/2/modules') body=[moduleItem];
    else if(path==='/api/modules/201') body=moduleItem;
    else if(path==='/api/modules/201/lessons') body=[lesson];
    else if(path==='/api/lessons/301/learn') body={course,module:moduleItem,lesson,tasks:[task]};
    else if(path==='/api/lessons/301/task-outline') body=[{id:task.id,taskType:task.taskType}];
    else if(path==='/api/lessons/301/tasks') body=[task];
    else if(path==='/api/tasks/401/submissions') body={id:'fixture-submission',status:'QUEUED'};
    else if(path==='/api/submissions/fixture-submission') body={id:'fixture-submission',status:'FINISHED',verdict:'AC',executionTime:14,memoryUsed:1024,safeMessage:'Тестовые данные проверки интерфейса.'};
    else return route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({message:'QA fixture not defined'})});
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
}
async function inspect(page, name, width) {
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => {i.loading='eager';return i.decode().catch(()=>{});})); });
  const geometry = await page.evaluate(() => ({viewport:innerWidth,width:document.documentElement.scrollWidth,images:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),h1:document.querySelector('h1')?.textContent}));
  assert(geometry.width <= width+1, `${name}@${width} overflows: ${geometry.width}`);
  assert(!geometry.images.length, `${name} broken images: ${geometry.images}`);
  await page.screenshot({path:`${out}/${name}-${width}.png`,fullPage:true});
  report.push({name,width,...geometry});
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser = await chromium.launch({headless:true});
  for(const width of [360,768,1440]) {
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    for(const [name,path] of [['home','/'],['catalog','/courses'],['login','/login'],['register','/register'],['not-found','/missing-page']]) {
      await page.goto(base+path,{waitUntil:'networkidle'});
      await inspect(page,name,width);
    }
    await page.goto(base+'/courses',{waitUntil:'networkidle'});
    await page.getByRole('searchbox').fill('нет-такого-курса');
    await page.getByText('Курсы не найдены').waitFor();
    await inspect(page,'catalog-empty',width);
    await page.goto(base+'/login',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Войти',exact:false}).first().click();
    assert(await page.locator('[aria-invalid=true]').count()>0,'Empty login should validate');
    await inspect(page,'login-validation',width);
    if(width===360){await page.goto(base+'/');await page.getByRole('button',{name:'Открыть меню'}).click();await page.getByRole('navigation',{name:'Мобильная навигация'}).waitFor();await inspect(page,'mobile-menu',width);await page.keyboard.press('Escape');assert(!await page.getByRole('navigation',{name:'Мобильная навигация'}).count());}
    await context.close();
    const auth=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    await fixture(auth);
    const p=await auth.newPage();p.on('pageerror',e=>errors.push(e.message));
    for(const [name,path] of [['course','/courses/course-2'],['profile','/profile'],['checkout','/checkout'],['lesson','/lessons/301']]){await p.goto(base+path,{waitUntil:'networkidle'});await inspect(p,name,width);}
    await p.getByRole('button',{name:'Практика · 1',exact:true}).click();
    await inspect(p,'task',width);
    if(width<1100) await p.getByRole('button',{name:'Код',exact:true}).click();
    const editor=p.getByRole('textbox',{name:'Редактор решения задачи'});
    await editor.waitFor({state:'visible',timeout:20000});
    await editor.focus();await p.keyboard.press('Meta+A');await p.keyboard.insertText('public class Main { /* preserved draft */ }');
    await p.waitForFunction(()=>localStorage.getItem('qlc:draft:task:401:v1')?.includes('preserved draft'));
    await inspect(p,'editor',width);
    if(width<1100){await p.getByRole('button',{name:'Результат',exact:true}).click();await inspect(p,'result-idle',width);await p.getByRole('button',{name:'Код',exact:true}).click();}
    await p.getByRole('button',{name:'Сбросить код',exact:true}).click();await p.getByRole('dialog').waitFor();await inspect(p,'reset-confirm',width);await p.getByRole('button',{name:'Сохранить черновик'}).click();
    assert((await p.evaluate(()=>localStorage.getItem('qlc:draft:task:401:v1'))).includes('preserved draft'));
    await p.getByRole('button',{name:'Проверить решение',exact:false}).click();
    await p.getByText('AC / Время 14 мс / Память 1 МБ').waitFor();
    assert.equal(await p.getByText('Вывод проверки',{exact:true}).count(),0,'Debug output panel must stay hidden');
    await inspect(p,'result-success',width);
    await p.reload({waitUntil:'networkidle'});assert((await p.evaluate(()=>localStorage.getItem('qlc:draft:task:401:v1'))).includes('preserved draft'));
    await auth.close();
    const admin=await browser.newContext({viewport:{width,height:900}});await fixture(admin,'ROLE_ADMIN');const a=await admin.newPage();a.on('pageerror',e=>errors.push(e.message));await a.goto(base+'/admin/content',{waitUntil:'networkidle'});await a.getByRole('heading',{name:'Редактор обучения',exact:false}).waitFor();await inspect(a,'admin',width);await admin.close();
  }
  await browser.close();
  fs.writeFileSync(`${out}/report.json`,JSON.stringify({screens:report,errors},null,2));
  console.log(JSON.stringify({screens:report.length,errors,out}));
  assert.deepEqual(errors,[]);
})().catch(error=>{console.error(error);process.exit(1)});
