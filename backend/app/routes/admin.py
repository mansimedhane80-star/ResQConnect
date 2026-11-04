
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from app.database import get_db
from app.models import (
    User,
    Responder,
    SOSCase,
    CaseAssignment
)
from app.schemas import (
    ResponderCreate,
    CaseAssignmentCreate
)
from app.auth import hash_password, require_admin

from ai.sos_classifier import analyze_sos


router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


# --------------------------------------------------
# HELPER FUNCTIONS
# --------------------------------------------------

def normalize_text(value):
    """Convert text into a consistent searchable format."""
    return (value or "").lower().replace("-", " ").replace("_", " ")


def find_matches(text, requirements, aliases=None):
    """
    Match responder skills/equipment using phrases and synonyms.
    Returns the requirement labels that matched.
    """
    text = normalize_text(text)
    aliases = aliases or {}

    matched = []

    for requirement in requirements:
        terms = [requirement] + aliases.get(requirement, [])

        if any(normalize_text(term) in text for term in terms):
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
        result.append({
            "responder_id": responder.responder_id,
            "user_id": user.user_id,
            "name": responder.name,
            "email": user.email,
            "skills": responder.skills,
            "equipment": responder.equipment,
            "responder_status": responder.responder_status,
            "latitude": responder.latitude,
            "longitude": responder.longitude
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
    """
    Returns assignment details so the dashboard can still show
    assigned responder names after a page refresh.
    """

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

        result.append({
            "assignment_id": assignment.assignment_id,
            "case_id": assignment.case_id,
            "case_status": sos_case.case_status,
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
    ).first()

    if not sos_case:
        raise HTTPException(
            status_code=404,
            detail="SOS case not found"
        )

    responder = db.query(Responder).filter(
        Responder.responder_id == data.responder_id
    ).first()

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

    # Recommendations are only for pending cases.
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

    # AI analysis of the SOS message.
    analysis = analyze_sos(sos_case.message or "")

    disaster_type = normalize_text(
        analysis.get("disaster_type", "unknown")
    )

    urgency = analysis.get("urgency", "unknown")
    vulnerabilities = analysis.get("vulnerability", [])
    required_help = analysis.get("required_help", [])

    # Disaster-related skill requirements.
    skill_requirements = {
        "flood": [
            "flood rescue",
            "water rescue",
            "swimming",
            "rescue"
        ],
        "landslide": [
            "landslide response",
            "search",
            "rescue",
            "first aid"
        ],
        "cyclone": [
            "cyclone response",
            "rescue",
            "emergency response"
        ],
        "heatwave": [
            "medical",
            "first aid",
            "heat response"
        ],
        "heavy rainfall": [
            "rescue",
            "emergency response"
        ],
        "earthquake": [
            "earthquake response",
            "search",
            "rescue",
            "medical"
        ]
    }

    # Equipment requirements by disaster.
    equipment_requirements = {
        "flood": [
            "boat",
            "life jacket",
            "rope",
            "rescue kit"
        ],
        "landslide": [
            "rope",
            "first aid",
            "rescue kit"
        ],
        "cyclone": [
            "rescue kit",
            "first aid"
        ],
        "heatwave": [
            "medical kit",
            "first aid",
            "water supplies"
        ],
        "heavy rainfall": [
            "rescue kit",
            "rope"
        ],
        "earthquake": [
            "first aid",
            "medical kit",
            "rescue kit"
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
        "medical": ["medical kit", "first aid", "ambulance"],
        "rescue": ["rescue kit", "rope", "boat", "life jacket"],
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

    # Add medical/search needs based on vulnerable people.
    if any(
        normalize_text(item) in ("injured", "pregnant")
        for item in vulnerabilities
    ):
        required_skills.extend(["medical", "first aid"])
        required_equipment.extend(["medical kit", "first aid"])

    # Remove duplicate requirements.
    required_skills = list(dict.fromkeys(required_skills))
    required_equipment = list(dict.fromkeys(required_equipment))

    # Synonyms for real-world responder descriptions.
    skill_aliases = {
        "medical": [
            "doctor",
            "nurse",
            "medic",
            "medical responder",
            "paramedic"
        ],
        "first aid": [
            "first-aid",
            "first aider",
            "medical responder",
            "medical"
        ],
        "rescue": [
            "rescue operation",
            "emergency rescue",
            "flood rescue",
            "water rescue"
        ],
        "search": [
            "search and rescue",
            "search-rescue"
        ],
        "flood rescue": [
            "water rescue",
            "flood response"
        ],
        "emergency response": [
            "emergency responder",
            "disaster response"
        ]
    }

    equipment_aliases = {
        "medical kit": [
            "first aid kit",
            "first-aid kit",
            "medical supplies"
        ],
        "first aid": [
            "first aid kit",
            "first-aid kit"
        ],
        "rescue kit": [
            "rescue equipment",
            "emergency kit"
        ],
        "life jacket": [
            "life vest",
            "lifejacket"
        ],
        "boat": [
            "rescue boat",
            "inflatable boat"
        ],
        "rope": [
            "rescue rope"
        ]
    }

    # Count each responder's active assignments.
    active_assignment_counts = dict(
        db.query(
            CaseAssignment.responder_id,
            func.count(CaseAssignment.assignment_id)
        )
        .filter(CaseAssignment.completed_at.is_(None))
        .group_by(CaseAssignment.responder_id)
        .all()
    )

    # Get responders with valid geographic locations.
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

        # Only available responders can be recommended for assignment.
        is_available = (
            normalize_text(responder.responder_status) == "available"
        )

        if not is_available:
            continue

        active_assignments = active_assignment_counts.get(
            responder.responder_id,
            0
        )

        # Factor 1: Distance (maximum 30).
        distance_score = get_distance_score(distance)

        # Factor 2: Availability (maximum 25).
        availability_score = 25 if is_available else 0

        # Factor 3: Skills (maximum 20).
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

        # Factor 4: Equipment (maximum 15).
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

        # Factor 5: Workload (maximum 10).
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

    # Highest total score first.
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
