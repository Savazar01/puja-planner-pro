from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from config import settings
from routes import router
from database import engine, Base

# Create database tables resiliently
try:
    Base.metadata.create_all(bind=engine)
    print("Database connection and tables initialized successfully.")
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
    servers=[{"url": "https://pujaapi.fossone.app", "description": "Production"}]
)

# Custom Swagger UI route using CDN to enforce HTTPS
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
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
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])
app.add_middleware(HTTPSRedirectMiddleware)

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
    uvicorn.run(app, host="0.0.0.0", port=8735, reload=settings.debug)
