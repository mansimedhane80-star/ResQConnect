from pydantic import BaseModel, Field
from typing import Optional


class SOSCreate(BaseModel):
    message: str = Field(..., min_length=5)
    contact_number: Optional[str] = None
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    disaster_type: str