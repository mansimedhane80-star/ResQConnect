
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from geoalchemy2.elements import WKTElement

from app.database import get_db
from app.models import SOSCase
from app.schemas import SOSCreate
from ai.sos_classifier import analyze_sos

router = APIRouter(prefix="/sos", tags=["SOS"])

logger = logging.getLogger(__name__)


def calculate_priority(urgency, vulnerabilities):
    """
    Basic project priority heuristic.
    This is not a validated emergency triage scale.
    """

    urgency_scores = {
        "high": 80,
        "medium": 50,
        "low": 20
    }

    score = urgency_scores.get(urgency, 0)
    score += len(vulnerabilities) * 5

    return min(score, 100)


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
        analysis = analyze_sos(data.message)

        # 2. Extract AI results.
        urgency = analysis["urgency"]
        vulnerabilities = analysis["vulnerability"]
        required_help = analysis["required_help"]
        detected_disaster = analysis["disaster_type"]

        # 3. Calculate priority.
        priority_score = calculate_priority(
            urgency,
            vulnerabilities
        )

        # 4. Use detected disaster type if recognised.
        disaster_type = (
            detected_disaster
            if detected_disaster != "unknown"
            else data.disaster_type
        )

        # 5. Create SOS record.
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
            location=WKTElement(
                f"POINT({data.longitude} {data.latitude})",
                srid=4326
            )
        )

        # 6. Save to database.
        db.add(case)
        db.commit()
        db.refresh(case)

        # 7. Return confirmation.
        return {
            "message": "SOS submitted and analysed successfully",
            "case_id": case.case_id,
            "disaster_type": case.disaster_type,
            "urgency": case.urgency,
            "severity": case.severity,
            "priority_score": case.priority_score,
            "vulnerability": case.vulnerability or [],
            "required_help": required_help,
            "verification_status": case.verification_status,
            "case_status": case.case_status
        }

    except Exception:
        db.rollback()

        logger.exception("SOS submission failed")

        raise HTTPException(
            status_code=500,
            detail="Unable to submit SOS request. Please try again."
        )
