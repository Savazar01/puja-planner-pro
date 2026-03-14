from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
import uuid
from database import get_db
from schemas import (
    SearchRequest, SearchResponse, ProviderResponse,
    UserCreate, UserResponse, Token, PasswordChange, UserUpdateStatus,
    EmailTemplateResponse, EmailTemplateUpdate, ProfileUpdate,
    ForgotPasswordRequest, ResetPasswordRequest, SubscriptionUpgrade,
    EventCreate, EventResponse, SelectionRequest, EventUpdate,
    AgentLogCreate, AgentLogResponse,
    GuestCreate, GuestResponse, SupplyCreate, SupplyResponse
)
from models import (
    Pandit, Venue, Catering, User, Profile, UserStatus, UserRole, 
    EmailTemplate, EmailEventType, Event, Booking, AgentLog,
    Guest, Supply
)
from discovery_agent import discovery_agent
from config import settings
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, get_current_active_user, get_current_admin, search_bouncer,
    create_reset_token, verify_reset_token
)
from email_service import send_dynamic_email

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "puja-planner-backend"}


@router.post("/api/search", response_model=SearchResponse)
async def search(
    request: SearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    is_unlimited: bool = Depends(search_bouncer)
):
    """
    Universal search endpoint across all categories.
    Creates a DRAFT event if event_id is missing.
    Populates supplies based on ritual intent.
    """
    event_id = request.event_id
    ritual_type = None
    
    # 1. Start/Resume Event Lifecycle
    if not event_id:
        # Create a new DRAFT event for this intent
        new_event = Event(
            id=str(uuid.uuid4()),
            customer_id=current_user.id,
            title=request.query[:50] + "..." if len(request.query) > 50 else request.query,
            status="DRAFT"
        )
        db.add(new_event)
        db.commit()
        db.refresh(new_event)
        event_id = new_event.id
        
        # [ROOT ORCHESTRATION] Planner decomposes the intent
        try:
            planner_log = AgentLog(
                id=str(uuid.uuid4()),
                event_id=event_id,
                agent_type="PLANNER",
                tool_used="Orchestration",
                summary_outcome=f"Decomposing Intent: '{request.query}'. Initiating parallel sub-agent tasks: [FINDER: Professional Search, SUPPLIES: Samagri Sourcing]."
            )
            db.add(planner_log)
            db.commit()
        except: pass
        
        # 2. Agentic Synergy: Supplies Agent Auto-Population
        # Detect ritual and suggest supplies
        suggested_supplies = discovery_agent.suggest_ritual_supplies(request.query)
        if suggested_supplies:
            for item in suggested_supplies:
                db_item = Supply(
                    id=str(uuid.uuid4()),
                    event_id=event_id,
                    name=item.get("name"),
                    category=item.get("category"),
                    quantity=item.get("quantity"),
                    completed=False
                )
                db.add(db_item)
            db.commit()

    # 3. Logging Strategy (Agentic Audit)
    try:
        log_entry = AgentLog(
            id=str(uuid.uuid4()),
            event_id=event_id,
            agent_type="FINDER",
            tool_used="Initiation",
            summary_outcome=f"Intent: '{request.query}'. Created/Resumed Event: {event_id}."
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        print(f"Agent Log Error: {e}")

    if not settings.serper_api_key or not settings.firecrawl_api_key:
        raise HTTPException(
            status_code=500, detail="Missing Search API Keys"
        )

    location = request.location or "India"
    category = request.category or "all"
    
    # 4. Hierarchical Orchestration: The 'Wait' Protocol (Turn 2)
    # Extract traditional context using Gemini
    intent_analysis_prompt = f"""
    Analyze the user's intent: "{request.query}"
    Identify if the following 'Traditional Context' is present:
    1. Language/Tradition (e.g., Telugu, Bengali, Vedic)
    2. Specific Ritual Style (e.g., Sattvik, Grand, Simple)
    3. Hierarchy/Roles needed (e.g., Pandit, Caterer)
    
    If context for Language or Ritual Style is missing, generate a warm REFLECTIVE question to ask the user.
    Also, extract the 'specific_ritual' name if found.
    
    Return JSON: 
    {{
        "context_complete": true/false,
        "ritual_name": "Satyanarayana Swamy Vratham",
        "language": "Telugu",
        "style": "Sattvik",
        "question": "Warm question if context_complete is false"
    }}
    """
    try:
        from google.generativeai import GenerativeModel
        model = GenerativeModel('gemini-1.5-flash')
        analysis_resp = model.generate_content(intent_analysis_prompt)
        analysis = json.loads(analysis_resp.text.strip().replace("```json", "").replace("```", ""))
        
        if not analysis.get("context_complete") and not request.event_id: # Only wait for new intents
             return SearchResponse(
                results=[],
                total_results=0,
                cached=False,
                event_id=event_id,
                ritual_type=analysis.get("ritual_name"),
                clarification_needed=True,
                clarification_message=analysis.get("question", "Could you share a bit more about your traditions or specific requirements for this ritual?")
            )
        ritual_name = analysis.get("ritual_name", request.query)
        pref_language = analysis.get("language")
        pref_style = analysis.get("style", "Traditional")
    except Exception as e:
        print(f"Intent Analysis Error: {e}")
        ritual_name = request.query
        pref_language = None
        pref_style = None

    # 5. Search Execution
    cache_entry = discovery_agent.check_cache(request.query, location, category, db)
    if cache_entry:
        results = [ProviderResponse(**p) for p in cache_entry.results.get("results", [])]
        if not is_unlimited:
            results = results[:15]
        return SearchResponse(
            results=results,
            total_results=len(results),
            cached=True,
            event_id=event_id
        )
    
    try:
        results_list = []
        if category in ["all", "", None]:
            for role in ["PANDIT", "VENUE", "CATERING"]:
                res = await discovery_agent.discover_providers(
                    role, 
                    location, 
                    db, 
                    ritual_name=ritual_name,
                    language=pref_language,
                    style=pref_style
                )
                results_list.extend([ProviderResponse(**p) for p in res])
        else:
            cat_map = {"pandits": "PANDIT", "venues": "VENUE", "catering": "CATERING"}
            role = cat_map.get(category.lower(), category.upper())
            res = await discovery_agent.discover_providers(
                role, 
                location, 
                db,
                ritual_name=ritual_name,
                language=pref_language,
                style=pref_style
            )
            results_list = [ProviderResponse(**p) for p in res]
        
        # Save to cache
        cache_data = {"results": [r.model_dump() for r in results_list]}
        discovery_agent.save_to_cache(request.query, location, category or "all", cache_data, db)
        
        if not is_unlimited:
            results_list = results_list[:15]
        
        return SearchResponse(
            results=results_list,
            total_results=len(results_list),
            cached=False,
            event_id=event_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Search APIs failed: {str(e)}"
        )


@router.get("/api/discover/{role}", response_model=List[ProviderResponse])
async def discover_providers_endpoint(
    role: str,
    location: str = Query(..., description="Location to search in"),
    db: Session = Depends(get_db)
):
    """Discover providers in a dynamic role and specific location."""
    
    # [NEW] Early Logging: Record Search Intent Immediately
    try:
        log_entry = AgentLog(
            id=str(uuid.uuid4()),
            event_id=None,
            agent_type="FINDER",
            tool_used="Initiation",
            summary_outcome=f"Request Received: Discover '{role.upper()}' in '{location}'."
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        print(f"Agent Log Error: {e}")
    
    # Generic wrapper removes hardcoded Pandits/Venues tables logic
    providers = await discovery_agent.discover_providers(role, location, db)
    return [ProviderResponse(**p) for p in providers]

# --- Auth & Identity Routes ---

@router.post("/api/auth/register", response_model=UserResponse)
async def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if user_in.role == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Cannot register as ADMIN")
        
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    user_id = str(uuid.uuid4())
    new_user = User(
        id=user_id,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        status=UserStatus.PENDING if user_in.role != UserRole.HOST else UserStatus.APPROVED,
        token_balance=1000 if user_in.role == UserRole.HOST else 0
    )
    
    new_profile = Profile(
        id=str(uuid.uuid4()),
        user_id=user_id,
        full_name=user_in.profile.full_name,
        phone=user_in.profile.phone,
        whatsapp=user_in.profile.whatsapp,
        location=user_in.profile.location,
        role_metadata=user_in.profile.role_metadata
    )
    
    db.add(new_user)
    db.add(new_profile)
    db.commit()
    db.refresh(new_user)
    
    # ----------------------------------------------------
    # Active Email Dispatching (EPIC-2)
    # ----------------------------------------------------
    if new_user.role == UserRole.HOST:
        send_dynamic_email(
            db=db,
            to_email=new_user.email,
            event_type=EmailEventType.WELCOME_USER,
            context={"name": new_profile.full_name}
        )
    else:
        # It's a Vendor (Pandit, Supplier, Temple Admin) -> waiting for approval
        send_dynamic_email(
            db=db,
            to_email=settings.admin_user, # Alert the admin
            event_type=EmailEventType.VENDOR_WAITING,
            context={
                "vendor_name": new_profile.full_name,
                "vendor_role": new_user.role.name,
                "vendor_email": new_user.email
            }
        )
    return new_user


@router.post("/api/auth/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@router.patch("/api/auth/change-password")
async def change_password(
    pwd_in: PasswordChange, 
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not verify_password(pwd_in.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    current_user.hashed_password = get_password_hash(pwd_in.new_password)
    db.commit()
    return {"status": "success"}


@router.post("/api/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if user and user.status == UserStatus.APPROVED:
        # Generate token
        reset_token = create_reset_token(user.email)
        # Assuming frontend runs on specific URL
        reset_url = f"{settings.cors_origins.split(',')[0]}/reset-password?token={reset_token}"
        # Send email
        send_dynamic_email(
            db=db,
            to_email=user.email,
            event_type=EmailEventType.RESET_PASSWORD,
            context={"reset_url": reset_url}
        )
    # Always return success to prevent email enumeration
    return {"message": "If that email exists in our system, you will receive a reset link shortly."}


@router.post("/api/auth/reset-password")
async def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = verify_reset_token(req.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
        
    user.hashed_password = get_password_hash(req.new_password)
    db.commit()
    return {"message": "Password has been reset successfully. You can now log in."}


@router.get("/api/auth/me", response_model=UserResponse)
async def read_users_me(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    from models import SubscriptionRequest, SubscriptionRequestStatus
    existing = db.query(SubscriptionRequest).filter(
        SubscriptionRequest.user_id == current_user.id,
        SubscriptionRequest.status == SubscriptionRequestStatus.PENDING
    ).first()
    
    current_user.has_pending_subscription = bool(existing)
    return current_user


@router.patch("/api/users/me/profile", response_model=UserResponse)
async def update_user_profile(
    update_data: ProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = current_user.profile
    if not profile:
        # Legacy/Bootstrap Accounts: Auto-create missing profile
        profile = Profile(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            whatsapp=update_data.whatsapp or "Pending"
        )
        db.add(profile)
        db.flush()
        
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(profile, key, value)
        
    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/api/users/me/upgrade", response_model=Dict[str, str])
async def upgrade_subscription(
    upgrade_req: SubscriptionUpgrade,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    valid_upgrades = ["SILVER", "GOLD", "PLATINUM"]
    target = upgrade_req.target_tier.upper()
    
    if target not in valid_upgrades:
        raise HTTPException(status_code=400, detail="Invalid subscription tier requested.")
        
    # Check if a pending request already exists
    from models import SubscriptionRequest, SubscriptionRequestStatus
    existing = db.query(SubscriptionRequest).filter(
        SubscriptionRequest.user_id == current_user.id,
        SubscriptionRequest.status == SubscriptionRequestStatus.PENDING
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending subscription upgrade request.")
        
    # Create request
    new_request = SubscriptionRequest(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        target_tier=target,
        status=SubscriptionRequestStatus.PENDING
    )
    db.add(new_request)
    db.commit()
    
    return {"message": f"Upgrade request to {target} submitted successfully."}


@router.post("/api/users/me/request-deletion")
async def request_account_deletion(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    from datetime import datetime
    current_user.status = UserStatus.PENDING_DELETION
    current_user.deletion_requested_at = datetime.utcnow()
    db.commit()
    return {"message": "Account deletion requested. It will be processed in 15 days."}


# --- Admin Gateway Routes ---

@router.get("/api/admin/users", response_model=List[UserResponse])
async def get_all_users(
    db: Session = Depends(get_db), 
    admin: User = Depends(get_current_admin)
):
    users = db.query(User).all()
    return users


from schemas import SubscriptionRequestResponse

@router.get("/api/admin/subscriptions", response_model=List[SubscriptionRequestResponse])
async def get_all_subscription_requests(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    from models import SubscriptionRequest
    requests = db.query(SubscriptionRequest).order_by(SubscriptionRequest.created_at.desc()).all()
    
    # Manually stitch in user details for the UI.
    response_list = []
    for req in requests:
        user_details = db.query(User).filter(User.id == req.user_id).first()
        name = user_details.profile.full_name if (user_details and user_details.profile and user_details.profile.full_name) else None
        
        response_list.append(SubscriptionRequestResponse(
            id=req.id,
            user_id=req.user_id,
            target_tier=req.target_tier.value,
            status=req.status,
            created_at=req.created_at,
            user_email=user_details.email if user_details else None,
            user_name=name
        ))
    return response_list

@router.patch("/api/admin/subscriptions/{request_id}", response_model=Dict[str, str])
async def update_subscription_request(
    request_id: str,
    status_update: UserUpdateStatus, # We can reuse the simple {"status": "APPROVED"} payload
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    from models import SubscriptionRequest, SubscriptionRequestStatus
    req = db.query(SubscriptionRequest).filter(SubscriptionRequest.id == request_id).first()
    
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
        
    if req.status != SubscriptionRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="This request has already been processed.")
        
    new_status = status_update.status.upper()
    if new_status not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Status must be APPROVED or REJECTED.")
        
    req.status = new_status
    
    if new_status == "APPROVED":
        target_user = db.query(User).filter(User.id == req.user_id).first()
        if target_user:
            target_user.subscription_tier = req.target_tier
            # Grant token bundle
            token_bundles = {
                "SILVER": 10000,
                "GOLD": 25000,
                "PLATINUM": 60000
            }
            target_user.token_balance = target_user.token_balance + token_bundles.get(req.target_tier.value, 0)
            
    db.commit()
    return {"message": f"Subscription request {new_status.lower()} successfully."}


@router.patch("/api/admin/approve/{user_id}", response_model=UserResponse)
async def approve_user(
    user_id: str,
    status_update: UserUpdateStatus,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    old_status = user.status
    user.status = status_update.status
    db.commit()
    db.refresh(user)
    
    # ----------------------------------------------------
    # Active Email Dispatching (EPIC-2)
    # ----------------------------------------------------
    if old_status != UserStatus.APPROVED and user.status == UserStatus.APPROVED:
        profile_name = user.profile.full_name if user.profile else "User"
        send_dynamic_email(
            db=db,
            to_email=user.email,
            event_type=EmailEventType.VENDOR_APPROVED,
            context={"name": profile_name}
        )
    
    # Mock WhatsApp trigger if approved
    if user.status == UserStatus.APPROVED and user.profile and user.profile.whatsapp:
        print(f"MOCK WHATSAPP MESSAGE: Sending approval notification to {user.profile.whatsapp}")
        
    return user


@router.get("/api/admin/emails", response_model=List[EmailTemplateResponse])
async def get_email_templates(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    templates = db.query(EmailTemplate).all()
    return templates


@router.patch("/api/admin/emails/{template_id}", response_model=EmailTemplateResponse)
async def update_email_template(
    template_id: int,
    update_data: EmailTemplateUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Email template not found")
        
    if update_data.subject is not None:
        template.subject = update_data.subject
    if update_data.body_html is not None:
        template.body_html = update_data.body_html
        
    db.commit()
    db.refresh(template)
    return template


# --- Event & Selection Routes ---

@router.post("/api/events", response_model=EventResponse)
async def create_event(
    event_in: EventCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    event = Event(
        customer_id=current_user.id,
        title=event_in.title,
        location=event_in.location,
        event_date=event_in.event_date
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/api/events", response_model=List[EventResponse])
async def list_events(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return db.query(Event).filter(Event.customer_id == current_user.id).all()


@router.patch("/api/events/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str,
    event_update: EventUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id, Event.customer_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if event_update.title is not None:
        event.title = event_update.title
    if event_update.location is not None:
        event.location = event_update.location
    if event_update.event_date is not None:
        event.event_date = event_update.event_date
    if event_update.status is not None:
        event.status = event_update.status
        
    db.commit()
    db.refresh(event)
    return event


@router.post("/api/events/{event_id}/select", response_model=EventResponse)
async def select_partner(
    event_id: str,
    selection: SelectionRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id, Event.customer_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    # Check if already booked
    existing = db.query(Booking).filter(
        Booking.event_id == event_id,
        Booking.partner_id == selection.partner_id
    ).first()
    
    if existing:
        return event
        
    booking = Booking(
        event_id=event_id,
        partner_id=selection.partner_id,
        partner_type=selection.partner_type,
        is_external=selection.is_external,
        partner_data=selection.partner_data,
        status="CONFIRMED" if selection.is_external else "PENDING"
    )
    
    db.add(booking)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/api/events/{event_id}/deselect/{partner_id}")
async def deselect_partner(
    event_id: str,
    partner_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id, Event.customer_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    booking = db.query(Booking).filter(
        Booking.event_id == event_id,
        Booking.partner_id == partner_id
    ).first()
    
    if booking:
        db.delete(booking)
        db.commit()
        
    return {"status": "success"}


# --- Guest & Supply Management ---

@router.get("/api/events/{event_id}/guests", response_model=List[GuestResponse])
async def list_event_guests(
    event_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id, Event.customer_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event.guests

@router.post("/api/events/{event_id}/guests", response_model=GuestResponse)
async def add_event_guest(
    event_id: str,
    guest_in: GuestCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id, Event.customer_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    guest = Guest(
        id=str(uuid.uuid4()),
        event_id=event_id,
        name=guest_in.name,
        phone=guest_in.phone,
        email=guest_in.email,
        member_count=guest_in.member_count,
        status=guest_in.status,
        invited_via=guest_in.invited_via
    )
    db.add(guest)
    db.commit()
    db.refresh(guest)
    return guest

@router.delete("/api/events/{event_id}/guests/{guest_id}")
async def remove_event_guest(
    event_id: str,
    guest_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    guest = db.query(Guest).filter(Guest.id == guest_id, Guest.event_id == event_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    
    db.delete(guest)
    db.commit()
    return {"status": "success"}

@router.get("/api/events/{event_id}/supplies", response_model=List[SupplyResponse])
async def list_event_supplies(
    event_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id, Event.customer_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event.supplies

@router.post("/api/events/{event_id}/supplies", response_model=SupplyResponse)
async def add_event_supply(
    event_id: str,
    supply_in: SupplyCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id, Event.customer_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    supply = Supply(
        id=str(uuid.uuid4()),
        event_id=event_id,
        name=supply_in.name,
        category=supply_in.category,
        quantity=supply_in.quantity,
        completed=supply_in.completed
    )
    db.add(supply)
    db.commit()
    db.refresh(supply)
    return supply

@router.patch("/api/events/{event_id}/supplies/{supply_id}", response_model=SupplyResponse)
async def update_event_supply_status(
    event_id: str,
    supply_id: str,
    completed: bool,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    supply = db.query(Supply).filter(Supply.id == supply_id, Supply.event_id == event_id).first()
    if not supply:
        raise HTTPException(status_code=404, detail="Supply item not found")
    
    supply.completed = completed
    db.commit()
    db.refresh(supply)
    return supply


# --- Agent Audit Logs (Admin) ---

@router.get("/api/admin/agent-logs", response_model=List[AgentLogResponse])
async def get_agent_logs(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Fetch all agent logs (Admin only)"""
    logs = db.query(AgentLog).order_by(AgentLog.created_at.desc()).all()
    return logs

@router.post("/api/admin/agent-logs", response_model=AgentLogResponse)
async def create_agent_log(
    log_in: AgentLogCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Create an agent log entry"""
    new_log = AgentLog(
        id=str(uuid.uuid4()),
        event_id=log_in.event_id,
        agent_type=log_in.agent_type.upper(),
        tool_used=log_in.tool_used,
        summary_outcome=log_in.summary_outcome
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log


