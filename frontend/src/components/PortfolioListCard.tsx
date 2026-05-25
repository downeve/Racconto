import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { cfUrl } from '../utils/cfImage'
import CoverFallback from './CoverFallback'

type Mode = 'explore' | 'portfolio'

interface PortfolioListCardProps {
  mode: Mode
  /** to 와 onClick 중 하나만 의미를 갖는다. onClick 이 있으면 div 래퍼로 동작 */
  href: string
  onClick?: () => void
  coverImageUrl: string | null
  title: string
  /** Explore 전용 — `@username` eyebrow */
  author?: string
  /** Portfolio 전용 — 📍 location 행 */
  location?: string | null
  /** Explore 전용 — 'film' | 'digital' | 'mobile' | 'mixed' */
  cameraType?: string | null
  /** Explore 전용 — 본문에 슬라이스 3개(모바일은 CSS 로 2개) */
  tags?: string[]
  /** Portfolio 전용 — 2-line clamp · 데스크톱만 표시 */
  description?: string | null
  /** Portfolio 전용 — 다크 모드 토큰 적용 */
  darkMode?: boolean
}

/** Cover aspect — Explore feed = 3/2 horizontal, Portfolio collection = 4/5 vertical */
const ASPECT: Record<Mode, string> = {
  explore: 'aspect-[3/2]',
  portfolio: 'aspect-[4/5]',
}

export default function PortfolioListCard({
  mode, href, onClick, coverImageUrl, title,
  author, location, cameraType, tags, description,
  darkMode = false,
}: PortfolioListCardProps) {
  const aspect = ASPECT[mode]
  const subText  = darkMode ? 'text-d-soft'  : 'text-muted'
  const faintTxt = darkMode ? 'text-d-faint' : 'text-faint'
  const coverBg  = darkMode ? 'bg-d-surface' : 'bg-[oklch(0.92_0.012_75)]'

  const inner = (
    <>
      <div className={`${aspect} overflow-hidden ${coverBg}`}>
        {coverImageUrl ? (
          <img
            src={cfUrl(coverImageUrl, 'grid')}
            srcSet={`${cfUrl(coverImageUrl, 'mobile')} 480w, ${cfUrl(coverImageUrl, 'grid')} 800w`}
            sizes="(max-width: 768px) 100vw, 400px"
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
          />
        ) : (
          <CoverFallback title={title} dark={darkMode} />
        )}
      </div>

      {/* Author — Explore only, ABOVE the title (eyebrow position) */}
      {mode === 'explore' && author && (
        <p className={`t-caption mt-3 ${subText}`}>@{author}</p>
      )}

      <h3 className={`font-serif text-[18px] md:text-[22px] tracking-tight font-normal
                      leading-[1.25] [word-break:keep-all]
                      ${mode === 'explore' && author ? 'mt-1' : 'mt-3 md:mt-4'}`}>
        {title}
      </h3>

      {/* Location — Portfolio */}
      {mode === 'portfolio' && location && (
        <p className={`t-loc mt-2 ${subText}`}>
          <MapPin size={10} strokeWidth={1.5} />{location}
        </p>
      )}

      {/* Camera + tags — Explore */}
      {mode === 'explore' && (cameraType || (tags && tags.length > 0)) && (
        <div className={`flex flex-wrap items-center gap-2 mt-2 t-caption ${faintTxt}`}>
          {cameraType && (
            <span className="uppercase tracking-wider">{cameraType}</span>
          )}
          {tags?.slice(0, 3).map((tag, i) => (
            <span key={tag} className={i === 2 ? 'hidden md:inline' : ''}>#{tag}</span>
          ))}
        </div>
      )}

      {/* Description — Portfolio desktop only */}
      {mode === 'portfolio' && description && (
        <p className={`hidden md:line-clamp-2 md:block font-serif text-[14px] leading-[1.55]
                       mt-3 [word-break:keep-all] ${subText}`}>
          {description}
        </p>
      )}
    </>
  )

  if (onClick) {
    return (
      <div
        role="link"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
        className="group block cursor-pointer"
      >
        {inner}
      </div>
    )
  }
  return (
    <Link to={href} className="group block">
      {inner}
    </Link>
  )
}
