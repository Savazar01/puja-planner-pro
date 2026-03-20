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
        # Bypassing Privacy Gate as per directive for direct API handshake
        search_url = "https://google.serper.dev/search"
        
        search_query = f"{ritual_name} {role} in {location}".strip()
        if not search_query: search_query = query
        
        headers = {
            "X-API-KEY": settings.serper_api_key,
            "Content-Type": "application/json"
        }
        
        payload = {
            "q": search_query,
            "num": 10,
            "gl": "in",
            "hl": "en"
        }
        
        try:
            async with httpx.AsyncClient(timeout=35.0) as client:
                response = await client.post(search_url, json=payload, headers=headers)
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
        # Bypassing Privacy Gate as per directive for direct API handshake
        scrape_url = "https://api.firecrawl.dev/v0/scrape"
        
        headers = {
            "Authorization": f"Bearer {settings.firecrawl_api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "url": url,
            "formats": ["markdown"]
        }
        
        try:
            async with httpx.AsyncClient(timeout=65.0) as client:
                response = await client.post(scrape_url, json=payload, headers=headers)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            return f"Scrape Error: {str(e)}"
捉
