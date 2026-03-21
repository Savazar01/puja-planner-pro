import os
import uuid
from database import SessionLocal
from models import (
    User, UserRole, UserStatus, SubscriptionTier, 
    EmailTemplate, EmailEventType
)
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
                status=UserStatus.APPROVED,
                subscription_tier=SubscriptionTier.PLATINUM,
                token_balance=999999
            )
            db.add(new_admin)
            db.commit()
            print(f"Superuser created with email: {admin_email}")
        else:
            # [OPTIMIZATION] Avoid redundant, slow hashing on every startup unless forced
            force_sync = os.environ.get("FORCE_ADMIN_SYNC", "false").lower() == "true"
            if force_sync:
                print("Admin user found. FORCE_ADMIN_SYNC detected. Syncing credentials...")
                user.email = settings.admin_user
                user.hashed_password = get_password_hash(settings.admin_password)
                db.commit()
                print("Admin credentials synchronized.")
            else:
                # Still check if email changed, but don't re-hash password if not needed
                if user.email != settings.admin_user:
                    user.email = settings.admin_user
                    db.commit()
                    print("Admin email synchronized (Password skipped).")
                else:
                    print("Admin credentials already in sync. Skipping redundant hashing.")
    except Exception as e:
        print(f"Error initializing DB data: {e}")
        
    try:
        # Seed email templates if missing
        default_templates = [
            (EmailEventType.WELCOME_USER, "Welcome to MyPandits!", "<h1>Welcome!</h1><p>We are thrilled to have you here.</p>"),
            (EmailEventType.VENDOR_WAITING, "New Vendor Approval Request", "<h1>Admin Alert</h1><p>A new vendor has registered and is awaiting your approval.</p>"),
            (EmailEventType.VENDOR_APPROVED, "Your Vendor Profile is Live!", "<h1>Congratulations!</h1><p>Your profile is now live on our platform.</p>"),
            (EmailEventType.RESET_PASSWORD, "Password Reset Request", "<h1>Password Reset</h1><p>You requested a password reset. Please click this <a href='{{reset_url}}'>link</a> to reset your password. It expires in 15 minutes.</p>")
        ]
        
        for evt, subj, body in default_templates:
            existing = db.query(EmailTemplate).filter(EmailTemplate.event_type == evt).first()
            if not existing:
                print(f"Seeding EmailTemplate: {evt.name}")
                new_tpl = EmailTemplate(event_type=evt, subject=subj, body_html=body)
                db.add(new_tpl)
        db.commit()
    except Exception as e:
        print(f"Error seeding email templates: {e}")
        
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
