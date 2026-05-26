/**
 * 저장 버튼의 onMouseDown 핸들러:
 * 한국어 IME composition 과 React state update 사이 race 방지.
 * mousedown 시 현재 포커스된 input/textarea 를 강제 blur 시켜
 * composition 즉시 종료 → compositionend → onChange → setState 반영 후
 * 이어지는 click 핸들러가 fresh state 로 실행되도록 보장.
 *
 * 영문 입력에는 영향 없음 (composition 없음 → 단순 no-op).
 */
export const blurActiveInput = () => {
  const el = document.activeElement
  if (el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
    el.blur()
  }
}
