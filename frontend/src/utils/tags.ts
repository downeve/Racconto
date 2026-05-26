/**
 * 태그 정규화 / 검증 — 백엔드 `app/utils/tags.py` 와 동일 규칙.
 * 백엔드가 최종 검증자이지만, 프론트에서 미리 정규화하면 사용자에게 즉각 피드백 가능.
 */

const VALID_CHARS = /[^\w\-가-힣ぁ-ゖァ-ヺ一-龥0-9]/g
const MULTIPLE_HYPHENS = /-+/g

export const MAX_TAG_LENGTH = 30
export const MIN_TAG_LENGTH = 2
export const MAX_TAGS = 5

export function normalizeTag(tag: string): string {
  if (!tag) return ''
  return tag
    .toLowerCase()
    .trim()
    .replace(VALID_CHARS, '-')
    .replace(MULTIPLE_HYPHENS, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_TAG_LENGTH)
}

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of tags) {
    const n = normalizeTag(t)
    if (!n || n.length < MIN_TAG_LENGTH || seen.has(n)) continue
    seen.add(n)
    out.push(n)
    if (out.length >= MAX_TAGS) break
  }
  return out
}
