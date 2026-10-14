-- started_at, queued_at and retry_count already exist in V1; start tracking them.
ALTER TABLE submissions ADD COLUMN execution_token UUID;
UPDATE submissions SET queued_at = created_at WHERE status = 'QUEUED' AND queued_at IS NULL;
UPDATE submissions SET started_at = created_at
    WHERE status IN ('COMPILING', 'RUNNING') AND started_at IS NULL;
CREATE INDEX idx_submissions_execution_recovery ON submissions ((COALESCE(started_at, created_at)), id)
    WHERE status IN ('COMPILING', 'RUNNING');
CREATE INDEX idx_submissions_queue_recovery ON submissions ((COALESCE(queued_at, created_at)), id)
    WHERE status = 'QUEUED';
