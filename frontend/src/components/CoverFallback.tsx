interface CoverFallbackProps {
  title: string
}

/**
 * 커버 이미지 fallback — 의미 토큰만 사용해 상위 [data-theme] 스코프 라이트/다크 자동 매핑.
 */
export default function CoverFallback({ title }: CoverFallbackProps) {
  return (
    <div className="w-full h-full flex items-end p-6 bg-gradient-to-br from-canvas-3 to-canvas-4">
      <div>
        <p className="t-eyebrow mb-1 text-faint">Untitled cover</p>
        <p className="font-serif text-[1.375rem] leading-tight font-light [word-break:keep-all] text-ink-2/70">
          {title}
        </p>
      </div>
    </div>
  )
}
