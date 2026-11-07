CREATE TABLE IF NOT EXISTS notification_logs (
    notification_id SERIAL PRIMARY KEY,
    event_key VARCHAR(180) NOT NULL UNIQUE,
    channel VARCHAR(16) NOT NULL CHECK (channel IN ('email', 'sms')),
    outcome VARCHAR(24) NOT NULL DEFAULT 'sending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_notification_logs_event_key ON notification_logs(event_key);
