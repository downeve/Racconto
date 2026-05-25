// 카메라 종류 — 단일 선택 고정 enum
export const CAMERA_TYPES = [
  { value: 'film',    label: 'Film',    labelKo: '필름',   labelJa: 'フィルム' },
  { value: 'digital', label: 'Digital', labelKo: '디지털', labelJa: 'デジタル' },
  { value: 'mobile',  label: 'Mobile',  labelKo: '모바일', labelJa: 'モバイル' },
  { value: 'mixed',   label: 'Mixed',   labelKo: '혼합',   labelJa: 'ミックス' },
] as const

export type CameraType = typeof CAMERA_TYPES[number]['value']

// 추천 장르 태그 — 자유 입력이지만 자동완성에 활용
export const SUGGESTED_GENRE_TAGS = [
  'wedding', 'travel', 'street', 'portrait', 'landscape',
  'documentary', 'fashion', 'product', 'food', 'architecture',
  'nature', 'sports', 'event', 'family', 'pet',
] as const

export const MAX_TAGS = 5
export const MAX_TAG_LENGTH = 20

/**
 * 클라이언트 측 태그 정규화 — 백엔드의 `_normalize_tags` 와 동일 규칙.
 * 소문자화 + 공백 → '-' + 알파벳/숫자/하이픈 외 제거 + 20자 컷.
 */
export function normalizeTag(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, MAX_TAG_LENGTH)
}
