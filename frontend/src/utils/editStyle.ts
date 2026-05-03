import type { CSSProperties } from 'react'

export interface EditParams {
  rotation?: 0 | 90 | 180 | 270 | null
  crop?: { x: number; y: number; width: number; height: number } | null
  brightness?: number | null
}

export function getEditStyle(
  ep?: EditParams | null,
  previewRotation?: number,
  previewCrop?: { x: number; y: number; width: number; height: number } | null,
  previewBrightness?: number,
): CSSProperties {
  const rotation  = previewRotation  ?? ep?.rotation  ?? 0
  const crop      = previewCrop      !== undefined ? previewCrop : (ep?.crop ?? null)
  const brightness = previewBrightness ?? ep?.brightness ?? 1.0

  const transforms: string[] = []
  const filters: string[] = []

  if (rotation !== 0) {
    transforms.push(`rotate(${rotation}deg)`)
  }

  if (crop) {
    const scaleX = 1 / crop.width
    const scaleY = 1 / crop.height
    const tx = -(crop.x / crop.width) * 100
    const ty = -(crop.y / crop.height) * 100
    transforms.push(`scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`)
    transforms.push(`translate(${tx.toFixed(4)}%, ${ty.toFixed(4)}%)`)
  }

  if (brightness !== 1.0) {
    filters.push(`brightness(${brightness.toFixed(2)})`)
  }

  return {
    transform: transforms.length > 0 ? transforms.join(' ') : undefined,
    transformOrigin: crop ? 'top left' : 'center',
    filter: filters.length > 0 ? filters.join(' ') : undefined,
  }
}

export function nextRotation(ep?: EditParams | null): 0 | 90 | 180 | 270 {
  const current = ep?.rotation ?? 0
  return ((current + 90) % 360) as 0 | 90 | 180 | 270
}

export function prevRotation(ep?: EditParams | null): 0 | 90 | 180 | 270 {
  const current = ep?.rotation ?? 0
  return ((current - 90 + 360) % 360) as 0 | 90 | 180 | 270
}
