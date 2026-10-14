from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import SOSCase

router = APIRouter(prefix="/cases", tags=["Cases"])


@router.get("/")
def get_all_cases(db: Session = Depends(get_db)):
    try:
        cases = (
            db.query(SOSCase)
            .order_by(SOSCase.created_at.desc())
            .all()
        )

        result = []

        for case in cases:
            result.append({
                "case_id": case.case_id,
                "message": case.message,
                "contact_number": case.contact_number,
                "latitude": case.latitude,
                "longitude": case.longitude,
                "disaster_type": case.disaster_type,
                "urgency": case.urgency,
                "severity": case.severity,
                "priority_score": case.priority_score,
                "verification_status": case.verification_status,
                "case_status": case.case_status,
                "mode": case.mode,
                "created_at": (
                    case.created_at.isoformat()
                    if case.created_at else None
                ),
                "updated_at": (
                    case.updated_at.isoformat()
                    if case.updated_at else None
                )
            })

        return result

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )