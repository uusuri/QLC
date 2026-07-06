-- === КАРТОЧКА 1: Курсы, Модули, Уроки ===

-- 1. Добавляем флаг публикации для курсов
ALTER TABLE courses ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT true;

-- 2. Добавляем позиционирование для модулей
ALTER TABLE modules ADD COLUMN IF NOT EXISTS position INT NOT NULL DEFAULT 0;

-- 3. Добавляем поля для уроков (позиция, статус публикации, контент)
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS position INT NOT NULL DEFAULT 0;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_md TEXT;


-- === КАРТОЧКА 2: Сабмишены и Интеграция с Раннером ===

-- 4. Добавляем недостающие поля жизненного цикла и логирования в submissions
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS compile_log TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS failed_test_number INT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- Таймстемпы из ТЗ
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS queued_at TIMESTAMP;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP;

-- Метрики из ТЗ (ms и kb)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS time_ms BIGINT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS memory_kb BIGINT;

-- Идемпотентность для защиты от двойных ретраев
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_idempotency_key ON submissions(idempotency_key);


-- === ИНДЕКСЫ ИЗ ТЗ ===

-- Индекс для стабильной и быстрой выборки QUEUED задач воркером
CREATE INDEX IF NOT EXISTS idx_submissions_status_queued ON submissions(status, queued_at);

-- Индекс для вывода истории сабмишенов внутри таски
CREATE INDEX IF NOT EXISTS idx_submissions_task_created ON submissions(task_id, created_at);
