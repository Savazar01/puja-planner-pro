from sqlalchemy import Column, String, Float, Boolean, DateTime, Integer, Text, ARRAY, JSON, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    HOST = "HOST"
    PANDIT = "PANDIT"
    EVENT_MANAGER = "EVENT_MANAGER"
    TEMPLE_ADMIN = "TEMPLE_ADMIN"
    SUPPLIER = "SUPPLIER"
    OTHER = "OTHER"

class UserStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PENDING_DELETION = "PENDING_DELETION"

class SubscriptionTier(str, enum.Enum):
    FREE = "FREE"
    SILVER = "SILVER"
    GOLD = "GOLD"
    PLATINUM = "PLATINUM"

class EmailEventType(str, enum.Enum):
    WELCOME_USER = "WELCOME_USER"
    VENDOR_WAITING = "VENDOR_WAITING"
    VENDOR_APPROVED = "VENDOR_APPROVED"

class User(Base):
    """ORM model for Users."""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.HOST)
    status = Column(Enum(UserStatus), default=UserStatus.PENDING)
    subscription_tier = Column(Enum(SubscriptionTier), default=SubscriptionTier.FREE)
    token_balance = Column(Integer, default=100)
    deletion_requested_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    profile = relationship("Profile", back_populates="user", uselist=False)

class Profile(Base):
    """ORM model for User Profiles."""
    __tablename__ = "profiles"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    full_name = Column(String)
    phone = Column(String)
    whatsapp = Column(String, nullable=False)
    location = Column(String)
    role_metadata = Column(JSON, default={})
    
    user = relationship("User", back_populates="profile")

class SearchUsage(Base):
    """ORM model for tracking guest searches."""
    __tablename__ = "search_usage"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    identifier = Column(String, unique=True, index=True)
    count = Column(Integer, default=0)
    last_reset_at = Column(DateTime(timezone=True), server_default=func.now())


class EmailTemplate(Base):
    """ORM model for dynamic email templates."""
    __tablename__ = "email_templates"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(Enum(EmailEventType), unique=True, index=True, nullable=False)
    subject = Column(String, nullable=False)
    body_html = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


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
