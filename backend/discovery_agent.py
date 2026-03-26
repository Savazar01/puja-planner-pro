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
        self.privacy_gate_url = settings.privacy_gate_url
        self.proxies = {
            "all://": self.privacy_gate_url
        }
    
    async def search_with_serper(self, query: str, ritual_name: str = "", language: str = "", role: str = "", location: str = "") -> List[Dict[str, Any]]:
        """Search using Serper.dev via Privacy Gate /outbound."""
        # [ADVANCED HEURISTICS] Construct Long-Tail queries: [Ritual] + [Language] + [Role] + [Location]
        search_query_parts = []
        if ritual_name: search_query_parts.append(ritual_name)
        if language: search_query_parts.append(language)
        if role: search_query_parts.append(role)
        if location: search_query_parts.append(location)
        
        # [FIX] Prioritize the Supervisor's high-intent query if substantial
        if query and len(query) > 15:
            search_query = query
        elif not search_query_parts:
            search_query = f"{query} {location}".strip()
        else:
            search_query = " ".join(search_query_parts)

        if len(search_query) < 5:
            search_query = f"{query} in {location}" if location else query
        
        # Privacy Gate Forwarding
        gate_url = f"{self.privacy_gate_url}/outbound"
        payload = {
            "url": "https://google.serper.dev/search",
            "method": "POST",
            "headers": {
                "X-API-KEY": settings.serper_api_key,
                "Content-Type": "application/json"
            },
            "payload": {
                "q": search_query,
                "num": 10,
                "gl": "in",
                "hl": "en",
                "google_domain": "google.co.in"
            }
        }
        
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(gate_url, json=payload)
                
                if response.status_code == 401:
                    print(f"Auth Failure (401) via Privacy Gate. Logging and falling back to Internal.")
                    return []
                
                response.raise_for_status()
                data = response.json()
                
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
            print(f"Privacy Gate Outbound Error (Serper): {e}")
            return []

    async def scrape_with_firecrawl(self, url: str) -> str:
        """Scrape via Privacy Gate /outbound."""
        gate_url = f"{self.privacy_gate_url}/outbound"
        payload = {
            "url": "https://api.firecrawl.dev/v0/scrape",
            "method": "POST",
            "headers": {
                "Authorization": f"Bearer {settings.firecrawl_api_key}",
                "Content-Type": "application/json"
            },
            "payload": {
                "url": url,
                "formats": ["markdown", "html"]
            }
        }
        
        try:
            async with httpx.AsyncClient(timeout=65.0) as client:
                response = await client.post(gate_url, json=payload)
                response.raise_for_status()
                data = response.json()
                
                if data.get("success"):
                    content = data.get("data", {}).get("markdown", "")
                    if not content:
                        content = data.get("data", {}).get("html", "")
                    return content
                return ""
        except Exception as e:
            print(f"Privacy Gate Outbound Error (Firecrawl): {e}")
            return ""
    
    async def parse_with_gemini(self, content: str, entity_type: str) -> Optional[Dict[str, Any]]:
        """Parse scraped content into structured JSON using Gemini asynchronously."""
        
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
            
            prompt = prompts.get(entity_type, prompts["pandit"])
            full_prompt = f"{prompt}\n\nContent to parse:\n{content[:4000]}"  # Limit content length
            
            # [UPGRADE] Using gemini-3-flash-preview for structured parsing
            gemini_model = genai.GenerativeModel(settings.agent_finder_llm)
            response = await gemini_model.generate_content_async(full_prompt)
            
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
    
    async def discover_providers(self, role: str, location: str, db: Optional[Session] = None, include_web: bool = True, ritual_name: str = "", language: str = "", style: str = "", agent_command: str = "") -> List[Dict[str, Any]]:
        """Discovery for Providers: Prioritizes internal DB then falls back to external web results."""
        from models import User, Profile, UserRole, UserStatus, AgentLog
        from database import SessionLocal
        from sqlalchemy import or_
        
        # [DEFINITIVE ROLE MAPPING] Absolute Source of Truth (11 Roles)
        ROLE_MAP = {
            "PANDIT": UserRole.PANDIT,
            "SUPPLIER": UserRole.SUPPLIER,
            "CATERER": UserRole.CATERER,
            "DECORATOR": UserRole.DECORATOR,
            "DJ_COMPERE": UserRole.DJ_COMPERE,
            "MEDIA": UserRole.MEDIA,
            "TEMPLE_ADMIN": UserRole.TEMPLE_ADMIN,
            "LOCATION_MANAGER": UserRole.LOCATION_MANAGER,
            "COORDINATOR": UserRole.COORDINATOR,
            "MEHENDI_ARTIST": UserRole.MEHENDI_ARTIST,
            "CUSTOMER": UserRole.CUSTOMER
        }
        
        # [ALIAS & ROLE RESOLUTION]
        input_role = role.upper().replace(" ", "_")
        
        # Mapping variations to our 11 keys
        if input_role in ["HOST", "EVENT_HOST", "CUSTOMER"]: 
            role_key = "CUSTOMER"
        elif input_role in ["CATERING", "CATERER"]:
            role_key = "CATERER"
        elif input_role in ["VENUES", "VENUE", "TEMPLE", "TEMPLE_ADMIN"]:
            role_key = "TEMPLE_ADMIN"
        elif input_role in ["SALL_HALL", "BANQUET", "LOCATION_MANAGER"]:
            role_key = "LOCATION_MANAGER"
        else:
            role_key = input_role

        target_role = ROLE_MAP.get(role_key, UserRole.PANDIT) # Default to Pandit
        query_roles = [target_role]
        
        # Special case for Customer/Host alias in DB
        if role_key == "CUSTOMER":
            query_roles = [UserRole.CUSTOMER, UserRole.HOST]

        internal_providers = []
        _internal_db = db or SessionLocal()
        
        # 1. Internal Search (Primary Action - Database First)
        try:
            location_parts = [p.strip() for p in location.split(",")]
            search_filters = []
            for part in location_parts:
                if len(part) > 2:
                    search_filters.append(Profile.location.ilike(f"%{part}%"))
                    search_filters.append(Profile.address_city.ilike(f"%{part}%"))
            
            if not search_filters:
                search_filters = [Profile.location.ilike(f"%{location}%")]

            users_in_role = _internal_db.query(User).join(Profile).filter(
                User.role.in_(query_roles),
                User.status == UserStatus.APPROVED,
                or_(*search_filters)
            ).all()
            
            for user in users_in_role:
                profile = user.profile
                if not profile: continue
                internal_providers.append({
                    "id": user.id,
                    "full_name": profile.full_name or "Unnamed Member",
                    "user_type": role_key,
                    "location": profile.location or profile.address_city or location,
                    "phone_number": profile.phone or user.phone or "",
                    "whatsapp_enabled": profile.whatsapp_enabled if hasattr(profile, 'whatsapp_enabled') else True,
                    "is_platform_member": True,
                    "rating": 5.0,
                    "reviews": 1,
                    "additional_info": profile.role_metadata or {}
                })
            
            # Commit internal discovery log
            log_entry = AgentLog(
                id=str(uuid.uuid4()),
                agent_type="FINDER",
                tool_used="Internal DB (Primary)",
                summary_outcome=f"Database-First search for {role_key}. Found {len(internal_providers)} member(s)."
            )
            _internal_db.add(log_entry)
            _internal_db.commit()
        except Exception as e:
            print(f"Internal Search Error: {e}")
        finally:
            if not db: _internal_db.close()

        # [RESULT PERSISTENCE] Ensure internal results are returned even if external fails or quota hit
        if not include_web:
            return internal_providers

        # 2. External Web Search (Secondary Fallback)
        search_results = []
        try:
            search_results = await self.search_with_serper(
                query=f"{role_upper} {location}", 
                role=role_upper,
                location=location
            )
        except Exception as e:
            print(f"External search fallback suppressed: {e}")
        
        external_providers = []
        for result in search_results[:3]:
            url = result.get("link", "")
            if not url: continue
            
            content = await self.scrape_with_firecrawl(url)
            if not content: continue
            
            provider_data = await self.parse_with_gemini(content, role_upper.lower())
            if not provider_data or not isinstance(provider_data, dict):
                continue
                
            external_providers.append({
                "id": str(uuid.uuid4()),
                "full_name": provider_data.get("name", result.get("title", "Unknown")),
                "user_type": role_upper,
                "location": provider_data.get("location", location),
                "phone_number": provider_data.get("phone", ""),
                "whatsapp_enabled": True, # Assume enabled for external curated results
                "is_platform_member": False,
                "website": url,
                "additional_info": provider_data
            })
            
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

    async def suggest_ritual_supplies(self, intent: str) -> List[Dict[str, Any]]:
        """Sourcing for Supplies: Uses Gemini asynchronously to suggest a ritual-specific checklist."""
        prompt = f"""
        You are the 'Supplies Agent' for MyPandits. 
        Based on the customer's intent: "{intent}", identify the specific Hindu ritual if any.
        Generate a list of 5-10 essential samagri/supplies needed for this ritual.
        Categorize each item (e.g., Essentials, Havan Items, Aarti Items, Decoration).
        
        Return ONLY a JSON list of objects with these keys: 
        "name", "category", "quantity" (if applicable, e.g. "2", "1 packet", "As needed").
        
        Example:
        [
            {{"name": "Coconut", "category": "Essentials", "quantity": "2"}},
            {{"name": "Ghee", "category": "Havan Items", "quantity": "500g"}}
        ]
        
        If the intent is too vague or not a ritual, return an empty list [].
        ONLY RETURN JSON.
        """
        
        try:
            # [UPGRADE] Using agent_supplies_llm from environment
            model = genai.GenerativeModel(settings.agent_supplies_llm)
            response = await model.generate_content_async(prompt)
            text = response.text.strip()
            
            # [FIX] Robust JSON extraction for supplies
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
            elif "[" in text and "]" in text:
                start = text.find("[")
                end = text.rfind("]") + 1
                text = text[start:end]
            
            supplies = json.loads(text)
            if isinstance(supplies, list):
                return supplies
            return []
        except Exception as e:
            print(f"Supplies Agent Error: {e}")
            return []


# Global instance
discovery_agent = DiscoveryAgent()
