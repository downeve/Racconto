import { useEffect, useRef, useState, useCallback } from 'react'

export function useLightboxZoom(active: number | null) {
  const [scale, setScale] = useState(1)
  const [origin, setOrigin] = useState({ x: 50, y: 50 })
  const imgRef = useRef<HTMLImageElement | null>(null)

  // 리셋
  const reset = useCallback(() => { setScale(1); setOrigin({ x: 50, y: 50 }) }, [])

  // 슬라이드 변경 시 리셋
  useEffect(() => { reset() }, [active])

  // 휠 줌
  useEffect(() => {
    if (active === null) return
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      setScale(s => Math.max(1, Math.min(5, s * (e.deltaY < 0 ? 1.15 : 0.87))))
    }
    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [active])

  // 키보드 줌
  useEffect(() => {
    if (active === null) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') setScale(s => Math.min(5, s * 1.25))
      if (e.key === '-') setScale(s => Math.max(1, s * 0.8))
      if (e.key === '0') reset()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [active, reset])

  // 더블클릭 줌
  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (scale > 1) { reset(); return }
    const rect = e.currentTarget.getBoundingClientRect()
    const ox = ((e.clientX - rect.left) / rect.width) * 100
    const oy = ((e.clientY - rect.top) / rect.height) * 100
    setOrigin({ x: ox, y: oy })
    setScale(2.5)
  }, [scale, reset])

  // 핀치 줌 (터치)
  const lastDistRef = useRef<number | null>(null)
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 2) return
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    const dist = Math.hypot(dx, dy)
    if (lastDistRef.current !== null) {
      const factor = dist / lastDistRef.current
      setScale(s => Math.max(1, Math.min(5, s * factor)))
    }
    lastDistRef.current = dist
  }, [])
  const handleTouchEnd = useCallback(() => { lastDistRef.current = null }, [])

  const imgStyle = scale > 1
    ? { transform: `scale(${scale})`, transformOrigin: `${origin.x}% ${origin.y}%`, transition: 'transform 0.15s ease-out', cursor: 'zoom-out' }
    : { transform: 'scale(1)', transition: 'transform 0.15s ease-out', cursor: 'zoom-in' }

  return { scale, reset, imgRef, imgStyle, handleDoubleClick, handleTouchMove, handleTouchEnd }
}
