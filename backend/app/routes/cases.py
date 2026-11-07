
from datetime import datetime, timedelta, timezone
import hashlib

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models import User, SOSCase, Responder, CaseAssignment, TrackingAttempt, GeocodeCache
from app.auth import get_current_user
from app.config import settings
from app.geocoding import coordinate_cache_key, get_cached_address
from app.tracking import tracking_credential_hash
from app.schemas import TrackingRequest

router = APIRouter(prefix="/cases", tags=["Cases"])


def _record_failed_tracking_attempt(db: Session, request: Request) -> None:
    """Allow 10 invalid lookups per client per 15 minutes, then cool down."""
    host = request.client.host if request.client else "unknown-client"
    client_key = hashlib.sha256(f"{settings.SECRET_KEY}:{host}".encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    window = timedelta(minutes=15)
    row = db.query(TrackingAttempt).filter(
        TrackingAttempt.client_key_hash == client_key
    ).with_for_update().first()

    if row is None:
        # Keep only a short hashed-IP history for throttling.
        db.query(TrackingAttempt).filter(
            TrackingAttempt.updated_at < now - timedelta(days=1)
        ).delete(synchronize_session=False)
        row = TrackingAttempt(client_key_hash=client_key, window_started_at=now, attempt_count=1)
        db.add(row)
        try:
            db.commit()
            return
        except IntegrityError:
            db.rollback()
            row = db.query(TrackingAttempt).filter(
                TrackingAttempt.client_key_hash == client_key
            ).with_for_update().first()
            if row is None:
                raise HTTPException(status_code=503, detail="Tracking is temporarily unavailable")

    if row.blocked_until and row.blocked_until > now:
        retry_after = max(1, int((row.blocked_until - now).total_seconds()))
        raise HTTPException(status_code=429, detail="Too many invalid tracking attempts. Try again later.",
                            headers={"Retry-After": str(retry_after)})
    if now - row.window_started_at >= window:
        row.window_started_at = now
        row.attempt_count = 1
        row.blocked_until = None
    else:
        row.attempt_count += 1
        if row.attempt_count > 10:
            row.blocked_until = now + window
    db.commit()
    if row.blocked_until and row.blocked_until > now:
        raise HTTPException(status_code=429, detail="Too many invalid tracking attempts. Try again later.",
                            headers={"Retry-After": str(int(window.total_seconds()))})


@router.get("/public/completed")
def get_public_completed_cases(db: Session = Depends(get_db), limit: int = Query(12, ge=1, le=50)):
    """Return anonymized summaries of resolved cases only."""
    cases = (db.query(SOSCase)
             .filter(SOSCase.case_status.in_(("resolved", "completed")))
             .order_by(SOSCase.updated_at.desc())
             .limit(limit).all())
    keys = [coordinate_cache_key(case.latitude, case.longitude) for case in cases]
    cache_rows = db.query(GeocodeCache).filter(GeocodeCache.cache_key.in_(keys)).all() if keys else []
    geocodes = {row.cache_key: row.address for row in cache_rows}
    result = []
    for case in cases:
        address = geocodes.get(coordinate_cache_key(case.latitude, case.longitude)) or {}
        result.append({
            "city": address.get("city"),
            "state": address.get("state"),
            "reported_at": case.created_at.isoformat() if case.created_at else None,
            "disaster_type": (case.disaster_type or "Emergency").replace("_", " ").title(),
            # Free text can contain names, phone numbers or addresses; publish only
            # a category-based anonymized summary.
            "description": f"{(case.disaster_type or 'Emergency').replace('_', ' ').title()} emergency successfully handled by the response team.",
            "status": "Resolved",
            "location_attribution": address.get("attribution") if address.get("city") or address.get("state") else None,
        })
    return result


@router.post("/track")
def track_citizen_case(
    data: TrackingRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    token_hash = tracking_credential_hash(data.tracking_token)
    case = db.query(SOSCase).filter(
        SOSCase.tracking_token_hash == token_hash
    ).first()
    if not case:
        _record_failed_tracking_attempt(db, request)
        raise HTTPException(status_code=404, detail="Tracking reference not found")

    assignment = db.query(CaseAssignment).filter(
        CaseAssignment.case_id == case.case_id
    ).order_by(CaseAssignment.assigned_at.desc()).first()
    responder = None
    assignment_status = None
    if assignment:
        responder = db.query(Responder).filter(
            Responder.responder_id == assignment.responder_id
        ).first()
        assignment_status = (
            "completed" if assignment.completed_at else
            "accepted" if assignment.accepted_at else "assigned"
        )

    timeline = [{"status": "submitted", "at": case.created_at.isoformat() if case.created_at else None}]
    if assignment:
        if assignment.assigned_at:
            timeline.append({"status": "assigned", "at": assignment.assigned_at.isoformat()})
        if assignment.accepted_at:
            timeline.append({"status": "in_progress", "at": assignment.accepted_at.isoformat()})
        if assignment.completed_at:
            timeline.append({"status": "resolved", "at": assignment.completed_at.isoformat()})
    if case.case_status in {"resolved", "completed"} and not any(event["status"] == "resolved" for event in timeline):
        timeline.append({"status": "resolved", "at": case.updated_at.isoformat() if case.updated_at else None})
    return {
        "case_id": case.case_id,
        "disaster_type": case.disaster_type,
        "description": case.message,
        "reported_location": {"latitude": case.latitude, "longitude": case.longitude},
        "urgency": case.urgency,
        "priority_score": case.priority_score,
        "case_status": case.case_status,
        "verification_status": case.verification_status,
        "created_at": case.created_at.isoformat() if case.created_at else None,
        "updated_at": case.updated_at.isoformat() if case.updated_at else None,
        "location_address": get_cached_address(db, case.latitude, case.longitude),
        "timeline": timeline,
        "assignment": ({
            "status": assignment_status,
            "responder_name": responder.name if responder else None,
            "assigned_at": assignment.assigned_at.isoformat() if assignment.assigned_at else None,
            "accepted_at": assignment.accepted_at.isoformat() if assignment.accepted_at else None,
            "completed_at": assignment.completed_at.isoformat() if assignment.completed_at else None,
        } if assignment else None),
    }


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
                "location_address": get_cached_address(db, case.latitude, case.longitude),
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
