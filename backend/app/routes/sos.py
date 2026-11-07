
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from geoalchemy2.elements import WKTElement

from app.database import get_db
from app.models import SOSCase
from app.schemas import SOSCreate
from app.config import settings
from app.notifications import notify_sms
from app.tracking import generate_tracking_code, tracking_credential_hash
from app.geocoding import resolve_and_cache_address
from ai.priority_score import analyze_sos_priority

router = APIRouter(prefix="/sos", tags=["SOS"])

logger = logging.getLogger(__name__)


@router.post("/")
def create_sos(
    data: SOSCreate,
    db: Session = Depends(get_db)
):
    """
    Public SOS submission endpoint.
    Citizen login is not required.
    """

    try:
        # 1. Analyse the SOS message using AI.
        analysis = analyze_sos_priority(data.message)

        # 2. Extract AI results.
        urgency = analysis["urgency"]
        vulnerabilities = analysis["vulnerability"]
        required_help = analysis["required_help"]
        detected_disaster = analysis["disaster_type"]

        # 3. Calculate priority.
        priority_score = analysis["priority_score"]

        # 4. Use detected disaster type if recognised.
        disaster_type = (
            detected_disaster
            if detected_disaster != "unknown"
            else data.disaster_type
        )

        # The database unique constraint remains the final collision guard.
        tracking_token = None
        for collision_retry in range(3):
            tracking_token = generate_tracking_code()
            case = SOSCase(
                message=data.message.strip(),
                contact_number=data.contact_number,
                latitude=data.latitude,
                longitude=data.longitude,
                disaster_type=disaster_type,
                urgency=urgency,
                severity=urgency,
                priority_score=priority_score,
                vulnerability=vulnerabilities,
                tracking_token_hash=tracking_credential_hash(tracking_token),
                location=WKTElement(
                    f"POINT({data.longitude} {data.latitude})",
                    srid=4326
                )
            )
            db.add(case)
            try:
                db.commit()
                break
            except IntegrityError:
                db.rollback()
                if collision_retry == 2:
                    raise
        db.refresh(case)

        # Best-effort: geocoding failure never affects the saved SOS or its coordinates.
        resolve_and_cache_address(db, case.latitude, case.longitude)

        tracking_url = f"{settings.PUBLIC_WEB_URL.rstrip('/')}?page=citizen-track#{tracking_token}"
        notify_sms(
            db, f"sos:{case.case_id}:citizen_confirmation", data.contact_number,
            f"ResQConnect received your SOS (Case #{case.case_id}). Track status securely: {tracking_url}",
        )

        # 7. Return confirmation.
        return {
            "message": "SOS submitted and analysed successfully",
            "case_id": case.case_id,
            "tracking_token": tracking_token,
            "disaster_type": case.disaster_type,
            "urgency": case.urgency,
            "severity": case.severity,
            "priority_score": case.priority_score,
            "vulnerability": case.vulnerability or [],
            "required_help": required_help,
            "verification_status": case.verification_status,
            "case_status": case.case_status,
            "created_at": case.created_at.isoformat() if case.created_at else None,
        }

    except Exception:
        db.rollback()

        logger.exception("SOS submission failed")

        raise HTTPException(
            status_code=500,
            detail="Unable to submit SOS request. Please try again."
        )
