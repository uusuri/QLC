-- Existing modules and their progress remain untouched until an author assigns a level.
ALTER TABLE modules ADD COLUMN learning_level INTEGER;
ALTER TABLE modules ADD CONSTRAINT chk_modules_learning_level
    CHECK (learning_level BETWEEN 1 AND 3);
