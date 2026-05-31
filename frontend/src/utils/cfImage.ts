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

/**
 * 인라인 갤러리 피드용 responsive srcSet 문자열.
 * 표시 px(sizes) × DPR 에 맞춰 브라우저가 후보 중 최적 variant 를 자동 선택.
 * 호출부는 정확한 렌더 px 을 sizes 로 전달해야 한다(예: `${width}px`).
 * CF 이미지가 아니면 빈 문자열 → src 단독 fallback.
 */
export const cfSrcSet = (imageUrl: string | null | undefined): string => {
  if (!imageUrl || !imageUrl.includes('imagedelivery.net')) return ''
  return [
    `${cfUrl(imageUrl, 'mobile')} 480w`,
    `${cfUrl(imageUrl, 'grid')} 800w`,
    `${cfUrl(imageUrl, 'lightboxmobile')} 1600w`,
    `${cfUrl(imageUrl, 'lightbox')} 2048w`,
    `${cfUrl(imageUrl, 'public')} 3200w`,
  ].join(', ')
}
