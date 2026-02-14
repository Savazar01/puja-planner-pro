from sqlalchemy import Column, String, Float, Boolean, DateTime, Integer, Text, ARRAY, JSON
from sqlalchemy.sql import func
from database import Base


class Pandit(Base):
    """ORM model for Pandit records."""
    __tablename__ = "pandits"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    specialization = Column(String)
    location = Column(String, index=True)
    rating = Column(Float, default=0.0)
    reviews = Column(Integer, default=0)
    verified = Column(Boolean, default=False)
    languages = Column(ARRAY(String), default=[])
    price_range = Column(String)
    phone = Column(String)
    email = Column(String)
    website = Column(String)
    additional_info = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Venue(Base):
    """ORM model for Venue records."""
    __tablename__ = "venues"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String, index=True)
    address = Column(Text)
    capacity = Column(Integer)
    venue_type = Column(String)  # Marriage Hall, Community Center, etc.
    amenities = Column(ARRAY(String), default=[])
    price_range = Column(String)
    verified = Column(Boolean, default=False)
    phone = Column(String)
    email = Column(String)
    website = Column(String)
    rating = Column(Float, default=0.0)
    reviews = Column(Integer, default=0)
    additional_info = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Catering(Base):
    """ORM model for Catering service records."""
    __tablename__ = "catering"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String, index=True)
    cuisine_types = Column(ARRAY(String), default=[])
    specialties = Column(ARRAY(String), default=[])  # Satvik, Prasad, Wedding Feast, etc.
    price_per_plate = Column(String)
    min_order = Column(Integer)
    verified = Column(Boolean, default=False)
    phone = Column(String)
    email = Column(String)
    website = Column(String)
    rating = Column(Float, default=0.0)
    reviews = Column(Integer, default=0)
    additional_info = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class SearchCache(Base):
    """ORM model for caching search results."""
    __tablename__ = "search_cache"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    query_hash = Column(String, unique=True, index=True)
    query = Column(String)
    location = Column(String)
    category = Column(String)  # pandits, venues, catering
    results = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
