
from sqlalchemy import Column, Integer, String, Text, Float, TIMESTAMP, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from geoalchemy2 import Geography

from app.database import Base


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    role = Column(String(20), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())


class AdminRegistration(Base):
    __tablename__ = "admin_registrations"

    registration_id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=False)
    admin_id = Column(String(80), unique=True, nullable=False, index=True)
    organization = Column(String(160), nullable=False)
    designation = Column(String(120), nullable=False)
    password_hash = Column(Text, nullable=False)
    government_id_ref = Column(String(80), nullable=False)
    authorization_letter_ref = Column(String(80), nullable=False)
    organization_id_ref = Column(String(80))
    application_status = Column(String(20), nullable=False, server_default="pending")
    submitted_at = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    reviewed_at = Column(TIMESTAMP)
    reviewer_id = Column(Integer, ForeignKey("users.user_id"))
    rejection_reason = Column(Text)


class SOSCase(Base):
    __tablename__ = "sos_cases"

    case_id = Column(Integer, primary_key=True, index=True)
    message = Column(Text, nullable=False)
    contact_number = Column(String(15))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    disaster_type = Column(String(30))
    urgency = Column(String(20))
    severity = Column(String(20))
    priority_score = Column(Integer)
    vulnerability = Column(
        JSONB,
        nullable=False,
        default=list,
        server_default="[]"
    )
    tracking_token_hash = Column(String(64), unique=True, index=True)

    verification_status = Column(String(20), server_default="pending")
    case_status = Column(String(20), server_default="new")
    mode = Column(String(10), server_default="LIVE")
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(
        TIMESTAMP,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp()
    )
    location = Column(Geography(geometry_type="POINT", srid=4326))


class RiskAlert(Base):
    __tablename__ = "risk_alerts"

    alert_id = Column(Integer, primary_key=True, index=True)
    disaster_type = Column(String(30), nullable=False)
    alert_level = Column(String(20), nullable=False)
    message = Column(Text)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    mode = Column(String(10), server_default="LIVE")
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    location = Column(Geography(geometry_type="POINT", srid=4326))


class Responder(Base):
    __tablename__ = "responders"

    responder_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    name = Column(String(100), nullable=False)
    skills = Column(Text)
    equipment = Column(Text)
    latitude = Column(Float)
    longitude = Column(Float)
    responder_status = Column(String(20), server_default="available")
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    location = Column(Geography(geometry_type="POINT", srid=4326))


class Resource(Base):
    __tablename__ = "resources"

    resource_id = Column(Integer, primary_key=True, index=True)
    resource_name = Column(String(100), nullable=False)
    resource_type = Column(String(50))
    quantity = Column(Integer, server_default="1")
    latitude = Column(Float)
    longitude = Column(Float)
    availability_status = Column(String(20), server_default="available")
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    location = Column(Geography(geometry_type="POINT", srid=4326))


class RoadUpdate(Base):
    __tablename__ = "road_updates"

    road_update_id = Column(Integer, primary_key=True, index=True)
    road_name = Column(String(150))
    condition = Column(String(50), nullable=False)
    message = Column(Text)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    verification_status = Column(String(20), server_default="pending")
    mode = Column(String(10), server_default="LIVE")
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    location = Column(Geography(geometry_type="POINT", srid=4326))


class CaseAssignment(Base):
    __tablename__ = "case_assignments"

    assignment_id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("sos_cases.case_id"), nullable=False)
    responder_id = Column(Integer, ForeignKey("responders.responder_id"), nullable=False)
    assigned_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    accepted_at = Column(TIMESTAMP)
    completed_at = Column(TIMESTAMP)


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    notification_id = Column(Integer, primary_key=True, index=True)
    event_key = Column(String(180), unique=True, nullable=False, index=True)
    channel = Column(String(16), nullable=False)
    outcome = Column(String(24), nullable=False, server_default="sending")
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())


class GeocodeCache(Base):
    __tablename__ = "geocode_cache"

    cache_key = Column(String(64), primary_key=True)
    address = Column(JSONB, nullable=False, default=dict, server_default="{}")
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())


class TrackingAttempt(Base):
    __tablename__ = "tracking_attempts"
    __table_args__ = (Index("ix_tracking_attempts_updated_at", "updated_at"),)

    client_key_hash = Column(String(64), primary_key=True)
    window_started_at = Column(TIMESTAMP, nullable=False)
    attempt_count = Column(Integer, nullable=False, server_default="1")
    blocked_until = Column(TIMESTAMP)
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
