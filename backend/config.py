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
    resend_api_key: str = ""
    privacy_gate_url: str = "http://localhost:8740"
    
    # Application
    environment: str = "development"
    debug: bool = True
    cors_origins: str = "http://localhost:5173,http://localhost:3000,https://puja.fossone.app,https://www.mypandits.com"
    
    # Auth
    admin_user: str = "savazar01@gmail.com"
    admin_password: str = "Changeme"
    secret_key: str = "fallback_secret_key_changeme_in_prod"
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
        
    @property
    def resolved_db_url(self) -> str:
        """Resolve database URL with fallback IP for Coolify network mapping."""
        url = self.database_url
        if self.environment == "production":
            import socket
            from urllib.parse import urlparse
            
            try:
                # Try primary coolify container host
                target = "postgres-wkkkc44k0wkw4g04c0ck8skg-090457243218"
                socket.gethostbyname(target)
                host = target
            except Exception:
                # Fallback to internal IP from network
                host = "10.0.5.2"
                
            p = urlparse(url)
            if "@" in p.netloc:
                creds = p.netloc.split("@")[0]
                url = url.replace(p.netloc, f"{creds}@{host}:5432")
        return url


settings = Settings()
