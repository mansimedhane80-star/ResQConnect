INSERT INTO responders (
    name,
    skills,
    equipment,
    latitude,
    longitude,
    responder_status,
    location
)
VALUES (
    'Demo Responder 1',
    'first aid, flood rescue',
    'medical kit, rescue boat',
    19.9975,
    73.7898,
    'available',
    ST_SetSRID(ST_MakePoint(73.7898, 19.9975), 4326)::geography
);

INSERT INTO resources (
    resource_name,
    resource_type,
    quantity,
    latitude,
    longitude,
    availability_status,
    location
)
VALUES (
    'Demo Rescue Boat',
    'rescue_boat',
    1,
    19.9980,
    73.7905,
    'available',
    ST_SetSRID(ST_MakePoint(73.7905, 19.9980), 4326)::geography
);

INSERT INTO road_updates (
    road_name,
    condition,
    message,
    latitude,
    longitude,
    verification_status,
    mode,
    location
)
VALUES (
    'Demo Road',
    'blocked',
    'Road is blocked due to flooding.',
    19.9985,
    73.7910,
    'verified',
    'DEMO',
    ST_SetSRID(ST_MakePoint(73.7910, 19.9985), 4326)::geography
);

INSERT INTO risk_alerts (
    disaster_type,
    alert_level,
    message,
    latitude,
    longitude,
    mode,
    location
)
VALUES (
    'flood',
    'high',
    'High flood risk reported in this area.',
    19.9990,
    73.7915,
    'DEMO',
    ST_SetSRID(ST_MakePoint(73.7915, 19.9990), 4326)::geography
);

INSERT INTO sos_cases (
    message,
    latitude,
    longitude,
    disaster_type,
    urgency,
    severity,
    priority_score,
    verification_status,
    case_status,
    mode,
    location
)
VALUES (
    'Water entered my house',
    19.9975,
    73.7898,
    'flood',
    'high',
    'high',
    82,
    'pending',
    'new',
    'DEMO',
    ST_SetSRID(ST_MakePoint(73.7898, 19.9975), 4326)::geography
);