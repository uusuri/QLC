-- A generated Telegram placeholder is not a verified mailbox.
UPDATE users
SET email_verified = FALSE
WHERE tg_id IS NOT NULL
  AND email = 'telegram-' || tg_id || '@telegram.local';
