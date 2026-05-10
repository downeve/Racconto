import { useEffect, useRef } from 'react'

interface PhotoRevealProps {
  children: React.ReactNode
  delay?: number
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
}

export default function PhotoReveal({
  children,
  delay = 0,
  className = '',
  style,
  onClick,
}: PhotoRevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => el.classList.add('photo-enter'), delay)
          obs.disconnect()
        }
      },
      { threshold: 0.05 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [delay])

  return (
    <div ref={ref} className={`photo-reveal-init${className ? ' ' + className : ''}`} style={style} onClick={onClick}>
      {children}
    </div>
  )
}
