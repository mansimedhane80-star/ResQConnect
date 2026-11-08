from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User,
    AdminRegistration,
    Responder,
    SOSCase,
    CaseAssignment
)
from app.schemas import (
    ResponderCreate,
    CaseAssignmentCreate,
    AdminRejection,
)
from app.auth import hash_password, require_admin
from app.document_store import DOCUMENTS, resolve_document
from app.notifications import notify_email
from app.geocoding import resolve_and_cache_address

from ai.sos_classifier import analyze_sos


router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


# --------------------------------------------------
# LOCATION ADDRESS HELPER
# --------------------------------------------------

def get_location_address(db: Session, latitude, longitude):
    if latitude is None or longitude is None:
        return None

    try:
        return resolve_and_cache_address(
            db,
            latitude,
            longitude
        )
    except Exception:
        return None


def get_readable_address(address):
    if not address:
        return None

    return address.get("display_name")


def serialize_admin_application(application: AdminRegistration):
    return {
        "registration_id": application.registration_id,
        "full_name": application.full_name,
        "email": application.email,
        "phone": application.phone,
        "admin_id": application.admin_id,
        "organization": application.organization,
        "designation": application.designation,
        "application_status": application.application_status,
        "submitted_at": application.submitted_at.isoformat() if application.submitted_at else None,
        "reviewed_at": application.reviewed_at.isoformat() if application.reviewed_at else None,
        "rejection_reason": application.rejection_reason,
        "documents": {
            key: getattr(application, column) is not None
            for key, (column, _label) in DOCUMENTS.items()
        },
    }


