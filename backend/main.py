import os
import secrets
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from config import settings
from database import engine, get_db
from sqlalchemy.orm import Session
from auth import verify_password
from models import User, UserRole

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for the FastAPI application."""
    logger.info("Starting up application lifecycle...")
    try:
        from database import engine, Base
        from sqlalchemy import text
        from initial_data import init_db
        
        # 1. Create tables if they don't exist
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified.")
        
        # 2. Run manual migrations (resiliently)
        with engine.begin() as conn:
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'FREE'"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 100"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITH TIME ZONE"))
                conn.execute(text("ALTER TABLE events ADD COLUMN IF NOT EXISTS intent_json JSON"))
                conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_street VARCHAR"))
                conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_city VARCHAR"))
                conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_state VARCHAR"))
                conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_country VARCHAR"))
                conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_media JSON DEFAULT '{}'"))
                conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR"))
                conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT"))
                
                # Subscription & Logs
                conn.execute(text("""CREATE TABLE IF NOT EXISTS subscription_requests (id VARCHAR PRIMARY KEY, user_id VARCHAR, target_tier VARCHAR, status VARCHAR, created_at TIMESTAMP)"""))
                conn.execute(text("""CREATE TABLE IF NOT EXISTS agent_logs (id VARCHAR PRIMARY KEY, event_id VARCHAR, agent_type VARCHAR, tool_used VARCHAR, summary_outcome TEXT, created_at TIMESTAMP)"""))
            except Exception as e:
                logger.warning(f"Migration notice (Non-fatal): {e}")
                
        # 3. Synchronize initial data (Admin Credentials)
        init_db()
        logger.info("Initialization sequence completed.")
        
    except Exception as e:
        logger.error(f"CRITICAL: Application failed to initialize: {e}")
        # We don't raise here to allow the process to at least start and serve basic health checks
        # but the app will likely be in a degraded state.
    
    yield
    logger.info("Shutting down application lifecycle...")

app = FastAPI(
    title="Puja Planner Pro API",
    description="Backend API with Discovery Agent",
    version="1.0.0",
    docs_url=None,
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

security = HTTPBasic()

@app.get("/docs", include_in_schema=False)
@app.get("/docs/", include_in_schema=False)
async def custom_swagger_ui_html(credentials: HTTPBasicCredentials = Depends(security), db: Session = Depends(get_db)):
    unauthorized_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password",
        headers={"WWW-Authenticate": "Basic"},
    )
    user = db.query(User).filter(User.email == credentials.username).first()
    if not user or not verify_password(credentials.password, user.hashed_password) or user.role != UserRole.ADMIN:
        raise unauthorized_exc
    return get_swagger_ui_html(openapi_url="/openapi.json", title=app.title + " - Swagger UI")

app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins_list, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

from routes import router
app.include_router(router)

@app.get("/")
async def root():
    return RedirectResponse(url="/docs")

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": str(logging.datetime.now())}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("BACKEND_PORT", 8735)), proxy_headers=True, forwarded_allow_ips="*")
