CREATE TABLE IF NOT EXISTS task_test_correct_indexes (
    task_id BIGINT NOT NULL,
    correct_index INT NOT NULL,
    CONSTRAINT fk_task_test_correct_indexes_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Создаем индекс для быстрого поиска ответов к конкретной задаче
CREATE INDEX IF NOT EXISTS idx_task_test_correct_indexes_task_id ON task_test_correct_indexes(task_id);
