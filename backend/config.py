from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application configuration settings loaded from environment variables."""
    
    # Database
    database_url: str = "postgresql://puja_user:puja_password@localhost:5432/puja_planner"
    
    # API Keys
    serper_api_key: str = ""
    firecrawl_api_key: str = ""
    gemini_api_key: str = ""
    
    # Application
    environment: str = "development"
    debug: bool = True
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    
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
