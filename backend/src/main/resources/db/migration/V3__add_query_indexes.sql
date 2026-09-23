DROP INDEX IF EXISTS idx_submissions_status_queued;

CREATE INDEX IF NOT EXISTS idx_courses_published_id
    ON courses (published, id);

CREATE INDEX IF NOT EXISTS idx_modules_course_position
    ON modules (course_id, position, id);

CREATE INDEX IF NOT EXISTS idx_lessons_module_position
    ON lessons (module_id, position, id);

CREATE INDEX IF NOT EXISTS idx_tasks_lesson_id
    ON tasks (lesson_id, id);

CREATE INDEX IF NOT EXISTS idx_user_courses_user_course
    ON user_courses (user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_submissions_queued_created
    ON submissions (created_at, id)
    WHERE status = 'QUEUED';
