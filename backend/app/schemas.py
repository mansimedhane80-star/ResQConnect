from pydantic import BaseModel, Field
from typing import Optional


# --------------------------------
# SOS CREATION SCHEMA
# --------------------------------

class SOSCreate(BaseModel):
    message: str = Field(..., min_length=5)
    contact_number: str = Field(..., min_length=7, max_length=15)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    disaster_type: str


# --------------------------------
# LOGIN SCHEMA
# --------------------------------

class LoginRequest(BaseModel):
    email: str
    password: str


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