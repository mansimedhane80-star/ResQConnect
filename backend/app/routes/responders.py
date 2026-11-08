
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from pydantic import BaseModel, Field
from geoalchemy2.elements import WKTElement

from app.database import get_db
from app.models import User, Responder, SOSCase, CaseAssignment
from app.schemas import ResponderCreate
from app.auth import hash_password, require_admin, get_current_user
from app.geocoding import resolve_and_cache_address

router = APIRouter(prefix="/responders", tags=["Responders"])


# --------------------------------------------------
# LOCATION REQUEST SCHEMA
# --------------------------------------------------

class ResponderLocationUpdate(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


# --------------------------------------------------
# CREATE RESPONDER
# --------------------------------------------------

@router.post("/create")
def create_responder(
    data: ResponderCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    email = data.email.strip().lower()

    existing_user = db.query(User).filter(
        User.email == email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    if len(data.password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=400,
            detail="Password must not exceed 72 bytes"
        )

    try:
        new_user = User(
            name=data.name,
            email=email,
            password_hash=hash_password(data.password),
            role="responder"
        )

        db.add(new_user)
        db.flush()

        new_responder = Responder(
            user_id=new_user.user_id,
            name=data.name,
            skills=data.skills,
            equipment=data.equipment,
            responder_status="available"
        )

        db.add(new_responder)
        db.commit()
        db.refresh(new_responder)

        return {
            "message": "Responder account created successfully",
            "responder_id": new_responder.responder_id,
            "user_id": new_user.user_id,
            "name": new_user.name,
            "email": new_user.email,
            "role": new_user.role
        }

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to create responder account"
        )


# --------------------------------------------------
# GET RESPONDER PROFILE
# --------------------------------------------------

@router.get("/me")
def get_responder_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "responder":
        raise HTTPException(
            status_code=403,
            detail="Responder access required"
        )

    responder = db.query(Responder).filter(
        Responder.user_id == current_user.user_id
    ).first()

    if not responder:
        raise HTTPException(
            status_code=404,
            detail="Responder profile not found"
        )

    return {
        "responder_id": responder.responder_id,
        "user_id": current_user.user_id,
        "name": responder.name,
        "email": current_user.email,
        "skills": responder.skills,
        "equipment": responder.equipment,
        "status": responder.responder_status,
        "latitude": responder.latitude,
        "longitude": responder.longitude
    }


# --------------------------------------------------
# UPDATE RESPONDER LOCATION
# --------------------------------------------------

@router.put("/location")
def update_responder_location(
    data: ResponderLocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "responder":
        raise HTTPException(
            status_code=403,
            detail="Responder access required"
        )

    responder = db.query(Responder).filter(
        Responder.user_id == current_user.user_id
    ).first()

    if not responder:
        raise HTTPException(
            status_code=404,
            detail="Responder profile not found"
        )

    try:
        responder.latitude = data.latitude
        responder.longitude = data.longitude

        # Update PostGIS geography location too
        responder.location = WKTElement(
            f"POINT({data.longitude} {data.latitude})",
            srid=4326
        )

        db.commit()
        db.refresh(responder)

        return {
            "message": "Responder location updated successfully",
            "responder_id": responder.responder_id,
            "latitude": responder.latitude,
            "longitude": responder.longitude
        }

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update responder location"
        )


# --------------------------------------------------
# GET MY ASSIGNMENTS
# --------------------------------------------------

@router.get("/my-assignments")
def get_my_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "responder":
        raise HTTPException(
            status_code=403,
            detail="Responder access required"
        )

    responder = db.query(Responder).filter(
        Responder.user_id == current_user.user_id
    ).first()

    if not responder:
        raise HTTPException(
            status_code=404,
            detail="Responder profile not found"
        )

    assignments = (
        db.query(CaseAssignment)
        .filter(CaseAssignment.responder_id == responder.responder_id)
        .order_by(CaseAssignment.assigned_at.desc())
        .all()
    )

    result = []

    for assignment in assignments:
        case = db.query(SOSCase).filter(
            SOSCase.case_id == assignment.case_id
        ).first()

        if not case:
            continue

        if assignment.completed_at is not None:
            assignment_status = "completed"
        elif assignment.accepted_at is not None:
            assignment_status = "accepted"
        else:
            assignment_status = "pending"

        # Resolve the readable address if it is not already cached.
        # The result is cached for future dashboard requests.
        location_address = None

        if case.latitude is not None and case.longitude is not None:
            location_address = resolve_and_cache_address(
                db,
                case.latitude,
                case.longitude
            )

        result.append({
            "assignment_id": assignment.assignment_id,
            "case_id": case.case_id,
            "message": case.message,
            "contact_number": case.contact_number,
            "latitude": case.latitude,
            "longitude": case.longitude,
            "location_address": location_address,
            "disaster_type": case.disaster_type,
            "urgency": case.urgency,
            "priority_score": case.priority_score,
            "vulnerability": case.vulnerability or [],
            "case_status": case.case_status,
            "assignment_status": assignment_status,
            "assigned_at": (
                assignment.assigned_at.isoformat()
                if assignment.assigned_at else None
            )
        })

    return result


# --------------------------------------------------
# ACCEPT ASSIGNMENT
# --------------------------------------------------

@router.post("/assignments/{assignment_id}/accept")
def accept_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "responder":
        raise HTTPException(
            status_code=403,
            detail="Responder access required"
        )

    responder = db.query(Responder).filter(
        Responder.user_id == current_user.user_id
    ).first()

    if not responder:
        raise HTTPException(
            status_code=404,
            detail="Responder profile not found"
        )

    assignment = db.query(CaseAssignment).filter(
        CaseAssignment.assignment_id == assignment_id,
        CaseAssignment.responder_id == responder.responder_id
    ).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found"
        )

    if assignment.completed_at is not None:
        raise HTTPException(
            status_code=400,
            detail="Assignment is already completed"
        )

    if assignment.accepted_at is not None:
        raise HTTPException(
            status_code=400,
            detail="Assignment already accepted"
        )

    try:
        case = db.query(SOSCase).filter(
            SOSCase.case_id == assignment.case_id
        ).first()

        if not case:
            raise HTTPException(
                status_code=404,
                detail="SOS case not found"
            )

        assignment.accepted_at = func.current_timestamp()
        case.case_status = "in_progress"

        db.commit()

        return {
            "message": "Assignment accepted successfully",
            "assignment_id": assignment.assignment_id,
            "case_id": assignment.case_id,
            "case_status": case.case_status
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to accept assignment"
        )


# --------------------------------------------------
# COMPLETE ASSIGNMENT
# --------------------------------------------------

@router.post("/assignments/{assignment_id}/complete")
def complete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "responder":
        raise HTTPException(
            status_code=403,
            detail="Responder access required"
        )

    responder = db.query(Responder).filter(
        Responder.user_id == current_user.user_id
    ).first()

    if not responder:
        raise HTTPException(
            status_code=404,
            detail="Responder profile not found"
        )

    assignment = db.query(CaseAssignment).filter(
        CaseAssignment.assignment_id == assignment_id,
        CaseAssignment.responder_id == responder.responder_id
    ).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found"
        )

    if assignment.completed_at is not None:
        raise HTTPException(
            status_code=400,
            detail="Assignment is already completed"
        )

    if assignment.accepted_at is None:
        raise HTTPException(
            status_code=400,
            detail="Accept the assignment before completing it"
        )

    try:
        case = db.query(SOSCase).filter(
            SOSCase.case_id == assignment.case_id
        ).first()

        if not case:
            raise HTTPException(
                status_code=404,
                detail="SOS case not found"
            )

        assignment.completed_at = func.current_timestamp()
        case.case_status = "resolved"

        # Make responder available if they have no other active assignments
        other_active_assignment = db.query(CaseAssignment).filter(
            CaseAssignment.responder_id == responder.responder_id,
            CaseAssignment.assignment_id != assignment.assignment_id,
            CaseAssignment.completed_at.is_(None)
        ).first()

        if not other_active_assignment:
            responder.responder_status = "available"

        db.commit()

        return {
            "message": "Assignment completed successfully",
            "assignment_id": assignment.assignment_id,
            "case_id": assignment.case_id,
            "case_status": case.case_status,
            "responder_status": responder.responder_status
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to complete assignment"
        )
