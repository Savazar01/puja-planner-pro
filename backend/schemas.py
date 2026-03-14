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
    event_id: Optional[str] = Field(None, description="Existing event ID to associate search with")


class ProviderResponse(BaseModel):
    """Generic response schema for any discovered provider."""
    id: str
    name: str
    role: str
    location: Optional[str] = None
    rating: float = 0.0
    reviews: int = 0
    is_platform_member: bool = False
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    price_range: Optional[str] = None
    additional_info: Optional[dict] = None
    
    class Config:
        from_attributes = True

class SearchResponse(BaseModel):
    """Combined search response."""
    results: List[ProviderResponse] = []
    total_results: int = 0
    cached: bool = False
    timestamp: datetime = Field(default_factory=datetime.now)
    event_id: Optional[str] = None
    ritual_type: Optional[str] = None
    clarification_needed: bool = False
    clarification_message: Optional[str] = None



class DiscoveryResponse(BaseModel):
    """Generic discovery response."""
    results: List[Any]
    count: int
    location: str
    source: str = "discovery_agent"


class GuestBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    member_count: int = 1
    status: str = "PENDING"
    invited_via: Optional[str] = None

class GuestCreate(GuestBase):
    pass

class GuestResponse(GuestBase):
    id: str
    event_id: str
    
    class Config:
        from_attributes = True

class SupplyBase(BaseModel):
    name: str
    category: Optional[str] = None
    quantity: Optional[str] = None
    completed: bool = False

class SupplyCreate(SupplyBase):
    pass

class SupplyResponse(SupplyBase):
    id: str
    event_id: str
    
    class Config:
        from_attributes = True

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
    guests: List[GuestResponse] = []
    supplies: List[SupplyResponse] = []
    
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
