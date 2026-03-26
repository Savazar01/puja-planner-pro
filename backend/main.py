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
import asyncio
import anyio
from datetime import datetime

from config import settings
from database import engine, get_db
from sqlalchemy.orm import Session
from auth import verify_password
from models import User, UserRole

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global readiness state
GLOBAL_READY = False
INIT_ERROR = None

def run_initialization():
    """Heavy DB tasks running in background to prevent startup timeouts."""
    global GLOBAL_READY, INIT_ERROR
    logger.info("Background initialization started...")
    try:
        from database import engine, Base
        from sqlalchemy import text
        from initial_data import init_db
        
        # 1. Create tables if they don't exist
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified.")
        
        # 1.5 Update Postgres ENUMs (Must be outside transaction block)
        try:
            with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
                for role in ['CATERER', 'DECORATOR', 'DJ_COMPERE', 'LOCATION_MANAGER', 'MEDIA', 'MEHENDI_ARTIST']:
                    try:
                        conn.execute(text(f"ALTER TYPE userrole ADD VALUE '{role}'"))
                    except Exception:
                        pass
        except Exception as enum_err:
            logger.warning(f"Enum sync skipped (Non-fatal, may use SQLite): {enum_err}")
        
        # 2. Run manual migrations (resiliently)
        with engine.begin() as conn:
            try:
                # Add columns if missing (Check system tables first to be fast/silent)
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'FREE'"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 100"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITH TIME ZONE"))
                conn.execute(text("ALTER TABLE events ADD COLUMN IF NOT EXISTS intent_json JSON"))
                
                # Profile fields
                conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_street VARCHAR"))
                conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_city VARCHAR"))
                conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_state VARCHAR"))
                conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_country VARCHAR"))
                conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_media JSON DEFAULT '{}'"))
                conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR"))
                conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT"))
                
                # EPIC-4 Global Registry & Enhanced Info
                conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS title VARCHAR"))
                conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS languages VARCHAR"))
                conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_type VARCHAR"))
                conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_zip VARCHAR"))
                
                # Custom tables
                conn.execute(text("""CREATE TABLE IF NOT EXISTS subscription_requests (id VARCHAR PRIMARY KEY, user_id VARCHAR, target_tier VARCHAR, status VARCHAR, created_at TIMESTAMP)"""))
                conn.execute(text("""CREATE TABLE IF NOT EXISTS agent_logs (id VARCHAR PRIMARY KEY, event_id VARCHAR, agent_type VARCHAR, tool_used VARCHAR, summary_outcome TEXT, created_at TIMESTAMP)"""))
            except Exception as mig_err:
                logger.warning(f"Background Migration notice (Non-fatal): {mig_err}")
                
        # 3. Synchronize initial data (Admin Credentials)
        init_db()
        GLOBAL_READY = True
        logger.info("Background initialization sequence completed successfully.")
        
    except Exception as e:
        INIT_ERROR = str(e)
        logger.error(f"CRITICAL: Background initialization failed: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for the FastAPI application."""
    logger.info("Starting up application...")
    # Trigger initialization in background task - DO NOT BLOCK
    # [FIX] Run blocking initialization in a separate thread to unblock the main loop
    # This specifically addresses the 30-second login timeout during cold starts
    print("Starting background initialization (Non-blocking)...")
    asyncio.create_task(anyio.to_thread.run_sync(run_initialization))
    yield
    logger.info("Shutting down application...")

app = FastAPI(
    title="Puja Planner Pro API",
    version="1.1.0",
    lifespan=lifespan
)

@app.middleware("http")
async def timeout_middleware(request: Request, call_next):
    """Global 25s timeout to prevent proxy 504 errors."""
    try:
        # Resolve 504 errors by closing backend connection at 25s
        # This gives a controlled 408 response instead of a proxy 504
        async with anyio.fail_after(25):
            return await call_next(request)
    except TimeoutError:
        return anyio.lowlevel.checkpoint_if_cancelled()
    except TimeoutException: # anyio
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail="Request processing exceeded 25s safety limit."
        )

# Resolve "Failed to fetch" by ensuring production domain is in origins
origins = settings.cors_origins_list
if "https://puja.fossone.app" not in origins:
    origins.append("https://puja.fossone.app")

app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

@app.middleware("http")
async def timeout_middleware(request: Request, call_next):
    """Global 25s timeout to prevent proxy 504 errors on long auth/search tasks."""
    try:
        # anyio.fail_after is a synchronous context manager in most versions
        with anyio.fail_after(25):
            return await call_next(request)
    except TimeoutError:
        return anyio.lowlevel.checkpoint_if_cancelled()
    except Exception as e:
        # Catch any Anyio timeout exception by name string for resilience
        if "TimeoutException" in type(e).__name__:
             raise HTTPException(
                status_code=status.HTTP_408_REQUEST_TIMEOUT,
                detail="Request processing exceeded 25s safety limit."
            )
        raise e

from routes import router
app.include_router(router)

@app.get("/")
async def root():
    return RedirectResponse(url="/docs")

@app.get("/health")
async def health():
    """Consolidated health check with initialization status."""
    return {
        "status": "ok" if GLOBAL_READY else "initializing",
        "ready": GLOBAL_READY,
        "error": INIT_ERROR,
        "timestamp": str(datetime.now())
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("BACKEND_PORT", 8735)), proxy_headers=True, forwarded_allow_ips="*")
