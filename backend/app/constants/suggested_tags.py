"""
추천 태그 / 카메라 종류 메타데이터 — 백엔드 단일 소스.
프론트엔드 `frontend/src/constants/tags.ts` 와 동기화 유지.
운영 데이터 기반으로 주기적 업데이트 (`/admin/stats/tags` 결과 참고).
"""

# 카메라 종류 enum 값 (DB 저장 형태)
VALID_CAMERA_TYPES = {'film', 'digital', 'mobile', 'mixed'}

# UI 표시용 메타데이터 (label_*: 다국어 라벨)
CAMERA_TYPES = [
    {'value': 'film',    'label_en': 'Film',    'label_ko': '필름',   'label_ja': 'フィルム'},
    {'value': 'digital', 'label_en': 'Digital', 'label_ko': '디지털', 'label_ja': 'デジタル'},
    {'value': 'mobile',  'label_en': 'Mobile',  'label_ko': '모바일', 'label_ja': 'モバイル'},
    {'value': 'mixed',   'label_en': 'Mixed',   'label_ko': '혼합',   'label_ja': 'ミックス'},
]

# 추천 장르 태그 — 자동완성/추천에 노출. 강제 아님(사용자 자유 입력 우선).
SUGGESTED_GENRE_TAGS = [
    'portrait', 'landscape', 'wedding', 'travel', 'street',
    'documentary', 'fashion', 'food', 'architecture', 'nature',
    'sports', 'event', 'family', 'pet', 'still-life',
]
