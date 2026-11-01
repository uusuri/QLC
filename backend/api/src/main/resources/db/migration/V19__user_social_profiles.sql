-- Existing accounts remain public. Privacy is an explicit setting, not a migration side effect.
ALTER TABLE users ADD COLUMN private_profile BOOLEAN NOT NULL DEFAULT FALSE;

-- Accepted friendships continue to live in the existing friendships table.
-- A pair can have only one pending request, regardless of who sent it.
CREATE TABLE friend_requests (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requester_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, friend_id),
    CONSTRAINT chk_friend_requests_distinct_users CHECK (user_id < friend_id),
    CONSTRAINT chk_friend_requests_requester CHECK (requester_id = user_id OR requester_id = friend_id)
);

CREATE INDEX idx_friend_requests_friend_id ON friend_requests(friend_id);
CREATE INDEX idx_submissions_user_created_at ON submissions(user_id, created_at);
