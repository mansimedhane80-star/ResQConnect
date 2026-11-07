"""One-time CLI bootstrap for the initial authority account.

Set BOOTSTRAP_AUTHORITY_NAME and BOOTSTRAP_AUTHORITY_EMAIL in the server
environment, then run this file interactively to enter the password securely.
"""

import getpass
import os
import re
import sys
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.auth import hash_password
from app.database import SessionLocal
from app.models import User

_BOOTSTRAP_LOCK_KEY_1 = int.from_bytes(b"RQC", "big")
_BOOTSTRAP_LOCK_KEY_2 = 1


def main() -> int:
    name = os.environ.get("BOOTSTRAP_AUTHORITY_NAME", "").strip()
    email = os.environ.get("BOOTSTRAP_AUTHORITY_EMAIL", "").strip().lower()
    if not 2 <= len(name) <= 100:
        print("Authority name must be between 2 and 100 characters.")
        return 2
    if len(email) > 150 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        print("Set BOOTSTRAP_AUTHORITY_EMAIL to a valid email address of at most 150 characters.")
        return 2

    password = getpass.getpass("Initial authority password (12+ chars): ")
    confirmation = getpass.getpass("Confirm password: ")
    if password != confirmation:
        print("Passwords do not match.")
        return 2
    if (len(password) < 12 or len(password.encode("utf-8")) > 72 or
            not all((re.search(r"[a-z]", password), re.search(r"[A-Z]", password),
                     re.search(r"\d", password), re.search(r"[^A-Za-z0-9]", password)))):
        print("Use 12–72 UTF-8 bytes and include uppercase, lowercase, a number, and a symbol.")
        return 2

    db = SessionLocal()
    try:
        # Serialize concurrent runs so only one process can pass the one-time check.
        db.execute(text("SELECT pg_advisory_xact_lock(:key1, :key2)"), {
            "key1": _BOOTSTRAP_LOCK_KEY_1,
            "key2": _BOOTSTRAP_LOCK_KEY_2,
        })
        if db.query(User).filter(User.role == "authority").first():
            print("An authority account already exists; bootstrap is one-time only.")
            return 1
        if db.query(User).filter(User.email == email).first():
            print("That email already belongs to an account.")
            return 1
        user = User(
            name=name,
            email=email,
            password_hash=hash_password(password),
            role="authority",
        )
        db.add(user)
        db.commit()
        print(f"Initial authority account created for {email}.")
        return 0
    except Exception:
        db.rollback()
        print("Unable to create the initial authority account. Check database connectivity and server logs.")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
