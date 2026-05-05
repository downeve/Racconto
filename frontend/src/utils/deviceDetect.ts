// CSR 전용. isMobileDevice/isTabletDevice는 getDeviceType()을 통해서만 안전하게 호출할 것.
export const isMobileDevice = (): boolean =>
  /Android.*Mobile|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i
    .test(navigator.userAgent)

export const isTabletDevice = (): boolean =>
  /iPad/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
  (/Android/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent))

const safeNavigator = typeof navigator !== 'undefined' ? navigator : null

export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  if (!safeNavigator) return 'desktop'
  if (isMobileDevice()) return 'mobile'
  if (isTabletDevice()) return 'tablet'
  return 'desktop'
}
