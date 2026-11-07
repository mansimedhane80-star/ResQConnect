-- Repeatable migration for private administrator applications and citizen
-- SOS tracking. Existing rows are preserved; old SOS rows keep a NULL token.

CREATE TABLE IF NOT EXISTS admin_registrations (
    registration_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    admin_id VARCHAR(80) NOT NULL UNIQUE,
    organization VARCHAR(160) NOT NULL,
    designation VARCHAR(120) NOT NULL,
    password_hash TEXT NOT NULL,
    government_id_ref VARCHAR(80) NOT NULL,
    authorization_letter_ref VARCHAR(80) NOT NULL,
    organization_id_ref VARCHAR(80),
    application_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (application_status IN ('pending', 'approved', 'rejected')),
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewer_id INTEGER REFERENCES users(user_id),
    rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_registrations_status_submitted
    ON admin_registrations (application_status, submitted_at DESC);

ALTER TABLE sos_cases
    ADD COLUMN IF NOT EXISTS tracking_token_hash CHAR(64);

ALTER TABLE sos_cases
    ADD COLUMN IF NOT EXISTS vulnerability JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sos_cases_tracking_token_hash
    ON sos_cases (tracking_token_hash)
    WHERE tracking_token_hash IS NOT NULL;
