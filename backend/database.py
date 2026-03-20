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
    pool_size=20,
    max_overflow=50,
    pool_timeout=15
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
