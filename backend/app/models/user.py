from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


class TokenData(BaseModel):
    """
    토큰 데이터 모델
    """
    username: Optional[str] = None
    exp: Optional[datetime] = None


class Token(BaseModel):
    """
    토큰 응답 모델
    """
    access_token: str
    token_type: str


class UserBase(BaseModel):
    """
    사용자 기본 모델
    """
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool = True
    is_admin: bool = False


class UserCreate(UserBase):
    """
    사용자 생성 모델
    """
    password: str


class UserUpdate(BaseModel):
    """
    사용자 정보 업데이트 모델
    """
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class User(UserBase):
    """
    사용자 응답 모델
    """
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    preferences: Optional[dict] = None

    class Config:
        orm_mode = True


class UserInDB(UserBase):
    """
    데이터베이스 저장용 사용자 모델
    """
    id: Optional[str] = None
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    preferences: Optional[dict] = None 