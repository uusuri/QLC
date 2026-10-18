ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN auth_version INT NOT NULL DEFAULT 0;

-- Telegram accounts do not own a usable email address in the current model.
UPDATE users SET email_verified = TRUE WHERE tg_id IS NOT NULL;

CREATE TABLE account_email_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose VARCHAR(32) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_account_email_tokens_user_purpose_created
    ON account_email_tokens(user_id, purpose, created_at DESC);
