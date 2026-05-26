"""
태그 정규화 / 검증 유틸 — Phase 1 커뮤니티 태그 시스템.

원칙:
- 백엔드가 최종 검증자. 클라이언트의 정규화 결과를 절대 신뢰하지 않는다.
- 프론트엔드와 동일한 규칙으로 동작해야 한다 (`frontend/src/utils/tags.ts`).
"""

import re
from typing import List

# 영문 / 한글 음절(가-힣) / 히라가나(ぁ-ゖ) / 가타카나(ァ-ヺ) / CJK 통합 한자(一-龥) / 숫자 / 언더스코어 외 → 하이픈으로 변환
_VALID_CHARS = re.compile(r'[^\w\-가-힣ぁ-ゖァ-ヺ一-龥0-9]')
_MULTIPLE_HYPHENS = re.compile(r'-+')

MAX_TAG_LENGTH = 30
MIN_TAG_LENGTH = 2
MAX_TAGS_PER_PROJECT = 5


def normalize_tag(tag: str) -> str:
    """
    태그를 표준 형식으로 정규화.
    - 소문자 변환 + 앞뒤 공백 제거
    - 비유효 문자(공백 / 특수문자) → 하이픈 변환
    - 연속 하이픈 단일화
    - 양끝 하이픈 trim
    - 최대 30자

    Examples:
        "Film"            -> "film"
        "FILM!"           -> "film"
        "  street photo " -> "street-photo"
        "필름 사진"        -> "필름-사진"
        "kodak gold 200"  -> "kodak-gold-200"
        "---hello---"     -> "hello"
        ""                -> ""
    """
    if not tag:
        return ''
    tag = tag.lower().strip()
    tag = _VALID_CHARS.sub('-', tag)
    tag = _MULTIPLE_HYPHENS.sub('-', tag)
    tag = tag.strip('-')
    return tag[:MAX_TAG_LENGTH]


def normalize_tags(tags: List[str]) -> List[str]:
    """리스트 정규화 + 빈 값 제거 + 중복 제거 + 5개 제한."""
    if not tags:
        return []
    seen: set[str] = set()
    out: List[str] = []
    for t in tags:
        if not isinstance(t, str):
            continue
        norm = normalize_tag(t)
        if not norm or norm in seen:
            continue
        seen.add(norm)
        out.append(norm)
        if len(out) >= MAX_TAGS_PER_PROJECT:
            break
    return out


def validate_tags(tags) -> List[str]:
    """
    API 입력 검증 — 정규화 + 최소 2자 + 5개 초과 입력 거부.

    Raises:
        ValueError: 검증 실패 시
    """
    if tags is None:
        return []
    if not isinstance(tags, list):
        raise ValueError('tags must be a list')
    if len(tags) > MAX_TAGS_PER_PROJECT * 2:
        raise ValueError(f'too many tags (max {MAX_TAGS_PER_PROJECT})')
    normalized = normalize_tags(tags)
    for t in normalized:
        if len(t) < MIN_TAG_LENGTH:
            raise ValueError(f"tag too short: '{t}' (min {MIN_TAG_LENGTH} chars)")
    return normalized
