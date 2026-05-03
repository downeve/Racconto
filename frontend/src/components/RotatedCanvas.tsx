import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'

interface RotatedCanvasProps {
  src: string
  rotation: 90 | 270
  brightness?: number | null
  style?: CSSProperties
  onClick?: (e: React.MouseEvent<HTMLCanvasElement>) => void
}

export function RotatedCanvas({ src, rotation, brightness, style, onClick }: RotatedCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const nw = img.naturalWidth
      const nh = img.naturalHeight
      canvas.width = nh
      canvas.height = nw
      const ctx = canvas.getContext('2d')!
      if (rotation === 90) {
        ctx.translate(nh, 0)
        ctx.rotate(Math.PI / 2)
      } else {
        ctx.translate(0, nw)
        ctx.rotate(-Math.PI / 2)
      }
      ctx.drawImage(img, 0, 0, nw, nh)
    }
    img.src = src
  }, [src, rotation])

  return (
    <canvas
      ref={canvasRef}
      style={{
        maxWidth: '100%',
        maxHeight: '100%',
        cursor: 'default',
        filter: brightness != null && brightness !== 1.0 ? `brightness(${brightness.toFixed(2)})` : undefined,
        ...style,
      }}
      onClick={onClick}
    />
  )
}
