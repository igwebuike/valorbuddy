BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50)
    DEFAULT 'approved' NOT NULL;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS mfa_secret_encrypted TEXT;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN
    DEFAULT FALSE NOT NULL;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_reset_digest VARCHAR(64);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP;

ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS rank VARCHAR(120) DEFAULT '';

ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS service_status VARCHAR(80)
    DEFAULT 'Veteran';

ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS service_start_year VARCHAR(10) DEFAULT '';

ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS service_end_year VARCHAR(10) DEFAULT '';

ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS deployment_history TEXT DEFAULT '';

ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS va_rating VARCHAR(30) DEFAULT '';

ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS accessibility_needs JSON;

ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS preferred_music_genres JSON;

ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS profile_data JSON;

ALTER TABLE reminders
    ADD COLUMN IF NOT EXISTS timezone_name VARCHAR(120) DEFAULT 'UTC';

ALTER TABLE reminders
    ADD COLUMN IF NOT EXISTS due_at TIMESTAMP;

ALTER TABLE reminders
    ADD COLUMN IF NOT EXISTS notified_at TIMESTAMP;

ALTER TABLE reminders
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

ALTER TABLE reminders
    ADD COLUMN IF NOT EXISTS delivery_state VARCHAR(50)
    DEFAULT 'scheduled';

UPDATE users
SET approval_status = 'approved'
WHERE approval_status IS NULL
   OR approval_status = '';

COMMIT;
