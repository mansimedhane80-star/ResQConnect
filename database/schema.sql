CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('responder', 'authority')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sos_cases (
    case_id SERIAL PRIMARY KEY,
    message TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    disaster_type VARCHAR(30),
    urgency VARCHAR(20),
    severity VARCHAR(20),
    priority_score INTEGER,
    verification_status VARCHAR(20) DEFAULT 'pending',
    case_status VARCHAR(20) DEFAULT 'new',
    mode VARCHAR(10) DEFAULT 'LIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE risk_alerts (
    alert_id SERIAL PRIMARY KEY,
    disaster_type VARCHAR(30) NOT NULL,
    alert_level VARCHAR(20) NOT NULL,
    message TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    mode VARCHAR(10) DEFAULT 'LIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE responders (
    responder_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    name VARCHAR(100) NOT NULL,
    skills TEXT,
    equipment TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    responder_status VARCHAR(20) DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resources (
    resource_id SERIAL PRIMARY KEY,
    resource_name VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    quantity INTEGER DEFAULT 1,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    availability_status VARCHAR(20) DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE road_updates (
    road_update_id SERIAL PRIMARY KEY,
    road_name VARCHAR(150),
    condition VARCHAR(50) NOT NULL,
    message TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    verification_status VARCHAR(20) DEFAULT 'pending',
    mode VARCHAR(10) DEFAULT 'LIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE case_assignments (
    assignment_id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL REFERENCES sos_cases(case_id),
    responder_id INTEGER NOT NULL REFERENCES responders(responder_id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    completed_at TIMESTAMP
);

ALTER TABLE sos_cases
ADD COLUMN location GEOGRAPHY(POINT, 4326);

ALTER TABLE risk_alerts
ADD COLUMN location GEOGRAPHY(POINT, 4326);

ALTER TABLE responders
ADD COLUMN location GEOGRAPHY(POINT, 4326);

ALTER TABLE resources
ADD COLUMN location GEOGRAPHY(POINT, 4326);

ALTER TABLE road_updates
ADD COLUMN location GEOGRAPHY(POINT, 4326);

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