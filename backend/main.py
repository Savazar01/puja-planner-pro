import os
from urllib.parse import quote_plus

DATABASE_URL = os.getenv("DATABASE_URL")
print(f"DEBUG: Connecting to host: {DATABASE_URL.split('@')[1] if DATABASE_URL else 'None'}")

from fastapi import FastAPI, Request, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
import secrets
from config import settings
from routes import router
from database import engine, Base, get_db
from sqlalchemy.orm import Session
from auth import verify_password
from models import User, UserRole

# Create database tables resiliently
try:
    Base.metadata.create_all(bind=engine)
    print("Database connection and tables initialized successfully.")
    
    # Run inline table alterations (schema patching since create_all doesn't alter)
    from sqlalchemy import text
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'FREE'"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 100"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITH TIME ZONE"))
            print("Successfully migrated users schema for v1.2.3")
            
            # EPIC-3 Profile Additions
            conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_street VARCHAR"))
            conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_city VARCHAR"))
            conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_state VARCHAR"))
            conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_country VARCHAR"))
            conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_media JSON DEFAULT '{}'"))
            conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR"))
            conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT"))
            print("Successfully migrated profiles schema for EPIC-3")
            
            # EPIC-4: Retroactive Token Grant for Legacy Customers
            conn.execute(text("UPDATE users SET token_balance = 1000 WHERE role = 'HOST' AND token_balance < 1000"))
            print("Successfully grandfathered existing Customers into the EPIC-4 Token Economy")
            
            # EPIC-5: Subscription Requests
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS subscription_requests (
                    id VARCHAR PRIMARY KEY,
                    user_id VARCHAR REFERENCES users(id),
                    target_tier VARCHAR NOT NULL,
                    status VARCHAR DEFAULT 'PENDING',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE
                )
            """))
            print("Successfully migrated subscription_requests schema for EPIC-5")
        except Exception as e:
            print(f"Migration notice: {e}")
            
    # Postgres ENUM types must be upgraded outside of a transaction block
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        try:
            conn.execute(text("ALTER TYPE emaileventtype ADD VALUE IF NOT EXISTS 'RESET_PASSWORD'"))
        except Exception:
            pass
            
            
    from initial_data import init_db
    init_db()
except Exception as e:
    print(f"Warning: Database initialization failed on startup: {e}")
    print("The application will continue to run, but database features may be unavailable until it recovers.")

# Initialize FastAPI app
app = FastAPI(
    title="Puja Planner Pro API",
    description="Backend API with Discovery Agent for finding Pandits, Venues, and Catering services",
    version="1.0.0",
    docs_url=None,  # Disabled to provide custom HTTPS route below
    redoc_url=None, # Disabled default Redoc
    openapi_url="/openapi.json",
    root_path="",
)

security = HTTPBasic()

# Custom Swagger UI route requiring Admin via Basic Auth popup
@app.get("/docs", include_in_schema=False)
@app.get("/docs/", include_in_schema=False)
async def custom_swagger_ui_html(credentials: HTTPBasicCredentials = Depends(security), db: Session = Depends(get_db)):
    unauthorized_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password",
        headers={"WWW-Authenticate": "Basic"},
    )
    
    user = db.query(User).filter(User.email == credentials.username).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise unauthorized_exc
        
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Only Admins can view the API Documentation"
        )

    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title=app.title + " - Swagger UI",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
    )

# Custom middleware to force HTTPS scheme for internal links
@app.middleware("http")
async def force_https(request: Request, call_next):
    request.scope["scheme"] = "https"
    return await call_next(request)

# Add ProxyHeadersMiddleware for Coolify/Traefik
app.add_middleware(HTTPSRedirectMiddleware)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add TrustedHostMiddleware
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

# Include routes
app.include_router(router)



@app.get("/")
async def root():
    """Root endpoint. Redirects to /docs"""
    return RedirectResponse(url="/docs")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("BACKEND_PORT"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=settings.debug, proxy_headers=True, forwarded_allow_ips="*")
