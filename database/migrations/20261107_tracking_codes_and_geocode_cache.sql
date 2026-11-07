-- Caches operator-controlled reverse-geocoding results and rate-limits failed
-- private tracking lookups. Existing SOS rows and hashes remain unchanged.
CREATE TABLE IF NOT EXISTS geocode_cache (
    cache_key VARCHAR(64) PRIMARY KEY,
    address JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tracking_attempts (
    client_key_hash VARCHAR(64) PRIMARY KEY,
    window_started_at TIMESTAMP NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 1,
    blocked_until TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_tracking_attempts_updated_at ON tracking_attempts(updated_at);
