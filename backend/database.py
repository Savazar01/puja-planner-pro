import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

# Create database engine using centralized settings
# Use pool_pre_ping for resilience against disconnected connections in Docker
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=50,         # Increased from 20 to handle more concurrent local queries
    max_overflow=100,      # Increased from 50
    pool_timeout=10,      # Slightly more aggressive timeout
    pool_recycle=1800,    # Recycle connections every 30 mins to prevent stale DB handles
    connect_args={
        "connect_timeout": 10  # 10s TCP timeout for initial connection
    }
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for ORM models
Base = declarative_base()


def get_db():
    """Dependency function to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
