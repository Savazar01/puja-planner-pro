import os
import uuid
from database import SessionLocal
from models import User, UserRole, UserStatus
from auth import get_password_hash
from config import settings

def init_db():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if not user:
            print("No admin user found. Creating initial superuser...")
            admin_email = settings.admin_user
            admin_password = settings.admin_password
            
            new_admin = User(
                id=str(uuid.uuid4()),
                email=admin_email,
                hashed_password=get_password_hash(admin_password),
                role=UserRole.ADMIN,
                status=UserStatus.APPROVED
            )
            db.add(new_admin)
            db.commit()
            print(f"Superuser created with email: {admin_email}")
        else:
            print("Admin user already exists.")
    except Exception as e:
        print(f"Error initializing DB data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
