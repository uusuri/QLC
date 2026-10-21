CREATE TABLE lesson_theory_variants (
    lesson_id BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    language VARCHAR(32) NOT NULL,
    content_md TEXT NOT NULL,
    PRIMARY KEY (lesson_id, language)
);
