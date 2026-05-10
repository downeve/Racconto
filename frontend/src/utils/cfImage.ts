export type CfVariant = 'public' | 'grid' | 'thumb' | 'cover'

export const cfUrl = (
  imageUrl: string | null | undefined,
  variant: CfVariant = 'public'
): string => {
  if (!imageUrl) return ''
  if (!imageUrl.includes('imagedelivery.net')) return imageUrl
  return imageUrl.replace(/\/[^/]+$/, `/${variant}`)
}
