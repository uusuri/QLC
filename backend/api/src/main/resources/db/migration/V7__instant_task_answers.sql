ALTER TABLE submissions ALTER COLUMN source_code DROP NOT NULL;
ALTER TABLE submissions ALTER COLUMN language DROP NOT NULL;
ALTER TABLE submissions ADD COLUMN submitted_answer TEXT;

-- Preserve the existing physical order once, then persist option positions explicitly.
ALTER TABLE task_test_options ADD COLUMN option_position INTEGER;
WITH positions AS (
    SELECT ctid, ROW_NUMBER() OVER (PARTITION BY task_id ORDER BY ctid) - 1 AS position
    FROM task_test_options
)
UPDATE task_test_options options SET option_position = positions.position
FROM positions WHERE options.ctid = positions.ctid;
