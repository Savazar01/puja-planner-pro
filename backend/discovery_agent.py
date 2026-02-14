import httpx
import hashlib
import json
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import google.generativeai as genai
from config import settings
from sqlalchemy.orm import Session
from models import Pandit, Venue, Catering, SearchCache


# Configure Gemini
genai.configure(api_key=settings.gemini_api_key)


class DiscoveryAgent:
    """Intelligent discovery agent using Serper, Firecrawl, and Gemini."""
    
    def __init__(self):
        self.serper_api_key = settings.serper_api_key
        self.firecrawl_api_key = settings.firecrawl_api_key
        self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
    
    async def search_with_serper(self, query: str, location: str = "") -> List[Dict[str, Any]]:
        """Search using Serper.dev API for local businesses."""
        url = "https://google.serper.dev/search"
        
        search_query = f"{query} in {location}" if location else query
        
        headers = {
            "X-API-KEY": self.serper_api_key,
            "Content-Type": "application/json"
        }
        
        payload = {
            "q": search_query,
            "num": 10,
            "gl": "in",  # Country: India
            "hl": "en"
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                
                # Extract organic results
                results = []
                if "organic" in data:
                    for item in data["organic"]:
                        results.append({
                            "title": item.get("title", ""),
                            "link": item.get("link", ""),
                            "snippet": item.get("snippet", ""),
                            "position": item.get("position", 0)
                        })
                
                return results
        except Exception as e:
            print(f"Serper API error: {e}")
            return []
    
    async def scrape_with_firecrawl(self, url: str) -> str:
        """Scrape website content using Firecrawl API."""
        api_url = "https://api.firecrawl.dev/v0/scrape"
        
        headers = {
            "Authorization": f"Bearer {self.firecrawl_api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "url": url,
            "formats": ["markdown", "html"]
        }
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(api_url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                
                # Extract content
                if data.get("success"):
                    content = data.get("data", {}).get("markdown", "")
                    if not content:
                        content = data.get("data", {}).get("html", "")
                    return content
                
                return ""
        except Exception as e:
            print(f"Firecrawl API error for {url}: {e}")
            return ""
    
    def parse_with_gemini(self, content: str, entity_type: str) -> Optional[Dict[str, Any]]:
        """Parse scraped content into structured JSON using Gemini."""
        
        prompts = {
            "pandit": """
You are parsing information about a Pandit (Hindu priest). Extract the following information from the content and return ONLY a valid JSON object:

{
    "name": "Full name of the pandit",
    "specialization": "Ceremonies they specialize in (comma-separated)",
    "location": "City and state",
    "phone": "Contact phone number",
    "email": "Email address if available",
    "website": "Website URL if available",
    "languages": ["List", "of", "languages"],
    "price_range": "Price range (e.g., ₹5,000 - ₹15,000)",
    "rating": 0.0,
    "reviews": 0,
    "verified": false
}

If a field is not found, use null or appropriate default. Return ONLY the JSON, no additional text.
""",
            "venue": """
You are parsing information about a venue/hall. Extract the following information from the content and return ONLY a valid JSON object:

{
    "name": "Venue name",
    "location": "City and state",
    "address": "Full address",
    "capacity": 0,
    "venue_type": "Type (e.g., Marriage Hall, Banquet Hall)",
    "amenities": ["List", "of", "amenities"],
    "price_range": "Price range",
    "phone": "Contact phone number",
    "email": "Email address if available",
    "website": "Website URL if available",
    "rating": 0.0,
    "reviews": 0,
    "verified": false
}

If a field is not found, use null or appropriate default. Return ONLY the JSON, no additional text.
""",
            "catering": """
You are parsing information about a catering service. Extract the following information from the content and return ONLY a valid JSON object:

{
    "name": "Catering service name",
    "location": "City and state",
    "cuisine_types": ["List", "of", "cuisines"],
    "specialties": ["Specialties", "like", "Satvik", "Wedding Feast"],
    "price_per_plate": "Price per plate",
    "min_order": 0,
    "phone": "Contact phone number",
    "email": "Email address if available",
    "website": "Website URL if available",
    "rating": 0.0,
    "reviews": 0,
    "verified": false
}

If a field is not found, use null or appropriate default. Return ONLY the JSON, no additional text.
"""
        }
        
        try:
            prompt = prompts.get(entity_type, prompts["pandit"])
            full_prompt = f"{prompt}\n\nContent to parse:\n{content[:4000]}"  # Limit content length
            
            response = self.gemini_model.generate_content(full_prompt)
            
            # Extract JSON from response
            text = response.text.strip()
            
            # Try to find JSON in the response
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            
            text = text.strip()
            
            # Parse JSON
            parsed_data = json.loads(text)
            return parsed_data
            
        except Exception as e:
            print(f"Gemini parsing error: {e}")
            return None
    
    async def discover_pandits(self, location: str, db: Session) -> List[Pandit]:
        """Full discovery pipeline for Pandits."""
        query = f"pandits priests hindu ceremonies {location}"
        
        # Search with Serper
        search_results = await self.search_with_serper(query, location)
        
        pandits = []
        
        for result in search_results[:5]:  # Limit to top 5 results
            url = result.get("link")
            if not url:
                continue
            
            # Scrape with Firecrawl
            content = await self.scrape_with_firecrawl(url)
            
            if not content:
                # Fallback: create from search snippet
                pandit_data = {
                    "name": result.get("title", "Unknown"),
                    "specialization": result.get("snippet", ""),
                    "location": location,
                    "website": url
                }
            else:
                # Parse with Gemini
                pandit_data = self.parse_with_gemini(content, "pandit")
                if not pandit_data:
                    continue
                pandit_data["website"] = url
            
            # Create Pandit model
            pandit = Pandit(
                id=str(uuid.uuid4()),
                name=pandit_data.get("name", "Unknown"),
                specialization=pandit_data.get("specialization"),
                location=pandit_data.get("location", location),
                rating=pandit_data.get("rating", 0.0),
                reviews=pandit_data.get("reviews", 0),
                verified=pandit_data.get("verified", False),
                languages=pandit_data.get("languages", []),
                price_range=pandit_data.get("price_range"),
                phone=pandit_data.get("phone"),
                email=pandit_data.get("email"),
                website=pandit_data.get("website"),
                additional_info=pandit_data
            )
            
            # Save to database
            db.add(pandit)
            pandits.append(pandit)
        
        db.commit()
        return pandits
    
    async def discover_venues(self, location: str, db: Session) -> List[Venue]:
        """Full discovery pipeline for Venues."""
        query = f"wedding halls marriage venues banquet halls {location}"
        
        search_results = await self.search_with_serper(query, location)
        
        venues = []
        
        for result in search_results[:5]:
            url = result.get("link")
            if not url:
                continue
            
            content = await self.scrape_with_firecrawl(url)
            
            if not content:
                venue_data = {
                    "name": result.get("title", "Unknown"),
                    "location": location,
                    "address": result.get("snippet", ""),
                    "website": url
                }
            else:
                venue_data = self.parse_with_gemini(content, "venue")
                if not venue_data:
                    continue
                venue_data["website"] = url
            
            venue = Venue(
                id=str(uuid.uuid4()),
                name=venue_data.get("name", "Unknown"),
                location=venue_data.get("location", location),
                address=venue_data.get("address"),
                capacity=venue_data.get("capacity"),
                venue_type=venue_data.get("venue_type"),
                amenities=venue_data.get("amenities", []),
                price_range=venue_data.get("price_range"),
                verified=venue_data.get("verified", False),
                phone=venue_data.get("phone"),
                email=venue_data.get("email"),
                website=venue_data.get("website"),
                rating=venue_data.get("rating", 0.0),
                reviews=venue_data.get("reviews", 0),
                additional_info=venue_data
            )
            
            db.add(venue)
            venues.append(venue)
        
        db.commit()
        return venues
    
    async def discover_catering(self, location: str, db: Session) -> List[Catering]:
        """Full discovery pipeline for Catering services."""
        query = f"catering services satvik food wedding catering {location}"
        
        search_results = await self.search_with_serper(query, location)
        
        catering_list = []
        
        for result in search_results[:5]:
            url = result.get("link")
            if not url:
                continue
            
            content = await self.scrape_with_firecrawl(url)
            
            if not content:
                catering_data = {
                    "name": result.get("title", "Unknown"),
                    "location": location,
                    "specialties": [result.get("snippet", "")],
                    "website": url
                }
            else:
                catering_data = self.parse_with_gemini(content, "catering")
                if not catering_data:
                    continue
                catering_data["website"] = url
            
            catering = Catering(
                id=str(uuid.uuid4()),
                name=catering_data.get("name", "Unknown"),
                location=catering_data.get("location", location),
                cuisine_types=catering_data.get("cuisine_types", []),
                specialties=catering_data.get("specialties", []),
                price_per_plate=catering_data.get("price_per_plate"),
                min_order=catering_data.get("min_order"),
                verified=catering_data.get("verified", False),
                phone=catering_data.get("phone"),
                email=catering_data.get("email"),
                website=catering_data.get("website"),
                rating=catering_data.get("rating", 0.0),
                reviews=catering_data.get("reviews", 0),
                additional_info=catering_data
            )
            
            db.add(catering)
            catering_list.append(catering)
        
        db.commit()
        return catering_list
    
    def get_cache_key(self, query: str, location: str, category: str) -> str:
        """Generate cache key for search query."""
        cache_string = f"{query}:{location}:{category}"
        return hashlib.md5(cache_string.encode()).hexdigest()
    
    def check_cache(self, query: str, location: str, category: str, db: Session) -> Optional[SearchCache]:
        """Check if cached results exist and are still valid."""
        cache_key = self.get_cache_key(query, location, category)
        
        cache_entry = db.query(SearchCache).filter(
            SearchCache.query_hash == cache_key,
            SearchCache.expires_at > datetime.now()
        ).first()
        
        return cache_entry
    
    def save_to_cache(self, query: str, location: str, category: str, results: List[Any], db: Session):
        """Save search results to cache."""
        cache_key = self.get_cache_key(query, location, category)
        expires_at = datetime.now() + timedelta(hours=settings.cache_expiry_hours)
        
        # Convert results to dict for JSON storage
        results_dict = [r.__dict__ for r in results if hasattr(r, "__dict__")]
        
        cache_entry = SearchCache(
            query_hash=cache_key,
            query=query,
            location=location,
            category=category,
            results=results_dict,
            expires_at=expires_at
        )
        
        db.add(cache_entry)
        db.commit()


# Global instance
discovery_agent = DiscoveryAgent()
