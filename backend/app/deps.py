from fastapi import Depends, HTTPException, status, Request, Header
from fastapi.security import OAuth2PasswordBearer, HTTPBearer
from typing import Optional, Dict, Any, Generator
from jose import jwt, JWTError
from datetime import datetime, timedelta
import os
from pymongo import MongoClient
from dotenv import load_dotenv
import logging
from functools import lru_cache
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pydantic import ValidationError, BaseModel

from .models.user import User, TokenData, UserInDB
from .core.config import settings

# 환경 변수 로드
load_dotenv()

# MongoDB 연결 설정
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "nottoday")

# JWT 설정
SECRET_KEY = os.getenv("SECRET_KEY", "이것은매우안전한시크릿키입니다변경하세요")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# 보안 스키마 설정
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)
security = HTTPBearer()

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB 클라이언트 싱글톤
@lru_cache
def get_mongo_client():
    try:
        client = MongoClient(MONGODB_URI)
        # 연결 테스트
        client.admin.command('ping')
        logger.info("MongoDB에 성공적으로 연결되었습니다.")
        return client
    except Exception as e:
        logger.error(f"MongoDB 연결 오류: {e}")
        raise Exception(f"데이터베이스 연결 실패: {e}")

# 데이터베이스 의존성
def get_db() -> Generator:
    """
    요청당 동기식 MongoDB 연결을 제공하는 의존성
    """
    try:
        yield get_mongo_client()[DB_NAME]
    finally:
        pass  # 연결 풀을 사용하므로 명시적 닫기 불필요

# 데이터베이스 클라이언트
mongo_client = MongoClient(MONGODB_URI)
async_mongo_client = AsyncIOMotorClient(MONGODB_URI)

# 데이터베이스 객체
db = mongo_client[DB_NAME]
async_db = async_mongo_client[DB_NAME]

async def get_async_db():
    """
    요청당 비동기식 MongoDB 연결을 제공하는 의존성
    """
    return async_db

# 인증 관련 모델
class TokenData(BaseModel):
    username: Optional[str] = None
    exp: Optional[datetime] = None

# 토큰 생성 함수
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# 현재 인증된 사용자 가져오기 (JWT 토큰 기반)
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db = Depends(get_async_db)
) -> User:
    """
    현재 인증된 사용자를 반환하는 의존성 함수
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증 정보를 확인할 수 없습니다",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # JWT 토큰 복호화
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        
        token_data = TokenData(username=username, exp=payload.get("exp"))
    except (JWTError, ValidationError):
        raise credentials_exception
    
    # 토큰 만료 확인
    if token_data.exp and datetime.utcnow() > token_data.exp:
        logger.warning(f"만료된 토큰 접근 시도: {username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 만료되었습니다",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 사용자 조회
    user = await db.users.find_one({"username": token_data.username})
    if user is None:
        raise credentials_exception
    
    # MongoDB ObjectId 처리
    user["id"] = str(user["_id"])
    del user["_id"]
    
    return User(**user)

# API 키 인증
async def get_api_key_user(api_key: str = Header(..., alias="X-API-Key"), db = Depends(get_db)):
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API 키가 필요합니다",
        )
    
    # API 키로 사용자 조회
    api_key_info = db.api_keys.find_one({"key": api_key})
    if not api_key_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 API 키입니다",
        )
    
    # 만료 확인
    if "expires_at" in api_key_info and api_key_info["expires_at"] < datetime.now():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API 키가 만료되었습니다",
        )
    
    # 사용자 정보 조회
    user = db.users.find_one({"id": api_key_info["user_id"]})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API 키에 연결된 사용자를 찾을 수 없습니다",
        )
    
    # MongoDB _id 필드 제거
    user.pop("_id", None)
    
    return user

# 선택적 인증 (API 키 또는 JWT 토큰)
async def get_optional_user(
    request: Request,
    db = Depends(get_db)
) -> Optional[Dict[str, Any]]:
    # 헤더에서 토큰 또는 API 키 확인
    authorization = request.headers.get("Authorization")
    api_key = request.headers.get("X-API-Key")
    
    if not authorization and not api_key:
        return None
    
    try:
        if api_key:
            # API 키 인증 시도
            return await get_api_key_user(api_key, db)
        elif authorization and authorization.startswith("Bearer "):
            # JWT 토큰 인증 시도
            token = authorization.replace("Bearer ", "")
            return await get_current_user(token, db)
    except HTTPException:
        # 인증 실패해도 None 반환 (선택적 인증)
        return None
    
    return None

# 관리자 확인
def get_admin_user(current_user: Dict[str, Any] = Depends(get_current_user)):
    if not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 작업을 수행할 권한이 없습니다. 관리자 권한이 필요합니다.",
        )
    return current_user

# 현재 활성 사용자 가져오기 (활성 상태 확인)
async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    활성 상태인 사용자인지 확인
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="비활성화된 사용자입니다",
        )
    return current_user

async def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    관리자 권한이 있는 사용자인지 확인
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 작업을 수행할 권한이 없습니다",
        )
    return current_user

def check_auth_key(api_key: str = Depends(oauth2_scheme)) -> str:
    """
    장치 또는 서비스 인증을 위한 API 키 확인
    """
    if api_key != settings.API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 API 키",
        )
    return api_key

# 로깅 미들웨어를 위한 의존성
def get_request_id() -> str:
    """요청 추적을 위한, 고유 ID 생성"""
    import uuid
    return str(uuid.uuid4())

# AI 모델 관련 의존성
async def get_ai_service():
    """AI 서비스 인스턴스 가져오기"""
    from .services.ai_service import AIService
    return AIService()

# 캐싱 의존성
class CacheManager:
    def __init__(self):
        self.cache = {}
        self.ttl = {}
    
    def get(self, key: str) -> Any:
        now = datetime.utcnow()
        if key in self.cache and (key not in self.ttl or now < self.ttl[key]):
            return self.cache[key]
        return None
    
    def set(self, key: str, value: Any, ttl_seconds: int = 3600):
        self.cache[key] = value
        if ttl_seconds > 0:
            self.ttl[key] = datetime.utcnow() + timedelta(seconds=ttl_seconds)
    
    def delete(self, key: str):
        if key in self.cache:
            del self.cache[key]
        if key in self.ttl:
            del self.ttl[key]
    
    def clear(self):
        self.cache.clear()
        self.ttl.clear()

# 글로벌 캐시 인스턴스
cache_manager = CacheManager()

def get_cache_manager():
    return cache_manager 