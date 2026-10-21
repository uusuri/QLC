-- Replace the old Python choice in published courses without changing fixed
-- courses into multilingual courses. Preserve any new variants authors added.
INSERT INTO course_languages (course_id, language)
SELECT course_id, 'PYTHON312'
FROM course_languages
WHERE language = 'PYTHON311'
ON CONFLICT (course_id, language) DO NOTHING;

INSERT INTO course_languages (course_id, language)
SELECT existing.course_id, 'PYPY312'
FROM course_languages existing
JOIN courses course ON course.id = existing.course_id
WHERE existing.language = 'PYTHON312' AND course.multilingual = TRUE
ON CONFLICT (course_id, language) DO NOTHING;

DELETE FROM course_languages WHERE language = 'PYTHON311';

UPDATE user_courses SET selected_language = 'PYTHON312'
WHERE selected_language = 'PYTHON311';

UPDATE tasks SET language = 'PYTHON312'
WHERE language = 'PYTHON311';

INSERT INTO lesson_theory_variants (lesson_id, language, content_md)
SELECT lesson_id, 'PYTHON312', content_md
FROM lesson_theory_variants
WHERE language = 'PYTHON311'
ON CONFLICT (lesson_id, language) DO NOTHING;

DELETE FROM lesson_theory_variants WHERE language = 'PYTHON311';

-- Completed submissions really ran under the old interpreter. Only unfinished
-- attempts move to the new runner; history retains its actual language.
UPDATE submissions SET language = 'PYTHON312'
WHERE language = 'PYTHON311' AND status IN ('QUEUED', 'COMPILING', 'RUNNING');
