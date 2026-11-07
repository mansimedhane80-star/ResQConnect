from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional
from app.tracking import normalize_tracking_credential


# --------------------------------
# SOS CREATION SCHEMA
# --------------------------------

class SOSCreate(BaseModel):
    message: str = Field(..., min_length=5, max_length=2000)
    contact_number: str = Field(
        ..., min_length=7, max_length=15,
        pattern=r"^[+0-9][0-9\s().-]{5,14}$"
    )
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    disaster_type: Literal[
        "flood", "landslide", "cyclone", "heatwave",
        "heavy_rainfall", "earthquake"
    ]

    @field_validator("message")
    @classmethod
    def message_must_contain_text(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 5:
            raise ValueError("Describe the emergency in at least 5 characters")
        return value


# --------------------------------
# LOGIN SCHEMA
# --------------------------------

class LoginRequest(BaseModel):
    email: str
    password: str


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)


# --------------------------------
# ADMIN RESPONDER CREATION SCHEMA
# --------------------------------

class ResponderCreate(BaseModel):
    name: str
    email: str
    password: str = Field(..., min_length=8)
    skills: Optional[str] = None
    equipment: Optional[str] = None


# --------------------------------
# RESPONDER SELF-REGISTRATION SCHEMA
# --------------------------------

class ResponderRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str
    password: str = Field(..., min_length=8)
    responder_type: Optional[str] = None
    equipment: Optional[str] = None


# --------------------------------
# CASE ASSIGNMENT SCHEMA
# --------------------------------

class CaseAssignmentCreate(BaseModel):
    case_id: int = Field(..., gt=0)
    responder_id: int = Field(..., gt=0)


class TrackingRequest(BaseModel):
    tracking_token: str = Field(..., min_length=23, max_length=100)

    @field_validator("tracking_token", mode="before")
    @classmethod
    def normalize_tracking_code(cls, value: str) -> str:
        if not isinstance(value, str):
            return value
        return normalize_tracking_credential(value)


class AdminRejection(BaseModel):
    reason: str = Field(..., min_length=5, max_length=2000)

    @field_validator("reason")
    @classmethod
    def reason_must_contain_text(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 5:
            raise ValueError("Provide a rejection reason of at least 5 characters")
        return value
