-- === 1. ПОЛЬЗОВАТЕЛИ ===
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    tg_id BIGINT UNIQUE,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL,
    registration_date TIMESTAMP NOT NULL
);

-- === 2. КУРСЫ ===
CREATE TABLE courses (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    price_in_stars NUMERIC(10, 2) NOT NULL,
    hidden_content_link VARCHAR(512),
    published BOOLEAN NOT NULL DEFAULT TRUE
);

-- === 3. МОДУЛИ ===
CREATE TABLE modules (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_modules_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
);

-- === 4. УРОКИ ===
CREATE TABLE lessons (
    id BIGSERIAL PRIMARY KEY,
    module_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    content_md TEXT,
    CONSTRAINT fk_lessons_module FOREIGN KEY (module_id) REFERENCES modules (id) ON DELETE CASCADE
);

-- === 5. ЗАДАЧИ ===
CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    lesson_id BIGINT NOT NULL,
    task_type VARCHAR(50) NOT NULL, -- TEST, CODE, NUMERIC
    statement_md TEXT NOT NULL,
    starter_code TEXT,
    template_code TEXT,
    test_cases TEXT,
    correct_option_index INT,
    correct_numeric_answer NUMERIC(19, 4),
    time_limit_ms INT NOT NULL DEFAULT 2000,
    memory_limit_kb INT NOT NULL DEFAULT 65536,
    output_limit_kb INT NOT NULL DEFAULT 4096,
    test_set_version INT NOT NULL DEFAULT 1,
    CONSTRAINT fk_tasks_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE CASCADE
);

-- === 6. ДОПОЛНИТЕЛЬНЫЕ ТАБЛИЦЫ ДЛЯ ЗАДАЧ ===
CREATE TABLE task_test_options (
    task_id BIGINT NOT NULL,
    option_text VARCHAR(512) NOT NULL,
    CONSTRAINT fk_options_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
);

CREATE TABLE task_test_correct_indexes (
    task_id BIGINT NOT NULL,
    correct_index INT NOT NULL,
    CONSTRAINT fk_task_test_correct_indexes_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- === 7. СВЯЗУЮЩИЕ ТАБЛИЦЫ (МНОГИЕ-КО-МНОГИМ) ===
CREATE TABLE user_courses (
    course_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (course_id, user_id),
    CONSTRAINT fk_uc_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
    CONSTRAINT fk_uc_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE user_registration_courses (
    user_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, course_id),
    CONSTRAINT fk_urc_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_urc_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
);

-- === 8. РЕШЕНИЯ (SUBMISSIONS) ===
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
    compile_log TEXT,
    failed_test_number INT,
    retry_count INT NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 1,
    idempotency_key VARCHAR(100),
    created_at TIMESTAMP NOT NULL,
    queued_at TIMESTAMP,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    time_ms BIGINT,
    memory_kb BIGINT,
    CONSTRAINT fk_submissions_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_submissions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- === 9. ИНДЕКСЫ ===
CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE UNIQUE INDEX idx_submissions_idempotency_key ON submissions(idempotency_key);
CREATE INDEX idx_task_test_correct_indexes_task_id ON task_test_correct_indexes(task_id);

-- Индексы для оптимизации очередей и истории
CREATE INDEX idx_submissions_status_queued ON submissions(status, queued_at);
CREATE INDEX idx_submissions_task_created ON submissions(task_id, created_at);
