ALTER TABLE tasks
    ADD COLUMN difficulty SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE tasks
    ADD CONSTRAINT chk_tasks_difficulty CHECK (difficulty BETWEEN 1 AND 3);
