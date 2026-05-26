// 카메라 종류 — 단일 선택 고정 enum. 백엔드 VALID_CAMERA_TYPES 와 동기화.
export const CAMERA_TYPES = [
  { value: 'film',    label: 'Film',    labelKo: '필름',   labelJa: 'フィルム' },
  { value: 'digital', label: 'Digital', labelKo: '디지털', labelJa: 'デジタル' },
  { value: 'mobile',  label: 'Mobile',  labelKo: '모바일', labelJa: 'モバイル' },
  { value: 'mixed',   label: 'Mixed',   labelKo: '혼합',   labelJa: 'ミックス' },
] as const

export type CameraType = typeof CAMERA_TYPES[number]['value']

// 추천 장르 태그 — 백엔드 `constants/suggested_tags.py` 와 동기화. 운영 통계 기반 주기 업데이트.
export const SUGGESTED_GENRE_TAGS = [
  'portrait', 'landscape', 'wedding', 'travel', 'street',
  'documentary', 'fashion', 'food', 'architecture', 'nature',
  'sports', 'event', 'family', 'pet', 'still-life',
] as const

// 정규화 함수 / 길이 상수는 `src/utils/tags.ts` 로 이동했음. 호환을 위해 re-export.
export { normalizeTag, MAX_TAG_LENGTH, MAX_TAGS } from '../utils/tags'
