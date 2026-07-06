-- 1. Убедимся, что в тасках есть нужные лимиты и версионирование
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS statement_md TEXT NOT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS starter_code TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_limit_ms INT NOT NULL DEFAULT 2000;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS memory_limit_kb INT NOT NULL DEFAULT 65536;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS output_limit_kb INT NOT NULL DEFAULT 4096;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS test_set_version INT NOT NULL DEFAULT 1;

-- 2. Приводим таблицу submissions к ТЗ релиза
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS compile_log TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

-- Таймстемпы жизненного цикла (для аналитики и графиков)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS queued_at TIMESTAMP;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP;

-- Переименовываем или добавляем поля метрик под ТЗ (ms и kb)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS time_ms BIGINT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS memory_kb BIGINT;

-- 3. Добавляем критически важные индексы для очередей и аналитики
-- Индекс для воркера (выборка QUEUED задач, сортированная по времени)
CREATE INDEX IF NOT EXISTS idx_submissions_status_queued ON submissions(status, queued_at);

-- Индекс для истории сабмишенов в задаче
CREATE INDEX IF NOT EXISTS idx_submissions_task_created ON submissions(task_id, created_at);
