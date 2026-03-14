from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Any, Dict
from datetime import datetime
from enum import Enum
from models import UserRole, UserStatus, SubscriptionRequestStatus, EmailEventType

class EmailTemplateUpdate(BaseModel):
    subject: Optional[str] = None
    body_html: Optional[str] = None

class EmailTemplateResponse(BaseModel):
    id: int
    event_type: EmailEventType
    subject: str
    body_html: str
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class ProfileBase(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: str
    location: Optional[str] = None
    role_metadata: Optional[Dict[str, Any]] = {}
    
    # EPIC-3 Enhanced Fields
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_country: Optional[str] = None
    social_media: Optional[Dict[str, Any]] = {}
    profile_picture_url: Optional[str] = None
    bio: Optional[str] = None

class ProfileCreate(ProfileBase):
    pass

class ProfileResponse(ProfileBase):
    id: str
    user_id: str
    
    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: EmailStr
    role: UserRole

class UserCreate(UserBase):
    password: str
    profile: ProfileCreate

class UserResponse(UserBase):
    id: str
    status: UserStatus
    created_at: datetime
    subscription_tier: Optional[str] = None
    token_balance: Optional[int] = None
    has_pending_subscription: Optional[bool] = False
    profile: Optional[ProfileResponse] = None
    
    class Config:
        from_attributes = True

class ProfileUpdate(BaseModel):
    whatsapp: Optional[str] = None
    location: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role_metadata: Optional[Dict[str, Any]] = None
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_country: Optional[str] = None
    social_media: Optional[Dict[str, Any]] = None
    profile_picture_url: Optional[str] = None
    bio: Optional[str] = None

class UserUpdateStatus(BaseModel):
    status: UserStatus

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class SubscriptionUpgrade(BaseModel):
    target_tier: str

class SubscriptionRequestResponse(BaseModel):
    id: str
    user_id: str
    target_tier: str
    status: SubscriptionRequestStatus
    created_at: datetime
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class SearchRequest(BaseModel):
    """Request schema for search endpoint."""
    query: str = Field(..., min_length=1, description="Search query")
    location: Optional[str] = Field(None, description="Location filter (city, state)")
    category: Optional[str] = Field(None, description="Category filter: pandits, venues, catering")


class PanditResponse(BaseModel):
    """Response schema for Pandit data."""
    id: str
    name: str
    specialization: Optional[str] = None
    location: Optional[str] = None
    rating: float = 0.0
    reviews: int = 0
    verified: bool = False
    is_internal: bool = False
    languages: List[str] = []
    price_range: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    additional_info: Optional[dict] = None
    
    class Config:
        from_attributes = True


class VenueResponse(BaseModel):
    """Response schema for Venue data."""
    id: str
    name: str
    location: Optional[str] = None
    address: Optional[str] = None
    capacity: Optional[int] = None
    venue_type: Optional[str] = None
    amenities: List[str] = []
    price_range: Optional[str] = None
    verified: bool = False
    is_internal: bool = False
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    rating: float = 0.0
    reviews: int = 0
    additional_info: Optional[dict] = None
    
    class Config:
        from_attributes = True


class CateringResponse(BaseModel):
    """Response schema for Catering data."""
    id: str
    name: str
    location: Optional[str] = None
    cuisine_types: List[str] = []
    specialties: List[str] = []
    price_per_plate: Optional[str] = None
    min_order: Optional[int] = None
    verified: bool = False
    is_internal: bool = False
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    rating: float = 0.0
    reviews: int = 0
    additional_info: Optional[dict] = None
    
    class Config:
        from_attributes = True


class SearchResponse(BaseModel):
    """Combined search response."""
    pandits: List[PanditResponse] = []
    venues: List[VenueResponse] = []
    catering: List[CateringResponse] = []
    total_results: int = 0
    cached: bool = False
    timestamp: datetime = Field(default_factory=datetime.now)


class DiscoveryResponse(BaseModel):
    """Generic discovery response."""
    results: List[Any]
    count: int
    location: str
    source: str = "discovery_agent"


class BookingBase(BaseModel):
    partner_id: str
    partner_type: str
    is_external: bool = False
    partner_data: Optional[Dict[str, Any]] = None

class BookingResponse(BookingBase):
    id: str
    status: str
    
    class Config:
        from_attributes = True

class EventBase(BaseModel):
    title: str
    location: Optional[str] = None
    event_date: Optional[datetime] = None

class EventUpdate(BaseModel):
    title: Optional[str] = None
    location: Optional[str] = None
    event_date: Optional[datetime] = None
    status: Optional[str] = None

class EventCreate(EventBase):
    pass

class EventResponse(EventBase):
    id: str
    customer_id: str
    status: str
    bookings: List[BookingResponse] = []
    
    class Config:
        from_attributes = True

class SelectionRequest(BaseModel):
    partner_id: str
    partner_type: str
    is_external: bool = False
    partner_data: Optional[Dict[str, Any]] = None

class AgentLogBase(BaseModel):
    event_id: Optional[str] = None
    agent_type: str
    tool_used: Optional[str] = None
    summary_outcome: str

class AgentLogCreate(AgentLogBase):
    pass

class AgentLogResponse(AgentLogBase):
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True
