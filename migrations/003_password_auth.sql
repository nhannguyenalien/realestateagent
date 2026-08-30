ALTER TABLE app_users ALTER COLUMN google_sub DROP NOT NULL;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_salt text;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_iterations integer;

ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_password_complete;
ALTER TABLE app_users ADD CONSTRAINT app_users_password_complete CHECK (
  (password_hash IS NULL AND password_salt IS NULL AND password_iterations IS NULL)
  OR
  (password_hash IS NOT NULL AND password_salt IS NOT NULL AND password_iterations >= 100000)
);

