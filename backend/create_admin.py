from app.database import SessionLocal
from app.models import User
from app.auth import hash_password

db = SessionLocal()

try:
    admin = db.query(User).filter(
        User.email == "admin@resqconnect.com"
    ).first()

    if admin:
        admin.password_hash = hash_password("123123")
        db.commit()
        print("Admin password updated successfully!")
    else:
        print("Admin account not found!")

except Exception as e:
    db.rollback()
    print("Error:", e)

finally:
    db.close()