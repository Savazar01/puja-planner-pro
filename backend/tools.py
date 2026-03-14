import httpx
from typing import Type, Optional
from pydantic import BaseModel, Field
from langchain.tools import BaseTool
from config import settings

class SearchInput(BaseModel):
    query: str = Field(description="The search query for discovery.")
    location: str = Field(description="The location to search in.")
    ritual_name: Optional[str] = Field(description="The name of the ritual.")
    role: Optional[str] = Field(description="The role to search for (e.g. PANDIT, VENUE).")

class SerperSearchTool(BaseTool):
    name = "serper_search"
    description = "Search for ritual providers using Serper.dev via Privacy Gate."
    args_schema: Type[BaseModel] = SearchInput

    def _run(self, query: str, location: str, ritual_name: str = "", role: str = ""):
        # Synchronous execution if needed, but we prefer async
        import asyncio
        return asyncio.run(self._arun(query, location, ritual_name, role))

    async def _arun(self, query: str, location: str, ritual_name: str = "", role: str = ""):
        gate_url = f"{settings.privacy_gate_url}/outbound"
        
        search_query = f"{ritual_name} {role} in {location}".strip()
        if not search_query: search_query = query
        
        payload = {
            "url": "https://google.serper.dev/search",
            "method": "POST",
            "headers": {
                "X-API-KEY": settings.serper_api_key,
                "Content-Type": "application/json",
                "X-Agent-Context": "FINDER",
                "X-Agent-Key": "AGENT_FINDER_LLM" # Injecting key reference as per directive
            },
            "payload": {
                "q": search_query,
                "num": 10,
                "gl": "in",
                "hl": "en"
            }
        }
        
        try:
            async with httpx.AsyncClient(timeout=35.0) as client:
                response = await client.post(gate_url, json=payload)
                if response.status_code == 401:
                    return "Search failed: Authentication Error via Privacy Gate."
                response.raise_for_status()
                return response.json()
        except Exception as e:
            return f"Search Error: {str(e)}"

class ScrapeInput(BaseModel):
    url: str = Field(description="The URL to scrape.")

class FirecrawlScrapeTool(BaseTool):
    name = "firecrawl_scrape"
    description = "Scrape content from a URL using Firecrawl via Privacy Gate."
    args_schema: Type[BaseModel] = ScrapeInput

    def _run(self, url: str):
        import asyncio
        return asyncio.run(self._arun(url))

    async def _arun(self, url: str):
        gate_url = f"{settings.privacy_gate_url}/outbound"
        payload = {
            "url": "https://api.firecrawl.dev/v0/scrape",
            "method": "POST",
            "headers": {
                "Authorization": f"Bearer {settings.firecrawl_api_key}",
                "Content-Type": "application/json",
                "X-Agent-Context": "FINDER",
                "X-Agent-Key": "AGENT_FINDER_LLM"
            },
            "payload": {
                "url": url,
                "formats": ["markdown"]
            }
        }
        
        try:
            async with httpx.AsyncClient(timeout=65.0) as client:
                response = await client.post(gate_url, json=payload)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            return f"Scrape Error: {str(e)}"
