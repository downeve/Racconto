import { Link } from 'react-router-dom'

interface Props {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  tone?: 'on-paper' | 'on-ink'
  asLink?: boolean
}

const sizeMap = {
  sm: 'text-body',
  md: 'text-h3',
  lg: 'text-h2',
}

// 색은 의미 토큰만(상위 [data-theme] 스코프가 자동 라이트/다크 매핑).
// on-paper = 일반 표면 위(라이트=어두운 잉크, 다크=밝은 잉크).
// on-ink   = 항상 다크 표면 위(잉크 색 반전 — 라이트박스 등 다크 고정 영역).
const toneMap = {
  'on-paper': 'text-ink',
  'on-ink':   'text-canvas',
}

export function Wordmark({ className = '', size = 'md', tone = 'on-paper', asLink = true }: Props) {
  const inner = (
    <span
      className={`font-serif font-bold ${sizeMap[size]} ${toneMap[tone]} tracking-[0.08em]
                  inline-block translate-y-px
                  ${className}`}
    >
      Racconto
    </span>
  )
  if (!asLink) return inner
  return <Link to="/" className="inline-block">{inner}</Link>
}
