export type FontScale = 'sm' | 'md' | 'lg'

const SCALE_PX: Record<FontScale, string> = {
  sm: '14px',
  md: '16px',
  lg: '18px',
}

export function applyFontScale(scale: FontScale) {
  document.documentElement.style.fontSize = SCALE_PX[scale]
  localStorage.setItem('font_scale', scale)
}

export function getStoredFontScale(): FontScale {
  const stored = localStorage.getItem('font_scale')
  if (stored === 'sm' || stored === 'md' || stored === 'lg') return stored
  return 'md'
}
