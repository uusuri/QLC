-- 1. Таблица пользователей (users)
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    tg_id BIGINT UNIQUE,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL,
    registration_date TIMESTAMP NOT NULL
);

-- 2. Таблица курсов (courses)
CREATE TABLE courses (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,          -- BigDecimal в Java
    price_in_stars NUMERIC(10, 2) NOT NULL,
    hidden_content_link VARCHAR(512)
);

-- 3. Таблица модулей (modules)
CREATE TABLE modules (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    CONSTRAINT fk_modules_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
);

-- 4. Таблица уроков (lessons)
CREATE TABLE lessons (
    id BIGSERIAL PRIMARY KEY,
    module_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    CONSTRAINT fk_lessons_module FOREIGN KEY (module_id) REFERENCES modules (id) ON DELETE CASCADE
);

-- 5. Общая таблица задач (tasks) — ТЕПЕРЬ СВЯЗАНА С УРОКОМ
CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    lesson_id BIGINT NOT NULL,       -- Перевели связь с course_id на lesson_id
    task_type VARCHAR(50) NOT NULL, -- Дискриминатор: TEST, CODE, NUMERIC
    task_text TEXT NOT NULL,
    
    -- Поля для TestTask
    correct_option_index INT,
    
    -- Поля для CodeTask
    template_code TEXT,
    test_cases TEXT,
    
    -- Поля для NumericTask
    correct_numeric_answer NUMERIC(19, 4),
    
    CONSTRAINT fk_tasks_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE CASCADE
);

-- 6. Таблица для вариантов ответов к тестам (ElementCollection в JPA)
CREATE TABLE task_test_options (
    task_id BIGINT NOT NULL,
    option_text VARCHAR(512) NOT NULL,
    CONSTRAINT fk_options_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
);

-- 7. Промежуточная таблица для купленных курсов (ManyToMany между User и Course)
CREATE TABLE user_courses (
    course_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (course_id, user_id),
    CONSTRAINT fk_uc_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
    CONSTRAINT fk_uc_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 8. Промежуточная таблица для курсов, выбранных при регистрации
CREATE TABLE user_registration_courses (
    user_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, course_id),
    CONSTRAINT fk_urc_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_urc_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
);
