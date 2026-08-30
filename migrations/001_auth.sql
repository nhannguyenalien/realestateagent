CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS app_users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),google_sub text NOT NULL UNIQUE,email text NOT NULL UNIQUE,name text NOT NULL,avatar_url text,role text NOT NULL DEFAULT 'agent' CHECK (role IN ('agent','admin')),created_at timestamptz NOT NULL DEFAULT now(),last_login_at timestamptz);
CREATE TABLE IF NOT EXISTS user_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,token_hash text NOT NULL UNIQUE,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS user_sessions_token_idx ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON user_sessions(user_id);
