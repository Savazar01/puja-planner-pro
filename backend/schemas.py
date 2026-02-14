from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime


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
