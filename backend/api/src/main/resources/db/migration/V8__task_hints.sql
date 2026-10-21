CREATE TABLE task_hints (
    task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    hint_position INTEGER NOT NULL,
    content_md TEXT NOT NULL,
    PRIMARY KEY (task_id, hint_position)
);
