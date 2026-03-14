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
import asyncio


class DiscoveryAgent:
    """Intelligent discovery agent using Serper, Firecrawl, and Gemini."""
    
    def __init__(self):
        self.privacy_gate_url = "http://localhost:8740"
        self.proxies = {
            "all://": self.privacy_gate_url
        }
    
    async def search_with_serper(self, query: str, location: str = "") -> List[Dict[str, Any]]:
        """Search using Serper.dev API for local businesses."""
        url = "https://google.serper.dev/search"
        
        search_query = f"{query} in {location}" if location else query
        
        headers = {
            "X-API-KEY": settings.serper_api_key,
            "Content-Type": "application/json"
        }
        
        payload = {
            "q": search_query,
            "num": 10,
            "gl": "in",  # Country: India
            "hl": "en"
        }
        
        try:
            async with httpx.AsyncClient(proxies=self.proxies, timeout=30.0) as client:
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
            raise RuntimeError(f"Serper API search failed: {str(e)}")
    
    async def scrape_with_firecrawl(self, url: str) -> str:
        """Scrape website content using Firecrawl API."""
        api_url = "https://api.firecrawl.dev/v0/scrape"
        
        headers = {
            "Authorization": f"Bearer {settings.firecrawl_api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "url": url,
            "formats": ["markdown", "html"]
        }
        
        try:
            async with httpx.AsyncClient(proxies=self.proxies, timeout=60.0) as client:
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
            if not settings.gemini_api_key:
                print("Gemini API key is not configured.")
                return None
                
            genai.configure(api_key=settings.gemini_api_key)
            gemini_model = genai.GenerativeModel('gemini-1.5-flash')
            
            prompt = prompts.get(entity_type, prompts["pandit"])
            full_prompt = f"{prompt}\n\nContent to parse:\n{content[:4000]}"  # Limit content length
            
            response = gemini_model.generate_content(full_prompt)
            
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
    
    async def discover_providers(self, role: str, location: str, db: Session, include_web: bool = True) -> List[Dict[str, Any]]:
        """Discovery for Providers: Merges internal DB and external web results dynamically."""
        from models import User, Profile, UserRole, UserStatus, AgentLog
        
        role_upper = role.upper()
        target_role = None
        try:
            target_role = UserRole[role_upper]
        except KeyError:
            pass
            
        internal_providers = []
        if target_role:
            # 1. Internal Search
            users_in_role = db.query(User).join(Profile).filter(
                User.role == target_role,
                User.status == UserStatus.APPROVED,
                (Profile.location.ilike(f"%{location}%") | Profile.address_city.ilike(f"%{location}%"))
            ).all()
            
            for user in users_in_role:
                profile = user.profile
                internal_providers.append({
                    "id": user.id,
                    "name": profile.full_name or "Unnamed Member",
                    "role": role_upper,
                    "location": profile.location or profile.address_city or location,
                    "rating": 5.0,
                    "reviews": 1,
                    "is_platform_member": True,
                    "phone": profile.phone or profile.whatsapp,
                    "email": user.email,
                    "additional_info": profile.role_metadata or {}
                })
        
        # Log internal discovery
        try:
            log_entry = AgentLog(
                id=str(uuid.uuid4()),
                agent_type="FINDER",
                tool_used="Internal DB Lookups",
                summary_outcome=f"Internal search performed for role {role_upper} in location {location}. Found {len(internal_providers)} member(s)."
            )
            db.add(log_entry)
            db.commit()
        except:
            pass

        if not include_web:
            return internal_providers

        # 2. External Web Search
        query_map = {
            "PANDIT": "pandits priests hindu ceremonies",
            "VENUE": "wedding halls marriage venues banquet halls",
            "CATERING": "catering services satvik food wedding catering"
        }
        search_term = query_map.get(role_upper, f"{role} services")
        query = f"{search_term} {location}"
        
        search_results = await self.search_with_serper(query, location)
        
        external_providers = []
        for result in search_results[:3]:  # Top 3 for web results
            url = result.get("link")
            if not url or any(p.get("website") == url for p in internal_providers):
                continue
            
            content = await self.scrape_with_firecrawl(url)
            
            prompt_key = "pandit" # default fallback
            if role_upper == "VENUE": prompt_key = "venue"
            elif role_upper == "CATERING": prompt_key = "catering"
                
            if not content:
                provider_data = {"name": result.get("title", "Unknown"), "location": location, "website": url}
            else:
                provider_data = self.parse_with_gemini(content, prompt_key)
                if not provider_data: continue
                provider_data["website"] = url
            
            # Simple deduplication by phone
            ext_phone = provider_data.get("phone", "")
            is_dup = False
            if ext_phone and ext_phone != "null":
                for p in internal_providers:
                    if p.get("phone") and ext_phone in p.get("phone"):
                        is_dup = True
                        break
            if is_dup: continue
            
            external_providers.append({
                "id": str(uuid.uuid4()),
                "name": provider_data.get("name", "Unknown"),
                "role": role_upper,
                "location": provider_data.get("location", location),
                "rating": provider_data.get("rating", 0.0),
                "reviews": provider_data.get("reviews", 0),
                "is_platform_member": False,
                "phone": provider_data.get("phone"),
                "email": provider_data.get("email"),
                "website": provider_data.get("website"),
                "price_range": provider_data.get("price_range"),
                "additional_info": provider_data
            })
            
        # Log external discovery
        try:
            log_ext = AgentLog(
                id=str(uuid.uuid4()),
                agent_type="FINDER",
                tool_used="SerpAPI/Firecrawl",
                summary_outcome=f"External parallel search for role {role_upper} in location {location}. Generated {len(external_providers)} external result(s)."
            )
            db.add(log_ext)
            db.commit()
        except:
            pass
            
        return internal_providers + external_providers
    
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
