CREATE INDEX idx_submissions_user_task_created
    ON submissions (user_id, task_id, created_at DESC, id DESC);
