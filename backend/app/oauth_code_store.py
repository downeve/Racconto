"""
OAuth Authorization Code Exchange — 1회용 code 메모리 저장소.

iOS/Electron 클라이언트가 OAuth redirect URL에 토큰이 노출되는 것을 막기 위해,
콜백에서 1회용 code만 발급하고 별도 POST /auth/exchange 엔드포인트로 토큰을 교환한다.

저장은 프로세스 메모리 dict로 단순화. 단일 uvicorn 워커 전제이므로 충분.
멀티 워커로 확장 시 Redis 등 외부 store로 마이그레이션 필요.

TTL: 60초 — 콜백 → exchange 호출까지 충분히 여유 있음.
"""
from __future__ import annotations

import secrets
import threading
import time
from typing import Optional

_TTL_SECONDS = 60
_lock = threading.Lock()
# code -> (token, expires_at_epoch)
_store: dict[str, tuple[str, float]] = {}


def issue_code(access_token: str) -> str:
    """1회용 code를 발급하고 access_token과 연결해 저장."""
    code = secrets.token_urlsafe(32)
    expires_at = time.time() + _TTL_SECONDS
    with _lock:
        _evict_expired_locked()
        _store[code] = (access_token, expires_at)
    return code


def consume_code(code: str) -> Optional[str]:
    """code로 access_token을 조회 후 즉시 폐기 (1회용).

    만료/미존재/이미 소비된 경우 None 반환.
    """
    with _lock:
        _evict_expired_locked()
        entry = _store.pop(code, None)
        if entry is None:
            return None
        token, expires_at = entry
        if time.time() > expires_at:
            return None
        return token


def _evict_expired_locked() -> None:
    """만료된 항목 정리 — 호출 측이 _lock을 잡고 있다고 가정."""
    now = time.time()
    expired = [c for c, (_, exp) in _store.items() if now > exp]
    for c in expired:
        _store.pop(c, None)
