from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Event, Booking, Pandit, Venue, Catering

def scrub_demo_data():
    db = SessionLocal()
    try:
        # Clear events and bookings to ensure a blank canvas
        print("Scrubbing events and bookings...")
        db.query(Booking).delete()
        db.query(Event).delete()
        
        # We keep Pandits, Venues, and Catering as they are 'Partners' not 'Demo Events'
        # But we could clear them if they look like demo data.
        # For now, focus on User-generated Event data.
        
        db.commit()
        print("Successfully purged demo event data.")
    except Exception as e:
        db.rollback()
        print(f"Error scrubbing data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    scrub_demo_data()
