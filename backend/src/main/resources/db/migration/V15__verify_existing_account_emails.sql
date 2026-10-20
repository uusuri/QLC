-- One-time grandfathering: only accounts that exist when this migration runs.
-- Accounts registered afterwards keep email_verified = FALSE until confirmation.
UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE;
