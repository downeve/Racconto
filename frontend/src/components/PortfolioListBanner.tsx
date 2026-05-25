interface PortfolioListBannerProps {
  /** "Discover" | "Portfolio · 6 projects" */
  eyebrow: string
  /** "Photographers" | "@mira" */
  title: string
  /** 옵셔셔블 부제 — Explore 는 일반, Portfolio 는 italic */
  subtitle?: string
  subtitleItalic?: boolean
  darkMode?: boolean
  /** eyebrow 글씨 한 단계 키움 (11px → 12px caption). 기본은 t-eyebrow */
  largerEyebrow?: boolean
}

/**
 * 좌정렬 배너 — Explore × Portfolio 목록 화면이 공유하는 헤더.
 * eyebrow → 38px serif h1 → 옵셔널 부제(max-w-540px).
 */
export default function PortfolioListBanner({
  eyebrow, title, subtitle, subtitleItalic = false, darkMode = false,
  largerEyebrow = false,
}: PortfolioListBannerProps) {
  const subText = darkMode ? 'text-d-soft' : 'text-muted'
  // subtitle 없을 때는 검색바/리스트와 자연스러운 간격 유지를 위해 mb 축소
  const marginBottom = subtitle ? 'mb-12 md:mb-14' : 'mb-6 md:mb-8'
  const eyebrowClass = largerEyebrow
    ? 'font-mono text-caption tracking-[0.18em] uppercase font-medium'
    : 't-eyebrow'
  return (
    <header className={marginBottom}>
      <p className={`${eyebrowClass} mb-2 ${subText}`}>{eyebrow}</p>
      <h1 className="font-serif font-normal leading-[1.05] tracking-[-0.02em]"
          style={{ fontSize: 'clamp(24px, 5vw, 38px)' }}>
        {title}
      </h1>
      {subtitle && (
        <p className={`font-serif text-[14px] md:text-[16px] leading-[1.65] mt-3 max-w-[540px]
                       [word-break:keep-all] ${subText}
                       ${subtitleItalic ? 'italic' : ''}`}>
          {subtitle}
        </p>
      )}
    </header>
  )
}