@router.get("/registrations")
def get_admin_registrations(
    status_filter: str = "pending",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if status_filter not in {"pending", "approved", "rejected", "all"}:
        raise HTTPException(status_code=422, detail="Invalid application status filter")

    query = db.query(AdminRegistration)

    if status_filter != "all":
        query = query.filter(
            AdminRegistration.application_status == status_filter
        )

    return [
        serialize_admin_application(item)
        for item in query.order_by(
            AdminRegistration.submitted_at.desc()
        ).all()
    ]


@router.get("/registrations/{registration_id}")
def get_admin_registration(
    registration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    application = db.query(AdminRegistration).filter(
        AdminRegistration.registration_id == registration_id
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    return serialize_admin_application(application)


@router.get("/registrations/{registration_id}/documents/{document_type}")
def download_admin_registration_document(
    registration_id: int,
    document_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if document_type not in DOCUMENTS:
        raise HTTPException(status_code=404, detail="Document not found")

    application = db.query(AdminRegistration).filter(
        AdminRegistration.registration_id == registration_id
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Document not found")

    column_name, _label = DOCUMENTS[document_type]
    stored_name = getattr(application, column_name)

    if not stored_name:
        raise HTTPException(status_code=404, detail="Document not found")

    path = resolve_document(stored_name)
    extension = path.suffix.lower()

    media_type = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".png": "image/png"
    }[extension]

    return FileResponse(
        path,
        media_type=media_type,
        filename=f"verification-document{extension}",
        content_disposition_type="attachment",
        headers={
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff"
        },
    )


@router.post("/registrations/{registration_id}/approve")
def approve_admin_registration(
    registration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    application = db.query(AdminRegistration).filter(
        AdminRegistration.registration_id == registration_id
    ).with_for_update().first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if application.application_status != "pending":
        raise HTTPException(
            status_code=409,
            detail="Application has already been reviewed"
        )

    if db.query(User).filter(User.email == application.email).first():
        raise HTTPException(
            status_code=409,
            detail="An account already uses this email"
        )

    try:
        user = User(
            name=application.full_name,
            email=application.email,
            password_hash=application.password_hash,
            role="authority",
        )

        db.add(user)
        db.flush()

        application.application_status = "approved"
        application.reviewed_at = func.current_timestamp()
        application.reviewer_id = current_user.user_id
        application.rejection_reason = None

        db.commit()

        notify_email(
            db,
            f"admin-application:{application.registration_id}:approved",
            application.email,
            "ResQConnect administrator application approved",
            "Your administrator application was approved. You can now sign in to the administrator portal using the password you created."
        )

        return {
            "message": "Administrator application approved",
            "registration_id": application.registration_id,
            "application_status": application.application_status,
            "user_id": user.user_id,
        }

    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="An account already uses this email"
        ) from error

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to approve administrator application"
        )


@router.post("/registrations/{registration_id}/reject")
def reject_admin_registration(
    registration_id: int,
    data: AdminRejection,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    application = db.query(AdminRegistration).filter(
        AdminRegistration.registration_id == registration_id
    ).with_for_update().first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if application.application_status != "pending":
        raise HTTPException(
            status_code=409,
            detail="Application has already been reviewed"
        )

    application.application_status = "rejected"
    application.reviewed_at = func.current_timestamp()
    application.reviewer_id = current_user.user_id
    application.rejection_reason = data.reason.strip()

    db.commit()

    notify_email(
        db,
        f"admin-application:{application.registration_id}:rejected",
        application.email,
        "ResQConnect administrator application update",
        f"Your administrator application was not approved. Reason: {data.reason.strip()}"
    )

    return {
        "message": "Administrator application rejected",
        "registration_id": application.registration_id,
        "application_status": application.application_status,
    }


# --------------------------------------------------
# HELPER FUNCTIONS
# --------------------------------------------------

def normalize_text(value):
    """Convert text into a consistent searchable format."""
    if value is None:
        return ""

    if isinstance(value, (list, tuple, set)):
        value = " ".join(str(item) for item in value)

    return (
        str(value)
        .lower()
        .replace("-", " ")
        .replace("_", " ")
        .strip()
    )


def find_matches(text, requirements, aliases=None):
    """
    Match responder skills/equipment using phrases and synonyms.
    Returns the requirement labels that matched.
    """
    normalized_text = normalize_text(text)
    aliases = aliases or {}

    matched = []

    for requirement in requirements:
        terms = [requirement] + aliases.get(requirement, [])

        if any(
            normalize_text(term) in normalized_text
            for term in terms
        ):
            matched.append(requirement)

    return matched


def get_distance_score(distance):
    """
    Distance score: maximum 30.
    Uses a gradual score instead of giving every responder
    within 5 km the same score.
    """
    if distance is None or distance < 0:
        return 0

    if distance >= 50000:
        return 0

    return round(30 * (1 - distance / 50000))


# --------------------------------------------------
# GET ALL RESPONDERS
# --------------------------------------------------

@router.get("/responders")
def get_responders(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    responders = (
        db.query(Responder, User)
        .join(User, Responder.user_id == User.user_id)
        .all()
    )

    result = []

    for responder, user in responders:
        location_address = get_location_address(
            db,
            responder.latitude,
            responder.longitude
        )

        result.append({
            "responder_id": responder.responder_id,
            "user_id": user.user_id,
            "name": responder.name,
            "email": user.email,
            "skills": responder.skills,
            "equipment": responder.equipment,
            "responder_status": responder.responder_status,
            "latitude": responder.latitude,
            "longitude": responder.longitude,
            "location_address": location_address,
            "readable_address": get_readable_address(location_address)
        })

    return result


# --------------------------------------------------
# GET ASSIGNMENT HISTORY FOR ALL CASES
# --------------------------------------------------

@router.get("/assignments")
def get_assignment_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    rows = (
        db.query(CaseAssignment, Responder, SOSCase)
        .join(
            Responder,
            CaseAssignment.responder_id == Responder.responder_id
        )
        .join(
            SOSCase,
            CaseAssignment.case_id == SOSCase.case_id
        )
        .order_by(CaseAssignment.assigned_at.desc())
        .all()
    )

    result = []

    for assignment, responder, sos_case in rows:
        assignment_status = "completed"

        if assignment.completed_at is None:
            assignment_status = (
                "accepted"
                if assignment.accepted_at is not None
                else "pending"
            )

        location_address = get_location_address(
            db,
            sos_case.latitude,
            sos_case.longitude
        )

        result.append({
            "assignment_id": assignment.assignment_id,
            "case_id": assignment.case_id,
            "case_status": sos_case.case_status,
            "case_latitude": sos_case.latitude,
            "case_longitude": sos_case.longitude,
            "location_address": location_address,
            "readable_address": get_readable_address(location_address),
            "responder_id": responder.responder_id,
            "responder_name": responder.name,
            "responder_status": responder.responder_status,
            "skills": responder.skills,
            "equipment": responder.equipment,
            "assignment_status": assignment_status,
            "assigned_at": (
                assignment.assigned_at.isoformat()
                if assignment.assigned_at else None
            ),
            "accepted_at": (
                assignment.accepted_at.isoformat()
                if assignment.accepted_at else None
            ),
            "completed_at": (
                assignment.completed_at.isoformat()
                if assignment.completed_at else None
            )
        })

    return result


# --------------------------------------------------
# CREATE RESPONDER
# --------------------------------------------------

@router.post("/create-responder")
def create_responder(
    data: ResponderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    existing_user = db.query(User).filter(
        User.email == data.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    if len(data.password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=400,
            detail="Password is too long"
        )

    new_user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role="responder"
    )

    try:
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
            "message": "Responder created successfully",
            "responder_id": new_responder.responder_id,
            "user_id": new_user.user_id
        }

    except Exception:
        db.rollback()
        raise


# --------------------------------------------------
# ASSIGN CASE TO RESPONDER
# --------------------------------------------------

@router.post("/assign-case")
def assign_case(
    data: CaseAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    sos_case = db.query(SOSCase).filter(
        SOSCase.case_id == data.case_id
    ).with_for_update().first()

    if not sos_case:
        raise HTTPException(
            status_code=404,
            detail="SOS case not found"
        )

    responder = db.query(Responder).filter(
        Responder.responder_id == data.responder_id
    ).with_for_update().first()

    if not responder:
        raise HTTPException(
            status_code=404,
            detail="Responder not found"
        )

    if normalize_text(sos_case.case_status) not in ("new", "pending"):
        raise HTTPException(
            status_code=400,
            detail="Only pending cases can receive a new assignment"
        )

    if normalize_text(responder.responder_status) != "available":
        raise HTTPException(
            status_code=400,
            detail="Responder is not available"
        )

    existing_assignment = db.query(CaseAssignment).filter(
        CaseAssignment.case_id == data.case_id,
        CaseAssignment.completed_at.is_(None)
    ).first()

    if existing_assignment:
        raise HTTPException(
            status_code=400,
            detail="This case already has an active assignment"
        )

    assignment = CaseAssignment(
        case_id=data.case_id,
        responder_id=data.responder_id
    )

    try:
        db.add(assignment)

        sos_case.case_status = "assigned"
        responder.responder_status = "busy"

        db.commit()
        db.refresh(assignment)

        assigned_user = db.query(User).filter(
            User.user_id == responder.user_id
        ).first()

        if assigned_user:
            notify_email(
                db,
                f"assignment:{assignment.assignment_id}:assigned",
                assigned_user.email,
                f"ResQConnect case #{data.case_id} assigned",
                f"Case #{data.case_id} ({sos_case.disaster_type or 'emergency'}) has been assigned to you. Sign in to the responder portal to review and accept it."
            )

        return {
            "message": "Case assigned successfully",
            "assignment_id": assignment.assignment_id,
            "case_id": data.case_id,
            "responder_id": data.responder_id,
            "responder_name": responder.name,
            "case_status": sos_case.case_status
        }

    except Exception:
        db.rollback()
        raise


# --------------------------------------------------
# AI-ASSISTED MULTI-FACTOR RESPONDER RECOMMENDATION
# --------------------------------------------------

@router.get("/recommend-responders/{case_id}")
def recommend_responders(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    sos_case = db.query(SOSCase).filter(
        SOSCase.case_id == case_id
    ).first()

    if not sos_case:
        raise HTTPException(
            status_code=404,
            detail="SOS case not found"
        )

    if normalize_text(sos_case.case_status) not in ("new", "pending"):
        raise HTTPException(
            status_code=409,
            detail=(
                "Recommendations are available only for pending cases. "
                f"Current case status: {sos_case.case_status}"
            )
        )

    if sos_case.location is None:
        raise HTTPException(
            status_code=400,
            detail="SOS case has no valid geographic location"
        )

    analysis = analyze_sos(sos_case.message or "")

    classified_type = normalize_text(
        analysis.get("disaster_type", "unknown")
    )

    saved_type = normalize_text(
        sos_case.disaster_type or "unknown"
    )

    disaster_type = (
        classified_type
        if classified_type not in ("", "unknown", "none")
        else saved_type
    )

    urgency = analysis.get("urgency", "unknown")
    vulnerabilities = analysis.get("vulnerability", []) or []
    required_help = analysis.get("required_help", []) or []

    skill_requirements = {
        "flood": [
            "flood rescue", "water rescue", "swimming", "rescue"
        ],
        "landslide": [
            "landslide response", "search", "rescue", "first aid"
        ],
        "cyclone": [
            "cyclone response", "rescue", "emergency response"
        ],
        "heatwave": [
            "medical", "first aid", "heat response"
        ],
        "heavy rainfall": [
            "rescue", "emergency response"
        ],
        "earthquake": [
            "earthquake response", "search", "rescue", "medical"
        ]
    }

    equipment_requirements = {
        "flood": [
            "boat", "life jacket", "rope", "rescue kit"
        ],
        "landslide": [
            "rope", "first aid", "rescue kit"
        ],
        "cyclone": [
            "rescue kit", "first aid"
        ],
        "heatwave": [
            "medical kit", "first aid", "water supplies"
        ],
        "heavy rainfall": [
            "rescue kit", "rope"
        ],
        "earthquake": [
            "first aid", "medical kit", "rescue kit"
        ]
    }

    help_skill_requirements = {
        "medical": ["medical", "first aid"],
        "rescue": ["rescue", "search"],
        "food": ["relief distribution"],
        "water": ["water distribution"],
        "shelter": ["shelter management"]
    }

    help_equipment = {
        "medical": ["medical kit"],
        "rescue": ["rescue kit", "rope"],
        "food": ["food supplies"],
        "water": ["drinking water", "water supplies"],
        "shelter": ["shelter supplies", "tents"]
    }

    required_skills = list(
        skill_requirements.get(disaster_type, [])
    )

    required_equipment = list(
        equipment_requirements.get(disaster_type, [])
    )

    for help_type in required_help:
        help_type = normalize_text(help_type)

        required_skills.extend(
            help_skill_requirements.get(help_type, [])
        )

        required_equipment.extend(
            help_equipment.get(help_type, [])
        )

    medical_vulnerabilities = {
        "injured", "pregnant", "mobility limited", "disabled"
    }

    if any(
        normalize_text(item) in medical_vulnerabilities
        for item in vulnerabilities
    ):
        required_skills.extend(["medical", "first aid"])
        required_equipment.extend(["medical kit", "first aid"])

    required_skills = list(dict.fromkeys(required_skills))
    required_equipment = list(dict.fromkeys(required_equipment))

    skill_aliases = {
        "medical": [
            "doctor", "nurse", "medic", "medical responder", "paramedic"
        ],
        "first aid": [
            "first-aid", "first aider", "medical responder", "medical"
        ],
        "rescue": [
            "rescue operation", "emergency rescue", "flood rescue", "water rescue"
        ],
        "search": ["search and rescue", "search-rescue"],
        "flood rescue": ["water rescue", "flood response"],
        "emergency response": ["emergency responder", "disaster response"]
    }

    equipment_aliases = {
        "medical kit": [
            "first aid kit", "first-aid kit", "medical supplies"
        ],
        "first aid": ["first aid kit", "first-aid kit"],
        "rescue kit": ["rescue equipment", "emergency kit"],
        "life jacket": ["life vest", "lifejacket"],
        "boat": ["rescue boat", "inflatable boat"],
        "rope": ["rescue rope"]
    }

    active_assignment_counts = dict(
        db.query(
            CaseAssignment.responder_id,
            func.count(CaseAssignment.assignment_id)
        )
        .filter(CaseAssignment.completed_at.is_(None))
        .group_by(CaseAssignment.responder_id)
        .all()
    )

    responder_rows = db.query(
        Responder,
        func.ST_Distance(
            Responder.location,
            sos_case.location
        ).label("distance")
    ).filter(
        Responder.location.isnot(None)
    ).all()

    recommendations = []

    for responder, distance_value in responder_rows:
        if distance_value is None:
            continue

        distance = float(distance_value)

        is_available = (
            normalize_text(responder.responder_status) == "available"
        )

        if not is_available:
            continue

        active_assignments = active_assignment_counts.get(
            responder.responder_id,
            0
        )

        distance_score = get_distance_score(distance)
        availability_score = 25 if is_available else 0

        matched_skills = find_matches(
            responder.skills,
            required_skills,
            skill_aliases
        )

        if required_skills:
            skills_score = round(
                20 * len(matched_skills) / len(required_skills)
            )
        else:
            skills_score = 0

        matched_equipment = find_matches(
            responder.equipment,
            required_equipment,
            equipment_aliases
        )

        if required_equipment:
            equipment_score = round(
                15 * len(matched_equipment) / len(required_equipment)
            )
        else:
            equipment_score = 0

        if active_assignments == 0:
            workload_score = 10
        elif active_assignments == 1:
            workload_score = 5
        else:
            workload_score = 0

        total_score = (
            distance_score
            + availability_score
            + skills_score
            + equipment_score
            + workload_score
        )

        recommendations.append({
            "responder_id": responder.responder_id,
            "name": responder.name,
            "responder_status": responder.responder_status,
            "distance_meters": round(distance, 2),
            "score": total_score,
            "skills": responder.skills,
            "equipment": responder.equipment,
            "matched_skills": matched_skills,
            "matched_equipment": matched_equipment,
            "active_assignments": active_assignments,
            "score_breakdown": {
                "distance": distance_score,
                "availability": availability_score,
                "skills": skills_score,
                "equipment": equipment_score,
                "workload": workload_score
            }
        })

    recommendations.sort(
        key=lambda item: (
            item["score"],
            -item["distance_meters"]
        ),
        reverse=True
    )

    return {
        "case_id": case_id,
        "case_status": sos_case.case_status,
        "ai_analysis": {
            "disaster_type": disaster_type,
            "urgency": urgency,
            "vulnerability": vulnerabilities,
            "required_help": required_help
        },
        "matching_requirements": {
            "required_skills": required_skills,
            "required_equipment": required_equipment
        },
        "score_weights": {
            "distance": 30,
            "availability": 25,
            "skills": 20,
            "equipment": 15,
            "workload": 10
        },
        "recommendations": recommendations
    }