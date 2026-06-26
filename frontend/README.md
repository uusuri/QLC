# QLC Frontend

Фронтенд учебной платформы на Next.js, TypeScript и Tailwind CSS. Визуальная концепция: темная Premium Tech / Fashion Brand эстетика, жесткая сетка, моноширинная типографика и акцент `#9ef651`.

## Архитектура папки

```text
frontend/
  app/                 # Next.js App Router: страницы, admin/content, layout и глобальные стили.
  components/          # Клиентские UI-компоненты без прямых сетевых запросов.
  services/api.ts      # Единая точка данных: backend fetch-запросы и текущие моки.
  types/index.ts       # Общие TypeScript DTO/контракты фронтенда.
  tailwind.config.ts   # Дизайн-токены Tailwind: цвета, шрифты, content-пути.
  next.config.ts       # Конфигурация Next.js.
  postcss.config.js    # Tailwind + Autoprefixer для CSS.
```

Компоненты и страницы не должны делать прямой `fetch`/`axios`. Сетевой код находится только в `services/api.ts`, а страницы работают через функции сервиса.

## Статус стыковки с бэкендом

Для главной страницы `/` подключен backend endpoint:

- `GET /api/courses`

Данные из backend `CourseDTO` маппятся в frontend-карточки курса. Если backend возвращает пустой массив, главная показывает empty state и ссылку на `/admin/content`. Если backend недоступен, главная показывает понятный error state.

Для внутренней панели `/admin/content` подключены текущие backend endpoints из `CourseController`:

- `GET /api/courses`
- `POST /api/courses`
- `GET /api/courses/{courseId}/modules`
- `POST /api/courses/{courseId}/modules`
- `GET /api/modules/{moduleId}/lessons`
- `POST /api/modules/{moduleId}/lessons`
- `GET /api/lessons/{lessonId}/tasks`
- `POST /api/lessons/{lessonId}/tasks`

Checkout и платежные сценарии пока оставлены на статичном каталоге, потому что S2-FE-06 касается только главной страницы.

Текущие моки:
- `getStaticCourseCatalog()` — статичный каталог для checkout/fallback-сценариев вне текущей задачи.
- `getStudentProfile()` — анонимный профиль студента, прогресс и купленные/активные курсы.
- `getPaymentMethods()` — Telegram Stars как основной метод и crypto как будущий шлюз.
- `getLoginNotes()` — тезисы для минималистичного экрана входа.

Все места будущей интеграции помечены комментарием:

```ts
// TODO: Интегрировать с бэком, когда появится эндпоинт...
```

Как только backend добавит реальные эндпоинты для профиля, оплаты и checkout, нужно заменить соответствующие моки внутри `services/api.ts`, не размазывая запросы по компонентам.

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

Для `/` и `/admin/content` фронтенд ходит в backend API. По умолчанию используется:

```bash
http://127.0.0.1:8080
```

Если backend запущен на другом адресе, локальную переменную нужно хранить в `.env.local`. Этот файл игнорируется корневым `.gitignore` и не должен попадать в Git:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080
```

## Git ignore

В `frontend` отдельного `.gitignore` нет. Используется корневой `.gitignore`, который игнорирует `.env*`, `node_modules/`, `.next/`, `out/`, `dist/`, `.cache/`, `.DS_Store` и локальные build-артефакты. Эти файлы не надо редактировать и добавлять в индекс.
