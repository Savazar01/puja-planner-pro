from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Any, Dict
from datetime import datetime
from enum import Enum
from models import UserRole, UserStatus, EmailEventType

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
    profile: Optional[ProfileResponse] = None
    
    class Config:
        from_attributes = True

class ProfileUpdate(BaseModel):
    whatsapp: Optional[str] = None
    location: Optional[str] = None

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
