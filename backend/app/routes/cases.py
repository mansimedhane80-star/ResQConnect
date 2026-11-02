
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, SOSCase, Responder, CaseAssignment
from app.auth import get_current_user

router = APIRouter(prefix="/cases", tags=["Cases"])


@router.get("/")
def get_all_cases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # Authority can view all SOS cases
        if current_user.role == "authority":
            cases = (
                db.query(SOSCase)
                .order_by(SOSCase.created_at.desc())
                .all()
            )

        # Responder can view only assigned SOS cases
        elif current_user.role == "responder":

            responder = db.query(Responder).filter(
                Responder.user_id == current_user.user_id
            ).first()

            if not responder:
                raise HTTPException(
                    status_code=404,
                    detail="Responder profile not found"
                )

            assigned_case_ids = (
                db.query(CaseAssignment.case_id)
                .filter(
                    CaseAssignment.responder_id == responder.responder_id
                )
                .distinct()
                .all()
            )

            case_ids = [item[0] for item in assigned_case_ids]

            cases = (
                db.query(SOSCase)
                .filter(SOSCase.case_id.in_(case_ids))
                .order_by(SOSCase.created_at.desc())
                .all()
            )

        else:
            raise HTTPException(
                status_code=403,
                detail="Access denied"
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
                "vulnerability": case.vulnerability or [],
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

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve SOS cases"
        )
