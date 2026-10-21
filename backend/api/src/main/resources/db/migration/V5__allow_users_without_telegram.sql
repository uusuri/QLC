-- Email/password accounts do not have a Telegram identity.
-- Keep existing IDs: fabricated and genuine historical IDs cannot be safely
-- distinguished using the current schema alone.
ALTER TABLE users ALTER COLUMN tg_id DROP NOT NULL;
