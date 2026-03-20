from pydantic_settings import BaseSettings
from pydantic import Field, AliasChoices
from typing import List


class Settings(BaseSettings):
    """Application configuration settings loaded from environment variables."""
    
    # Database (Primary Source: DATABASE_URL env var)
    database_url: str = Field("postgresql://puja_user:puja_password@localhost:5432/puja_planner", alias="DATABASE_URL")
    
    # API Keys (Aliased for maximum VPS environment compatibility)
    serper_api_key: str = Field("", alias="SERPER_API_KEY", validation_alias=AliasChoices("SERPER_API_KEY", "SERPAPI_KEY"))
    firecrawl_api_key: str = Field("", alias="FIRECRAWL_API_KEY")
    gemini_api_key: str = Field("", alias="GOOGLE_API_KEY", validation_alias=AliasChoices("GOOGLE_API_KEY", "GEMINI_API_KEY"))
    resend_api_key: str = Field("", alias="RESEND_API_KEY")
    privacy_gate_url: str = "http://localhost:8740"
    
    # Agent Models (Configurable via Coolify)
    agent_planner_llm: str = Field("gemini-3-flash-preview", alias="AGENT_PLANNER_LLM")
    agent_concierge_llm: str = Field("gemini-3-flash-preview", alias="AGENT_CONCIERGE_LLM")
    agent_finder_llm: str = Field("gemini-3-flash-preview", alias="AGENT_FINDER_LLM")
    agent_scribe_llm: str = Field("gemini-3-flash-preview", alias="AGENT_SCRIBE_LLM")
    agent_supplies_llm: str = Field("gemini-3-flash-preview", alias="AGENT_SUPPLIES_LLM")
    
    # Application
    environment: str = "development"
    debug: bool = True
    cors_origins: str = "http://localhost:5173,http://localhost:3000,https://puja.fossone.app,https://www.mypandits.com"
    
    # Auth (Primary Sources: ADMIN_USER, ADMIN_PASSWORD env vars)
    admin_user: str = Field("savazar01@gmail.com", alias="ADMIN_USER")
    admin_password: str = Field("Changeme", alias="ADMIN_PASSWORD")
    secret_key: str = Field("fallback_secret_key_changeme_in_prod", alias="SECRET_KEY")
    access_token_expire_minutes: int = 1440 # 24 hours
    
    # Cache
    cache_expiry_hours: int = 24
    
    class Config:
        env_file = ".env"
        case_sensitive = False
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins string into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


settings = Settings()
