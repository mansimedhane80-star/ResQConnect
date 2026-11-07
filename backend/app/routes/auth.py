import re

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models import AdminRegistration, User, Responder
from app.schemas import LoginRequest, ResponderRegister, PasswordChangeRequest
from app.auth import (
    verify_password,
    create_access_token,
    hash_password,
    get_current_user,
)
from app.document_store import DOCUMENTS, remove_documents, store_document
from app.notifications import notify_email


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.get("/me")
def get_current_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return only the authenticated user's safe profile fields."""
    profile = {
        "user_id": current_user.user_id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "phone": None,
        "organization": None,
        "designation": None,
    }
    if current_user.role == "authority":
        application = db.query(AdminRegistration).filter(
            AdminRegistration.email == current_user.email,
            AdminRegistration.application_status == "approved",
        ).first()
        if application:
            profile.update(phone=application.phone, organization=application.organization,
                           designation=application.designation)
    elif current_user.role == "responder":
        responder = db.query(Responder).filter(Responder.user_id == current_user.user_id).first()
        if responder:
            profile.update(skills=responder.skills, equipment=responder.equipment,
                           status=responder.responder_status)
    return profile


@router.post("/change-password")
def change_password(data: PasswordChangeRequest, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=422, detail="Passwords do not match")
    if len(data.new_password.encode("utf-8")) > 72:
        raise HTTPException(status_code=422, detail="Password must not exceed 72 bytes")
    if current_user.role == "authority" and (
        len(data.new_password) < 12
        or not all((re.search(r"[a-z]", data.new_password), re.search(r"[A-Z]", data.new_password),
                    re.search(r"\d", data.new_password), re.search(r"[^A-Za-z0-9]", data.new_password)))
    ):
        raise HTTPException(status_code=422, detail="Administrator passwords require at least 12 characters with uppercase, lowercase, a number, and a symbol")
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    try:
        current_user.password_hash = hash_password(data.new_password)
        db.commit()
    except Exception as error:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to change password") from error
    return {"message": "Password changed successfully. Sign in again with your new password."}

_EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
_PHONE_PATTERN = re.compile(r"^\+?[0-9][0-9 ()().-]{5,18}$")


@router.post("/register-admin", status_code=201)
async def register_admin_application(
    full_name: str = Form(..., min_length=2, max_length=100),
    email: str = Form(..., max_length=150),
    phone: str = Form(..., min_length=7, max_length=20),
    admin_id: str = Form(..., min_length=2, max_length=80),
    organization: str = Form(..., min_length=2, max_length=160),
    designation: str = Form(..., min_length=2, max_length=120),
    password: str = Form(..., min_length=12, max_length=128),
    confirm_password: str = Form(...),
    government_id: UploadFile = File(...),
    authorization_letter: UploadFile = File(...),
    organization_id: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    full_name = full_name.strip()
    email = email.strip().lower()
    phone = phone.strip()
    admin_id = admin_id.strip().upper()
    organization = organization.strip()
    designation = designation.strip()

    if len(full_name) < 2 or len(organization) < 2 or len(designation) < 2:
        raise HTTPException(status_code=422, detail="Complete all required application fields")
    if not _EMAIL_PATTERN.fullmatch(email):
        raise HTTPException(status_code=422, detail="Enter a valid email address")
    if not _PHONE_PATTERN.fullmatch(phone):
        raise HTTPException(status_code=422, detail="Enter a valid mobile number")
    if password != confirm_password:
        raise HTTPException(status_code=422, detail="Passwords do not match")
    if len(password.encode("utf-8")) > 72:
        raise HTTPException(status_code=422, detail="Password must not exceed 72 bytes")
    if not all((re.search(r"[a-z]", password), re.search(r"[A-Z]", password),
                re.search(r"\d", password), re.search(r"[^A-Za-z0-9]", password))):
        raise HTTPException(
            status_code=422,
            detail="Use at least 12 characters with uppercase, lowercase, a number, and a symbol",
        )

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="Email is already registered")
    if db.query(AdminRegistration).filter(
        (AdminRegistration.email == email) | (AdminRegistration.admin_id == admin_id)
    ).first():
        raise HTTPException(status_code=409, detail="Email or Admin ID already has an application")

    stored: dict[str, str] = {}
    try:
        for key, upload in (
            ("government_id", government_id),
            ("authorization_letter", authorization_letter),
            ("organization_id", organization_id),
        ):
            if upload is not None:
                stored[key], _ = await store_document(upload)

        application = AdminRegistration(
            full_name=full_name,
            email=email,
            phone=phone,
            admin_id=admin_id,
            organization=organization,
            designation=designation,
            password_hash=hash_password(password),
            government_id_ref=stored["government_id"],
            authorization_letter_ref=stored["authorization_letter"],
            organization_id_ref=stored.get("organization_id"),
            application_status="pending",
        )
        db.add(application)
        db.commit()
        db.refresh(application)
        notify_email(db, f"admin-application:{application.registration_id}:received", email,
                     "ResQConnect administrator application received",
                     f"Hello {full_name}, your administrator application was received and is pending review.")
        return {
            "message": "Administrator application received for review",
            "registration_id": application.registration_id,
            "application_status": application.application_status,
            "submitted_at": application.submitted_at.isoformat() if application.submitted_at else None,
        }
    except IntegrityError as error:
        db.rollback()
        remove_documents(list(stored.values()))
        raise HTTPException(status_code=409, detail="Email or Admin ID already has an application") from error
    except Exception:
        db.rollback()
        remove_documents(list(stored.values()))
        raise
    finally:
        await government_id.close()
        await authorization_letter.close()
        if organization_id is not None:
            await organization_id.close()


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

        notify_email(db, f"responder:{new_responder.responder_id}:registered", email,
                     "ResQConnect responder registration received",
                     f"Hello {name}, your responder account has been created. You can sign in to the ResQConnect responder portal.")

        return {
            "message": "Responder registered successfully",
            "responder_id": new_responder.responder_id,
            "user_id": new_user.user_id,
            "name": new_user.name,
            "email": new_user.email,
            "role": new_user.role
        }

    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email already registered") from error

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to register responder"
        )
