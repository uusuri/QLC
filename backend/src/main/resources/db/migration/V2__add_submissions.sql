CREATE TABLE submissions (
    id UUID PRIMARY KEY,
    task_id BIGINT NOT NULL,
    user_id BIGINT,
    language VARCHAR(50) NOT NULL,
    source_code TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    verdict VARCHAR(50),
    execution_time BIGINT,
    memory_used BIGINT,
    safe_message TEXT,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_submissions_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_submissions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Индексы для быстрой фильтрации в будущем
CREATE INDEX idx_submissions_task ON submissions(task_id);
CREATE INDEX idx_submissions_user ON submissions(user_id);
