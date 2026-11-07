-- ============================================================
-- RES-Q CONNECT
-- PostgreSQL + PostGIS Database Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;


-- ============================================================
-- 1. USERS
-- Responders and authorities only.
-- Citizens do not require login.
-- ============================================================

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    email VARCHAR(150) UNIQUE NOT NULL,

    password_hash TEXT NOT NULL,

    role VARCHAR(20) NOT NULL
        CHECK (role IN ('responder', 'authority')),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Administrator applications stay separate from authorized user accounts.
CREATE TABLE admin_registrations (
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


-- ============================================================
-- 2. SOS CASES
-- Stores citizen emergency reports.
-- ============================================================

CREATE TABLE sos_cases (
    case_id SERIAL PRIMARY KEY,

    message TEXT NOT NULL,

    contact_number VARCHAR(15),

    latitude DOUBLE PRECISION NOT NULL,

    longitude DOUBLE PRECISION NOT NULL,

    disaster_type VARCHAR(30)
        CHECK (
            disaster_type IN (
                'flood',
                'landslide',
                'cyclone',
                'heatwave',
                'heavy_rainfall',
                'earthquake'
            )
        ),

    urgency VARCHAR(20),

    severity VARCHAR(20),

    priority_score INTEGER,

    vulnerability JSONB NOT NULL DEFAULT '[]'::jsonb,

    tracking_token_hash CHAR(64) UNIQUE,

    verification_status VARCHAR(20)
        DEFAULT 'pending'
        CHECK (
            verification_status IN (
                'pending',
                'verified',
                'rejected',
                'duplicate'
            )
        ),

    case_status VARCHAR(20)
        DEFAULT 'new'
        CHECK (
            case_status IN (
                'new',
                'verified',
                'assigned',
                'accepted',
                'in_progress',
                'resolved',
                'closed'
            )
        ),

    mode VARCHAR(10)
        DEFAULT 'LIVE'
        CHECK (
            mode IN ('LIVE', 'DEMO')
        ),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    location GEOGRAPHY(POINT, 4326)
);


-- ============================================================
-- 3. RISK ALERTS
-- ============================================================

CREATE TABLE risk_alerts (
    alert_id SERIAL PRIMARY KEY,

    disaster_type VARCHAR(30) NOT NULL
        CHECK (
            disaster_type IN (
                'flood',
                'landslide',
                'cyclone',
                'heatwave',
                'heavy_rainfall',
                'earthquake'
            )
        ),

    alert_level VARCHAR(20) NOT NULL
        CHECK (
            alert_level IN (
                'low',
                'moderate',
                'high',
                'extreme'
            )
        ),

    message TEXT,

    latitude DOUBLE PRECISION NOT NULL,

    longitude DOUBLE PRECISION NOT NULL,

    mode VARCHAR(10)
        DEFAULT 'LIVE'
        CHECK (
            mode IN ('LIVE', 'DEMO')
        ),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    location GEOGRAPHY(POINT, 4326)
);


-- ============================================================
-- 4. RESPONDERS
-- ============================================================

CREATE TABLE responders (
    responder_id SERIAL PRIMARY KEY,

    user_id INTEGER
        REFERENCES users(user_id),

    name VARCHAR(100) NOT NULL,

    skills TEXT,

    equipment TEXT,

    latitude DOUBLE PRECISION,

    longitude DOUBLE PRECISION,

    responder_status VARCHAR(20)
        DEFAULT 'available'
        CHECK (
            responder_status IN (
                'available',
                'assigned',
                'busy',
                'offline'
            )
        ),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    location GEOGRAPHY(POINT, 4326)
);


-- ============================================================
-- 5. RESOURCES
-- ============================================================

CREATE TABLE resources (
    resource_id SERIAL PRIMARY KEY,

    resource_name VARCHAR(100) NOT NULL,

    resource_type VARCHAR(50),

    quantity INTEGER DEFAULT 1,

    latitude DOUBLE PRECISION,

    longitude DOUBLE PRECISION,

    availability_status VARCHAR(20)
        DEFAULT 'available'
        CHECK (
            availability_status IN (
                'available',
                'assigned',
                'unavailable'
            )
        ),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    location GEOGRAPHY(POINT, 4326)
);


-- ============================================================
-- 6. ROAD UPDATES
-- ============================================================

CREATE TABLE road_updates (
    road_update_id SERIAL PRIMARY KEY,

    road_name VARCHAR(150),

    condition VARCHAR(50) NOT NULL,

    message TEXT,

    latitude DOUBLE PRECISION NOT NULL,

    longitude DOUBLE PRECISION NOT NULL,

    verification_status VARCHAR(20)
        DEFAULT 'pending'
        CHECK (
            verification_status IN (
                'pending',
                'verified',
                'rejected'
            )
        ),

    mode VARCHAR(10)
        DEFAULT 'LIVE'
        CHECK (
            mode IN ('LIVE', 'DEMO')
        ),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    location GEOGRAPHY(POINT, 4326)
);


-- ============================================================
-- 7. CASE ASSIGNMENTS
-- ============================================================

CREATE TABLE case_assignments (
    assignment_id SERIAL PRIMARY KEY,

    case_id INTEGER NOT NULL
        REFERENCES sos_cases(case_id),

    responder_id INTEGER NOT NULL
        REFERENCES responders(responder_id),

    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    accepted_at TIMESTAMP,

    completed_at TIMESTAMP
);


-- ============================================================
-- POSTGIS SPATIAL INDEXES
-- ============================================================

CREATE INDEX idx_sos_cases_location
ON sos_cases
USING GIST (location);

CREATE INDEX idx_risk_alerts_location
ON risk_alerts
USING GIST (location);

CREATE INDEX idx_responders_location
ON responders
USING GIST (location);

CREATE INDEX idx_resources_location
ON resources
USING GIST (location);

CREATE INDEX idx_road_updates_location
ON road_updates
USING GIST (location);

CREATE TABLE IF NOT EXISTS notification_logs (
    notification_id SERIAL PRIMARY KEY,
    event_key VARCHAR(180) NOT NULL UNIQUE,
    channel VARCHAR(16) NOT NULL CHECK (channel IN ('email', 'sms')),
    outcome VARCHAR(24) NOT NULL DEFAULT 'sending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_notification_logs_event_key ON notification_logs(event_key);

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


-- ============================================================
-- END
-- ============================================================
