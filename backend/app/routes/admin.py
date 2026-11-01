
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Responder
from app.schemas import ResponderCreate
from app.auth import hash_password, require_admin

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/create-responder")
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

