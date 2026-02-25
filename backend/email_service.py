import resend
from sqlalchemy.orm import Session
from models import EmailTemplate, EmailEventType
from config import settings

# Initialize resend with API key
if settings.resend_api_key:
    resend.api_key = settings.resend_api_key

def send_dynamic_email(db: Session, to_email: str, event_type: EmailEventType, context: dict = None):
    """
    Fetches the dynamic email template from the database and sends it via Resend.
    `context` is a dictionary used to format the template strings (e.g. {{name}}).
    """
    if not settings.resend_api_key:
        print(f"Mock Email Dispatch -> To: {to_email}, Event: {event_type.name}")
        return False

    template = db.query(EmailTemplate).filter(EmailTemplate.event_type == event_type).first()
    if not template:
        print(f"Error: No active EmailTemplate found for {event_type.name}")
        return False
        
    subject = template.subject
    body_html = template.body_html
    
    # Simple placeholder replacement mechanism
    if context:
        for key, value in context.items():
            placeholder = f"{{{{{key}}}}}" # Matches {{key}}
            subject = subject.replace(placeholder, str(value))
            body_html = body_html.replace(placeholder, str(value))
            
    try:
        response = resend.Emails.send({
            "from": "Puja Planner Pro <onboarding@resend.dev>", # Use verified domain in production
            "to": to_email,
            "subject": subject,
            "html": body_html
        })
        print(f"Email sent successfully to {to_email} (Event: {event_type.name})")
        return True
    except Exception as e:
        print(f"Failed to send email via Resend: {e}")
        return False
