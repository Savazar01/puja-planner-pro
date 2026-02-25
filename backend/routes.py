from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from database import get_db
from schemas import (
    SearchRequest, SearchResponse, PanditResponse, 
    VenueResponse, CateringResponse, DiscoveryResponse,
    UserCreate, UserResponse, Token, PasswordChange, UserUpdateStatus
)
from models import Pandit, Venue, Catering, User, Profile, UserStatus, UserRole
from discovery_agent import discovery_agent
from config import settings
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, get_current_active_user, get_current_admin, search_bouncer
)

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "puja-planner-backend"}


@router.post("/api/search", response_model=SearchResponse)
async def search(
    request: SearchRequest,
    db: Session = Depends(get_db),
    is_unlimited: bool = Depends(search_bouncer)
):
    """
    Universal search endpoint across all categories.
    Uses caching to minimize API calls.
    """
    if not settings.serper_api_key or not settings.firecrawl_api_key:
        raise HTTPException(
            status_code=500,
            detail="Missing SERPER_API_KEY or FIRECRAWL_API_KEY. Live web search and scraping are unavailable."
        )

    location = request.location or "India"
    category = request.category or "all"
    
    # Check cache first
    cache_entry = discovery_agent.check_cache(request.query, location, category, db)
    
    if cache_entry:
        # Return cached results
        pandits = [PanditResponse(**p) for p in cache_entry.results.get("pandits", [])]
        venues = [VenueResponse(**v) for v in cache_entry.results.get("venues", [])]
        catering = [CateringResponse(**c) for c in cache_entry.results.get("catering", [])]
        
        if not is_unlimited:
            pandits = pandits[:5]
            venues = venues[:5]
            catering = catering[:5]
            
        return SearchResponse(
            pandits=pandits,
            venues=venues,
            catering=catering,
            total_results=len(pandits) + len(venues) + len(catering),
            cached=True
        )
    
    try:
        # No cache, perform discovery
        pandits_list = []
        venues_list = []
        catering_list = []
        
        if category in ["all", "pandits"]:
            # Search in database first
            pandits_db = db.query(Pandit).filter(
                Pandit.location.ilike(f"%{location}%")
            ).limit(10).all()
            
            if not pandits_db:
                # Discover new pandits
                pandits_db = await discovery_agent.discover_pandits(location, db)
            
            pandits_list = [PanditResponse.from_orm(p) for p in pandits_db]
        
        if category in ["all", "venues"]:
            venues_db = db.query(Venue).filter(
                Venue.location.ilike(f"%{location}%")
            ).limit(10).all()
            
            if not venues_db:
                venues_db = await discovery_agent.discover_venues(location, db)
            
            venues_list = [VenueResponse.from_orm(v) for v in venues_db]
        
        if category in ["all", "catering"]:
            catering_db = db.query(Catering).filter(
                Catering.location.ilike(f"%{location}%")
            ).limit(10).all()
            
            if not catering_db:
                catering_db = await discovery_agent.discover_catering(location, db)
            
            catering_list = [CateringResponse.from_orm(c) for c in catering_db]
        
        # Save to cache
        cache_data = {
            "pandits": [p.dict() for p in pandits_list],
            "venues": [v.dict() for v in venues_list],
            "catering": [c.dict() for c in catering_list]
        }
        discovery_agent.save_to_cache(request.query, location, category, cache_data, db)
        
        if not is_unlimited:
            pandits_list = pandits_list[:5]
            venues_list = venues_list[:5]
            catering_list = catering_list[:5]
        
        return SearchResponse(
            pandits=pandits_list,
            venues=venues_list,
            catering=catering_list,
            total_results=len(pandits_list) + len(venues_list) + len(catering_list),
            cached=False
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Search APIs failed: {str(e)}"
        )


@router.get("/api/discover/pandits", response_model=List[PanditResponse])
async def discover_pandits_endpoint(
    location: str = Query(..., description="Location to search in"),
    db: Session = Depends(get_db)
):
    """Discover Pandits in a specific location."""
    # Check database first
    existing = db.query(Pandit).filter(
        Pandit.location.ilike(f"%{location}%")
    ).limit(10).all()
    
    if existing:
        return [PanditResponse.from_orm(p) for p in existing]
    
    # Discover new
    pandits = await discovery_agent.discover_pandits(location, db)
    return [PanditResponse.from_orm(p) for p in pandits]


@router.get("/api/discover/venues", response_model=List[VenueResponse])
async def discover_venues_endpoint(
    location: str = Query(..., description="Location to search in"),
    db: Session = Depends(get_db)
):
    """Discover Venues in a specific location."""
    existing = db.query(Venue).filter(
        Venue.location.ilike(f"%{location}%")
    ).limit(10).all()
    
    if existing:
        return [VenueResponse.from_orm(v) for v in existing]
    
    venues = await discovery_agent.discover_venues(location, db)
    return [VenueResponse.from_orm(v) for v in venues]


@router.get("/api/discover/catering", response_model=List[CateringResponse])
async def discover_catering_endpoint(
    location: str = Query(..., description="Location to search in"),
    db: Session = Depends(get_db)
):
    """Discover Catering services in a specific location."""
    existing = db.query(Catering).filter(
        Catering.location.ilike(f"%{location}%")
    ).limit(10).all()
    
    if existing:
        return [CateringResponse.from_orm(c) for c in existing]
    
    catering = await discovery_agent.discover_catering(location, db)
    return [CateringResponse.from_orm(c) for c in catering]


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
        status=UserStatus.PENDING if user_in.role != UserRole.HOST else UserStatus.APPROVED
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


@router.get("/api/auth/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user


# --- Admin Gateway Routes ---

@router.get("/api/admin/users/pending", response_model=List[UserResponse])
async def get_pending_users(
    db: Session = Depends(get_db), 
    admin: User = Depends(get_current_admin)
):
    users = db.query(User).filter(User.status == UserStatus.PENDING).all()
    return users


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
        
    user.status = status_update.status
    db.commit()
    db.refresh(user)
    
    # Mock WhatsApp trigger if approved
    if user.status == UserStatus.APPROVED and user.profile and user.profile.whatsapp:
        print(f"MOCK WHATSAPP MESSAGE: Sending approval notification to {user.profile.whatsapp}")
        
    return user

