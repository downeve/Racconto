from datetime import datetime, timedelta
from typing import Optional
import logging
import jwt
import bcrypt

logger = logging.getLogger(__name__)
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
import os

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY 환경변수가 설정되지 않았습니다.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7일

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ── Apple refresh token 암호화 (M4) ──────────────────────────────
# Fernet 대칭 암호화. APPLE_TOKEN_KEY 미세팅 시 평문으로 동작(개발/legacy 호환).
# 키 생성: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
_APPLE_TOKEN_KEY = os.getenv("APPLE_TOKEN_KEY")
_apple_fernet = None
if _APPLE_TOKEN_KEY:
    try:
        from cryptography.fernet import Fernet
        _apple_fernet = Fernet(_APPLE_TOKEN_KEY.encode())
    except Exception as e:
        logger.warning("APPLE_TOKEN_KEY 로드 실패 — 평문 fallback: %s", e)
else:
    logger.warning("APPLE_TOKEN_KEY 미설정 — apple_refresh_token 평문 저장 (프로덕션 권장 X)")

_FERNET_PREFIX = "fernet:"


def encrypt_apple_token(token: Optional[str]) -> Optional[str]:
    if not token or not _apple_fernet:
        return token
    return _FERNET_PREFIX + _apple_fernet.encrypt(token.encode()).decode()


def decrypt_apple_token(stored: Optional[str]) -> Optional[str]:
    if not stored:
        return stored
    if not stored.startswith(_FERNET_PREFIX):
        # legacy 평문
        return stored
    if not _apple_fernet:
        # 키 없는데 암호문이 들어옴 — 복호화 불가
        return None
    try:
        return _apple_fernet.decrypt(stored[len(_FERNET_PREFIX):].encode()).decode()
    except Exception:
        return None

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    now = datetime.utcnow()
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": now})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# 기존 verify_token 함수 전체를 아래로 교체
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="AUTH_INVALID_TOKEN",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        token_iat: Optional[int] = payload.get("iat")
        # iat 없는 구 토큰은 거부 (token_invalidated_at 검증을 우회할 수 있음)
        if user_id is None or token_iat is None:
            raise credentials_exception
    except jwt.InvalidTokenError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception

    # 비밀번호 변경 후 발급된 토큰인지 검증
    if user.token_invalidated_at:
        if datetime.utcfromtimestamp(token_iat) < user.token_invalidated_at:
            raise credentials_exception

    return user


def get_optional_current_user(
    token: Optional[str] = Depends(OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)),
    db: Session = Depends(get_db),
) -> Optional[models.User]:
    """인증 헤더가 없거나 잘못되어도 401을 던지지 않고 None 반환."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        token_iat: Optional[int] = payload.get("iat")
        if user_id is None or token_iat is None:
            return None
    except jwt.InvalidTokenError:
        return None

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        return None
    if user.token_invalidated_at:
        if datetime.utcfromtimestamp(token_iat) < user.token_invalidated_at:
            return None
    return user


def get_current_user_id(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> str:
    """JWT에서 user_id 추출 + 토큰 무효화/유저 존재 검증.

    비밀번호 변경 시 발급된 token_invalidated_at 검사를 위해 단일 컬럼 SELECT 추가.
    조회성 엔드포인트에 사용 — full User 객체가 필요하면 get_current_user 사용.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="AUTH_INVALID_TOKEN",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        token_iat: Optional[int] = payload.get("iat")
        # iat 없는 구 토큰은 거부 (token_invalidated_at 검증을 우회할 수 있음)
        if user_id is None or token_iat is None:
            raise credentials_exception
    except jwt.InvalidTokenError:
        raise credentials_exception

    # 유저 존재 + 토큰 무효화 검증 (단일 컬럼 SELECT)
    row = db.query(models.User.token_invalidated_at).filter(
        models.User.id == user_id
    ).first()
    if row is None:
        raise credentials_exception
    invalidated_at = row[0]
    if invalidated_at and datetime.utcfromtimestamp(token_iat) < invalidated_at:
        raise credentials_exception

    return user_id