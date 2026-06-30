# QLC Frontend

Фронтенд учебной платформы на Next.js, TypeScript и Tailwind CSS. Визуальная концепция: темная Premium Tech / Fashion Brand эстетика, жесткая сетка, моноширинная типографика и акцент `#9ef651`.

## Архитектура папки

```text
frontend/
  app/                 # Next.js App Router: витрина, checkout, course/lesson, admin/content.
  components/          # UI-компоненты без прямых сетевых запросов.
  components/ui/       # Shared UI-kit: Button, Panel, Alert, StatusBadge, Skeleton, Progress, Tabs.
  services/api.ts      # Единая точка данных: backend fetch-запросы и текущие моки.
  types/index.ts       # Общие TypeScript DTO/контракты фронтенда.
  COMPONENT_GUIDE.md   # Короткий контекст для новых компонентов в текущем стиле.
  tailwind.config.ts   # Дизайн-токены Tailwind: цвета, шрифты, content-пути.
  next.config.ts       # Конфигурация Next.js.
  postcss.config.js    # Tailwind + Autoprefixer для CSS.
```

Компоненты и страницы не должны делать прямой `fetch`/`axios`. Сетевой код находится только в `services/api.ts`, а страницы работают через функции сервиса.

## Статус стыковки с бэкендом

Для главной страницы `/`, страницы курса `/courses/[slug]`, страницы урока `/lessons/[id]` и страницы оплаты `/checkout` подключены backend endpoints:

- `GET /api/courses`
- `GET /api/courses/{id}`
- `GET /api/courses/{courseId}/modules`
- `GET /api/modules/{id}`
- `GET /api/modules/{moduleId}/lessons`
- `GET /api/lessons/{id}`
- `GET /api/lessons/{lessonId}/tasks`

Данные из backend `CourseDTO` маппятся в frontend-карточки курса. Если backend возвращает пустой массив, главная и checkout показывают empty state и ссылку на `/admin/content`. Если backend недоступен, страницы показывают понятный error state без stack trace.

Learning path Sprint 2:
- первый курс из backend-каталога считается доступным и ведет на `/courses/course-{id}`;
- остальные курсы на витрине маркируются `Скоро` и не ведут в фиктивную оплату;
- `/courses/[slug]` показывает модули и уроки выбранного курса;
- `/lessons/[id]` показывает материал урока, CODE-задачу, Monaco Editor и submission lifecycle;
- markdown-описания рендерятся ограниченным безопасным renderer без `dangerouslySetInnerHTML`.

Для внутренней панели `/admin/content` подключены текущие backend endpoints из `CourseController`:

- `GET /api/courses`
- `POST /api/courses`
- `GET /api/courses/{courseId}/modules`
- `POST /api/courses/{courseId}/modules`
- `GET /api/modules/{moduleId}/lessons`
- `POST /api/modules/{moduleId}/lessons`
- `GET /api/lessons/{lessonId}/tasks`
- `POST /api/lessons/{lessonId}/tasks`

Checkout больше не использует статичный каталог как основной источник. Курс выбирается по query-параметру `course`, например `/checkout?course=course-1`, где slug строится из backend `id`. Если курс не найден, checkout показывает not-found state и не fallback-ится на первый курс.

Для submission UI используются фактические текущие endpoints backend `SubmissionController`:

- `POST /api/tasks/{taskId}/submissions`
- `GET /api/submissions/{id}`

Если backend позже перенесет submission API на `/api/v1`, нужно поменять пути только в `services/api.ts`.

Auth flow:
- `/login` — username/password form;
- `/register` — username/email/password/repeatPassword form;
- token хранится в `localStorage` под ключом `qlc:auth-token`;
- user summary хранится под ключом `qlc:auth-user`;
- nav после hydration показывает `@username` и `Выйти`;
- submission UI не отправляет решение без auth state;
- `createSubmission()` добавляет `Authorization: Bearer {token}` через `apiRequest({ auth: true })`;
- request body submission содержит только `language` и `sourceCode`, без `userId`.

В текущем backend-коде пока нет `AuthController` для `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`. Поэтому `registerUser()`, `loginUser()` и `getCurrentUser()` сейчас работают как чистый frontend mock с TODO-комментариями. Как только backend добавит эти endpoints, нужно заменить mock-часть внутри `services/api.ts`; компоненты менять не нужно.

Monaco Editor подключен через `@monaco-editor/react` client-only. Draft решения хранится в `localStorage` по ключу task ID, последний submission ID тоже хранится локально для повторного polling после refresh.

Текущие моки:
- `getStaticCourseCatalog()` — статичный каталог только для будущих локальных fallback/debug-сценариев, не основной источник для `/` и `/checkout`.
- `getStudentProfile()` — анонимный профиль студента, прогресс и купленные/активные курсы.
- `getPaymentMethods()` — Telegram Stars как основной метод и crypto как будущий шлюз; платежного backend endpoint пока нет.
- `getLoginNotes()` — тезисы для минималистичного экрана входа.
- `registerUser()` / `loginUser()` / `getCurrentUser()` — временный frontend auth mock до появления backend AuthController.

Все места будущей интеграции помечены комментарием:

```ts
// TODO: Интегрировать с бэком, когда появится эндпоинт...
```

Как только backend добавит реальные эндпоинты для auth, профиля, оплаты и доступа к купленным курсам, нужно заменить соответствующие моки внутри `services/api.ts`, не размазывая запросы по компонентам.

## Тестовая среда и CI

В текущем фронтенде нет Jest/Vitest/Playwright/Cypress конфигов, XML-репортеров и тестовых файлов. Frontend CI в `.github/workflows/frontend.yml` выполняет:

```bash
cd frontend
npm ci
npm run build
```

Локальная проверка перед пушем:

```bash
npm ci
npm run build
```

Главные требования пайплайна сейчас: строгий TypeScript из `tsconfig.json` и успешная сборка Next.js.

## Локальный запуск

Установка зависимостей:

```bash
npm ci
```

Dev-сервер:

```bash
npm run dev
```

По умолчанию Next.js запускается на `127.0.0.1:3000`. Если порт занят, Next предложит другой порт.

Production-сборка:

```bash
npm run build
npm run start
```

## Переменные окружения

Для `/`, `/admin/content`, `/courses/[slug]`, `/lessons/[id]`, `/checkout` и submission polling фронтенд ходит в backend API. По умолчанию используется:

```bash
http://127.0.0.1:8080
```

Если backend запущен на другом адресе, локальную переменную нужно хранить в `.env.local`. Этот файл игнорируется корневым `.gitignore` и не должен попадать в Git:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080
```

## Git ignore

В `frontend` отдельного `.gitignore` нет. Используется корневой `.gitignore`, который игнорирует `.env*`, `node_modules/`, `.next/`, `out/`, `dist/`, `.cache/`, `.DS_Store` и локальные build-артефакты. Эти файлы не надо редактировать и добавлять в индекс.
