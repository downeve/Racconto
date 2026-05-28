import type { MouseEvent, PointerEvent } from 'react'

/**
 * 한국어 IME 조합 중 "저장 두 번 클릭" 문제 해결용 공용 핸들러.
 *
 * Safari/WebKit 은 IME 조합 중 첫 클릭의 pointerdown/mousedown/click 을 조합 확정(commit)에
 * 소비해 버튼에 전달하지 않는다(실측 확인). 하지만 pointerup/mouseup 은 정상 발화하며, 그 시점엔
 * 이미 compositionend 가 끝나 input/textarea 의 .value 가 확정돼 있다. 따라서 저장류 버튼은
 * pointerup 에서 트리거하면 1회 클릭으로 동작한다. 키보드(Enter/Space)는 pointerup 이 없으므로
 * click 의 detail===0 일 때만 처리한다(마우스 click 과 중복 방지).
 *
 * 사용: <button {...imeSafeClick(() => handleSave())}>저장</button>
 * (핸들러 내부에서 DOM ref.current.value 를 읽으면 pointerup 시점의 확정값을 얻는다.)
 */
export function imeSafeClick(handler: () => void) {
  return {
    onPointerUp: (e: PointerEvent) => { e.stopPropagation(); handler() },
    onClick: (e: MouseEvent) => { if (e.detail === 0) { e.stopPropagation(); handler() } },
  }
}
