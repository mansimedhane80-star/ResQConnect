from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from geoalchemy2.elements import WKTElement

from app.database import get_db
from app.models import SOSCase
from app.schemas import SOSCreate

router = APIRouter(prefix="/sos", tags=["SOS"])


@router.post("/")
def create_sos(data: SOSCreate, db: Session = Depends(get_db)):
    try:
        case = SOSCase(
            message=data.message,
            contact_number=data.contact_number,
            latitude=data.latitude,
            longitude=data.longitude,
            disaster_type=data.disaster_type,
            urgency="pending",
            severity="pending",
            priority_score=0,
            location=WKTElement(
                f"POINT({data.longitude} {data.latitude})",
                srid=4326,
            ),
        )

        db.add(case)
        db.commit()
        db.refresh(case)

        return {
            "message": "SOS submitted successfully",
            "case_id": case.case_id,
            "verification_status": case.verification_status,
            "case_status": case.case_status,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))