-- One-time reset: retain submission history, but only count new attempts as progress.
ALTER TABLE submissions ADD COLUMN counts_for_progress BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE submissions ALTER COLUMN counts_for_progress SET DEFAULT TRUE;

ALTER TABLE users ADD COLUMN last_learning_task_id BIGINT;
ALTER TABLE users ADD CONSTRAINT fk_users_last_learning_task
    FOREIGN KEY (last_learning_task_id) REFERENCES tasks(id) ON DELETE SET NULL;

CREATE INDEX idx_submissions_learning_progress ON submissions (user_id, task_id)
    WHERE counts_for_progress = TRUE AND status = 'FINISHED' AND verdict = 'AC';
