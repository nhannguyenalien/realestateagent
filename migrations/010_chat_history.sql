CREATE TABLE IF NOT EXISTS ai_conversations (
 user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
 id uuid NOT NULL,
 payload jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,id)
);
CREATE INDEX IF NOT EXISTS ai_conversations_recent_idx ON ai_conversations(user_id,updated_at DESC);
