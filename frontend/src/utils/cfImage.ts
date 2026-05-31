import { getDeviceType } from './deviceDetect'

export type CfVariant =
  | 'public'
  | 'grid'
  | 'thumb'
  | 'cover'
  | 'mobile'
  | 'lightbox'        // 2048px — 데스크톱/태블릿 lightbox 표시용
  | 'lightboxmobile'  // 1600px — 모바일 lightbox 표시용

export const cfUrl = (
  imageUrl: string | null | undefined,
  variant: CfVariant = 'public'
): string => {
  if (!imageUrl) return ''
  if (!imageUrl.includes('imagedelivery.net')) return imageUrl
  return imageUrl.replace(/\/[^/]+$/, `/${variant}`)
}

/**
 * 디바이스 타입에 따라 적절한 lightbox variant 를 반환.
 * - mobile: lightboxmobile (1600px)
 * - tablet/desktop: lightbox (2048px)
 * SSR/navigator 부재 시 getDeviceType() 이 'desktop' 을 반환하므로 lightbox 가 기본값.
 */
export const getLightboxVariant = (): CfVariant =>
  getDeviceType() === 'mobile' ? 'lightboxmobile' : 'lightbox'

/**
 * 이미지 URL 을 디바이스에 맞는 lightbox variant 로 변환.
 * 원본(public 3200px) 은 다운로드용으로 유지하고 표시만 작은 variant 로 분기.
 */
export const cfLightboxUrl = (imageUrl: string | null | undefined): string =>
  cfUrl(imageUrl, getLightboxVariant())
