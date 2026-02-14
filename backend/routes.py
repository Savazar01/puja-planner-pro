from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from schemas import (
    SearchRequest, SearchResponse, PanditResponse, 
    VenueResponse, CateringResponse, DiscoveryResponse
)
from models import Pandit, Venue, Catering
from discovery_agent import discovery_agent

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "puja-planner-backend"}


@router.post("/api/search", response_model=SearchResponse)
async def search(
    request: SearchRequest,
    db: Session = Depends(get_db)
):
    """
    Universal search endpoint across all categories.
    Uses caching to minimize API calls.
    """
    location = request.location or "India"
    category = request.category or "all"
    
    # Check cache first
    cache_entry = discovery_agent.check_cache(request.query, location, category, db)
    
    if cache_entry:
        # Return cached results
        results = cache_entry.results
        return SearchResponse(
            pandits=[PanditResponse(**p) for p in results.get("pandits", [])],
            venues=[VenueResponse(**v) for v in results.get("venues", [])],
            catering=[CateringResponse(**c) for c in results.get("catering", [])],
            total_results=len(results.get("pandits", [])) + len(results.get("venues", [])) + len(results.get("catering", [])),
            cached=True
        )
    
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
    
    return SearchResponse(
        pandits=pandits_list,
        venues=venues_list,
        catering=catering_list,
        total_results=len(pandits_list) + len(venues_list) + len(catering_list),
        cached=False
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
