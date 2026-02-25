import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from database import get_db
from models import User, UserRole, UserStatus, SearchUsage
from config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token", auto_error=False)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm="HS256")
    return encoded_jwt

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        return payload
    except JWTError:
        return None

def create_reset_token(email: str):
    expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode = {"sub": email, "type": "reset", "exp": expire}
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm="HS256")
    return encoded_jwt

def verify_reset_token(token: str):
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        if payload.get("type") != "reset":
            return None
        return payload.get("sub")
    except JWTError:
        return None

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if not token:
        return None
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return current_user

def get_current_admin(current_user: User = Depends(get_current_user)):
    if not current_user or current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

def search_bouncer(request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Rate-limits guests to 3 searches/day and sets result caps."""
    if current_user and current_user.status == UserStatus.APPROVED:
        return True # fully authenticated and approved => unlimited
    
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0]
    else:
        client_ip = request.client.host or "unknown_ip"
        
    identifier = str(current_user.id) if current_user else f"ip-{client_ip}"
    
    usage = db.query(SearchUsage).filter(SearchUsage.identifier == identifier).first()
    now_dt = datetime.now(timezone.utc)
    
    if not usage:
        usage = SearchUsage(identifier=identifier, count=1)
        db.add(usage)
        db.commit()
    else:
        if usage.last_reset_at:
            reset_at = usage.last_reset_at
            if reset_at.tzinfo is None:
                reset_at = reset_at.replace(tzinfo=timezone.utc)
            if (now_dt - reset_at).total_seconds() > 86400:
                usage.count = 1
                usage.last_reset_at = func.now()
            else:
                usage.count += 1
                if usage.count > 3:
                    db.commit()
                    raise HTTPException(status_code=429, detail="Search limit reached. Please register to continue.")
        else:
            usage.count += 1
        db.commit()
    return False # guest/pending -> cap results
