from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Responder
from app.schemas import LoginRequest, ResponderRegister
from app.auth import (
    verify_password,
    create_access_token,
    hash_password
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# --------------------------------
# USER LOGIN
# --------------------------------

@router.post("/login")
def login(
    data: LoginRequest,
    db: Session = Depends(get_db)
):
    email = data.email.strip().lower()

    user = db.query(User).filter(
        User.email == email
    ).first()

    if not user or not verify_password(
        data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    access_token = create_access_token(user)

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
    }


# --------------------------------
# RESPONDER SELF-REGISTRATION
# --------------------------------

@router.post("/register-responder", status_code=201)
def register_responder(
    data: ResponderRegister,
    db: Session = Depends(get_db)
):
    name = data.name.strip()
    email = data.email.strip().lower()

    # Validate name
    if len(name) < 2:
        raise HTTPException(
            status_code=400,
            detail="Name must contain at least 2 characters"
        )

    # Check whether email already exists
    existing_user = db.query(User).filter(
        User.email == email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Check password byte limit
    if len(data.password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=400,
            detail="Password must not exceed 72 bytes"
        )

    try:
        # Create user account
        new_user = User(
            name=name,
            email=email,
            password_hash=hash_password(data.password),
            role="responder"
        )

        db.add(new_user)

        # Generate user ID before creating responder profile
        db.flush()

        # Create responder profile
        new_responder = Responder(
            user_id=new_user.user_id,
            name=name,
            skills=data.responder_type,
            equipment=data.equipment,
            responder_status="available"
        )

        db.add(new_responder)

        # Save both records
        db.commit()

        db.refresh(new_user)
        db.refresh(new_responder)

        return {
            "message": "Responder registered successfully",
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
            detail="Unable to register responder"
        )