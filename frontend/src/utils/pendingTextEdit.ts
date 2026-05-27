/**
 * StoryBlocks 의 TEXT 블록 인라인 편집기에서, 다른 위치로 편집을 옮길 때
 * 기존 편집 내용이 사라지지 않도록 자동 저장하는 모듈 레벨 레지스트리.
 *
 * 동시에 활성화되는 TEXT 편집은 1개뿐이지만, 여러 StoryChapter 인스턴스가
 * 각자의 state 를 가지므로 단일 위치에서 추적해야 cross-chapter 자동 저장이 가능.
 *
 * 사용 패턴:
 * - 편집 시작/textDraft 변경 시 setPendingTextEdit(saveFn) 로 최신 저장 함수 등록.
 * - 다른 TEXT 편집 / 새 챕터 추가 / 인서트 텍스트 등 새로운 편집 진입점에서
 *   await flushPendingTextEdit() 호출하여 직전 편집을 먼저 저장.
 * - 정상 저장 / cancel 시 setPendingTextEdit(null) 로 해제.
 */

let pending: (() => Promise<void>) | null = null

export const setPendingTextEdit = (saveFn: (() => Promise<void>) | null) => {
  pending = saveFn
}

export const flushPendingTextEdit = async () => {
  const fn = pending
  if (!fn) return
  pending = null
  try {
    await fn()
  } catch (err) {
    // 자동 저장 실패는 사용자의 새 동작을 막지 않도록 삼킨다 (콘솔에는 남김)
    console.error('pending text edit auto-save failed:', err)
  }
}
