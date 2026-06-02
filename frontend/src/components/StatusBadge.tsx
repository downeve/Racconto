import { useTranslation } from 'react-i18next'

// 상태 뱃지 단일 컴포넌트 — 데스크톱·모바일·Electron 동일 색/라벨로 수렴.
// 색은 STEP 0-4 badge 토큰만 사용(raw 팔레트 금지).
const STATUS_CLS: Record<string, string> = {
  in_progress: 'bg-badge-progress-bg text-badge-progress-fg',
  completed:   'bg-badge-done-bg text-badge-done-fg',
  // published 는 solid 잉크 배지. pub-bg(고정 0.18)는 다크 canvas 에 묻히므로 테마 반응
  // 토큰(ink/canvas)으로 — 라이트=어두운 배지+밝은 글자, 다크=밝은 배지+어두운 글자(반전).
  published:   'bg-ink text-canvas',
  archived:    'bg-badge-arch-bg text-badge-arch-fg',
}

export default function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-eyebrow tracking-[0.08em]
                  uppercase ${STATUS_CLS[status] ?? 'bg-canvas-4 text-muted'}`}
    >
      {t(`status.${status}`)}
    </span>
  )
}
