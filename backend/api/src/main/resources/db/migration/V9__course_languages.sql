ALTER TABLE courses ADD COLUMN multilingual BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE user_courses ADD COLUMN selected_language VARCHAR(32);

CREATE TABLE course_languages (
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    language VARCHAR(32) NOT NULL,
    PRIMARY KEY (course_id, language)
);

-- Keep current course languages; existing learners choose a language on their next visit.
INSERT INTO course_languages(course_id, language)
SELECT id, CASE WHEN lower(name) LIKE '%java%' AND lower(name) NOT LIKE '%javascript%'
    THEN 'JAVA21' ELSE 'CPP23' END FROM courses;
UPDATE courses SET multilingual = TRUE WHERE name = 'Алгоритмы и структуры данных';
INSERT INTO course_languages(course_id, language)
SELECT c.id, l.language FROM courses c CROSS JOIN (VALUES
    ('JAVA21'),
    ('PYTHON311'),
    ('JAVASCRIPT_ES2022'),
    ('TYPESCRIPT5'),
    ('CSHARP_12'),
    ('C17'),
    ('GO120'),
    ('PHP81'),
    ('RUST2021')) AS l(language)
WHERE c.name = 'Алгоритмы и структуры данных';
