ALTER TABLE tasks ADD COLUMN IF NOT EXISTS language VARCHAR(32);

UPDATE tasks
SET language = 'CPP23'
WHERE task_type = 'CODE' AND language IS NULL;
