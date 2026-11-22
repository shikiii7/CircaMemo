BEGIN;

CREATE TABLE IF NOT EXISTS app.user_account (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS app.user_session (
    token_hash TEXT PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app.user_account(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS user_session_user_id_idx ON app.user_session (user_id);
CREATE INDEX IF NOT EXISTS user_session_expires_at_idx ON app.user_session (expires_at);

CREATE TABLE IF NOT EXISTS app.user_content (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app.user_account(id) ON DELETE CASCADE,
    heritage_pid TEXT NOT NULL,
    heritage_name TEXT NOT NULL,
    title TEXT,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_content_user_id_idx ON app.user_content (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_content_heritage_pid_idx ON app.user_content (heritage_pid);

CREATE TABLE IF NOT EXISTS app.user_content_image (
    id BIGSERIAL PRIMARY KEY,
    content_id BIGINT NOT NULL REFERENCES app.user_content(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_content_image_content_id_idx ON app.user_content_image (content_id, id);

COMMIT;
