import type { CSSProperties } from 'react'
import { useState, useRef } from 'react'
import MarkdownRenderer from './MarkdownRenderer'
import { cfUrl } from '../utils/cfImage'
import PhotoReveal from './PhotoReveal'

export const PORTFOLIO_WIDTH = 896  // max-w-4xl. 폭 변경 시 이 값과 className 함께 수정
export const PORTFOLIO_GAP = {
  grid: 14,  // 3열 — 셀폭의 ~5%
  wide: 20,  // 2열 — 셀폭의 ~5%, SIDE(24~28)와도 일치
} as const

// ── 공통 타입 ──────────────────────────────────────────────

export interface PortfolioPhoto {
  id?: string
  image_url?: string
  caption?: string | null
}

export interface PortfolioChapterItem {
  item_type: 'PHOTO' | 'TEXT'
  id?: string
  image_url?: string
  caption?: string | null
  block_layout?: 'grid' | 'wide' | 'single'
  text_content?: string | null
  block_id?: string | null
  block_type?: string
  order_in_block?: number
}

// ── PortfolioChapterItems 컴포넌트 ─────────────────────────

interface Props {
  items: PortfolioChapterItem[]
  allLightboxItems?: { photo: PortfolioPhoto; title: string }[]
  darkMode: boolean
  containerWidth?: number          // 기본값: PORTFOLIO_WIDTH - 48
  onLightbox?: (photo: PortfolioPhoto, items: { photo: PortfolioPhoto; title: string }[]) => void
}

export default function PortfolioChapterItems({
  items,
  allLightboxItems = [],
  darkMode,
  containerWidth,
  onLightbox,
}: Props) {
  const effectiveWidth = containerWidth ?? PORTFOLIO_WIDTH - 48
  const [imageRatios, setImageRatios] = useState<Record<string, number>>({})

  // LCP 후보: 페이지의 첫 PHOTO
  const lcpPhotoId = items.find(i => i.item_type === 'PHOTO' && i.image_url)?.id

  // 다중 onLoad가 동시 발생할 때 setState 폭주를 막기 위해 rAF 한 프레임으로 묶음
  // (강제 리플로우 누적 ~163ms 완화)
  const pendingRatios = useRef<Record<string, number>>({})
  const rafRef = useRef<number | null>(null)

  const handleImageLoad = (url: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    if (!img.naturalWidth || !img.naturalHeight) return
    if (imageRatios[url] !== undefined || pendingRatios.current[url] !== undefined) return
    pendingRatios.current[url] = img.naturalWidth / img.naturalHeight
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      const batched = pendingRatios.current
      pendingRatios.current = {}
      rafRef.current = null
      setImageRatios(prev => ({ ...prev, ...batched }))
    })
  }

  // 한 행 렌더 — 비율 합으로 행 높이 계산
  const renderRow = (
    rowPhotos: PortfolioChapterItem[],
    gap: number,
    rowKey: string
  ): React.ReactNode => {
    const ratios = rowPhotos.map(p => imageRatios[p.image_url || ''] ?? 1.5)
    const totalGap = gap * (rowPhotos.length - 1)
    const sumRatios = ratios.reduce((a, r) => a + r, 0)
    const rowHeight = (effectiveWidth - totalGap) / sumRatios

    return (
      <div key={rowKey} style={{ display: 'flex', gap: `${gap}px`, marginBottom: `${gap}px` }}>
        {rowPhotos.map((photo, j) => (
          <PhotoReveal
            key={photo.id}
            style={{ width: `${rowHeight * ratios[j]}px`, height: `${rowHeight}px`, flexShrink: 0 }}
            className="overflow-hidden cursor-pointer"
            delay={j * 60}
            onClick={() => onLightbox?.(photo as PortfolioPhoto, allLightboxItems)}
          >
            <img
              src={cfUrl(photo.image_url, 'grid')}
              srcSet={`${cfUrl(photo.image_url, 'grid')} 800w, ${cfUrl(photo.image_url, 'public')} 3200w`}
              sizes="(max-width: 896px) 100vw, 848px"
              alt={photo.caption || ''}
              loading={photo.id === lcpPhotoId ? 'eager' : 'lazy'}
              fetchPriority={photo.id === lcpPhotoId ? 'high' : 'auto'}
              className="w-full h-full rounded-photo object-cover hover:opacity-90 transition-opacity block"
              onLoad={(e) => handleImageLoad(photo.image_url || '', e)}
            />
          </PhotoReveal>
        ))}
      </div>
    )
  }

  // ── 블록 그룹 구성 ────────────────────────────────────────
  const renderedBlocks = new Set<string>()
  const blockMap = new Map<string, {
    layout: 'grid' | 'wide' | 'single'
    type: 'PHOTO' | 'SIDE'
    photos: PortfolioChapterItem[]
    text: PortfolioChapterItem | null
    blockType: string
  }>()

  items.forEach(item => {
    const bid = item.block_id
    if (!bid) return
    const isSide = item.block_type === 'side-left' || item.block_type === 'side-right'

    if (isSide) {
      if (!blockMap.has(bid)) {
        blockMap.set(bid, { layout: item.block_layout || 'grid', type: 'SIDE', photos: [], text: null, blockType: item.block_type || 'side-left' })
      }
      const g = blockMap.get(bid)!
      if (item.item_type === 'PHOTO') {
        if (item.block_layout) g.layout = item.block_layout
        g.photos.push(item)
        g.photos.sort((a, b) => (a.order_in_block ?? 0) - (b.order_in_block ?? 0))  // 추가
      } else g.text = item
      } else if (item.item_type === 'PHOTO') {
        if (!blockMap.has(bid)) {
          blockMap.set(bid, { layout: item.block_layout || 'grid', type: 'PHOTO', photos: [], text: null, blockType: 'default' })
        }
        blockMap.get(bid)!.photos.push(item)
        blockMap.get(bid)!.photos.sort((a, b) => (a.order_in_block ?? 0) - (b.order_in_block ?? 0))  // 추가
      }
  })

  // ── 렌더 ─────────────────────────────────────────────────
  const result: React.ReactNode[] = []

  items.forEach((item, i) => {
    const bid = item.block_id

    // 독립 텍스트 블록
    if (item.item_type === 'TEXT' && item.block_type !== 'side-left' && item.block_type !== 'side-right') {
      result.push(
        <div key={`text-${i}`} className="my-space-lg text-left max-w-2xl">
          <MarkdownRenderer
            content={item.text_content || ''}
            darkMode={darkMode}
            className="leading-[2.1] [word-break:keep-all] font-serif"
          />
        </div>
      )
      return
    }

    if (!bid || renderedBlocks.has(bid)) return
    renderedBlocks.add(bid)
    const group = blockMap.get(bid)
    if (!group) return

    // Side block 의미:
    // - side-left  : 텍스트 왼쪽 / 사진 오른쪽  (모바일: 텍스트 위, 사진 아래)
    // - side-right : 사진 왼쪽 / 텍스트 오른쪽  (모바일: 사진 위, 텍스트 아래)
    // Side-by-side 블록
    if (group.type === 'SIDE') {
      const sidePhotos = group.photos
      const isPhotoRight = group.blockType === 'side-right'

      // 캡 적용 여부 판정: 세로 사진(ratio < 1)이고 역수가 1.33 초과인 경우
      const sideRatios = sidePhotos.map(p => imageRatios[p.image_url || ''])
      const hasCapped = sideRatios.some(r => r !== undefined && r < 1 && (1 / r) > 1.33)
      const sideGap = hasCapped ? 24 : 28
      const photoColWidth = ((effectiveWidth - sideGap) * 3) / 5  // flex 3/(3+2)

      const sidePhotoContent = (
        <div className="space-y-2">
          {sidePhotos.map(photo => {
            const ratio = imageRatios[photo.image_url || '']
            const isPortraitCapped =
              ratio !== undefined && ratio < 1 && (1 / ratio) > 1.33
            const capStyle: CSSProperties | undefined = isPortraitCapped
              ? {
                  maxHeight: `${photoColWidth * 1.33}px`,
                  width: 'auto',
                  height: 'auto',
                  // 텍스트와 마주보는 안쪽 가장자리 정렬
                  marginLeft: isPhotoRight ? undefined : 'auto',
                  marginRight: isPhotoRight ? 'auto' : undefined,
                  display: 'block',
                }
              : undefined

            return (
              <div key={photo.id} className="break-inside-avoid rounded-photo">
                <img
                  src={cfUrl(photo.image_url, 'grid')}
                  srcSet={`${cfUrl(photo.image_url, 'grid')} 800w, ${cfUrl(photo.image_url, 'public')} 3200w`}
                  sizes="(max-width: 896px) 100vw, 848px"
                  alt={photo.caption || ''}
                  loading={photo.id === lcpPhotoId ? 'eager' : 'lazy'}
                  fetchPriority={photo.id === lcpPhotoId ? 'high' : 'auto'}
                  className={
                    isPortraitCapped
                      ? 'rounded-photo cursor-pointer hover:opacity-90 transition-opacity'
                      : 'w-full rounded-photo cursor-pointer hover:opacity-90 transition-opacity block'
                  }
                  style={capStyle}
                  onLoad={(e) => handleImageLoad(photo.image_url || '', e)}
                  onClick={() => onLightbox?.(photo as PortfolioPhoto, allLightboxItems)}
                />
              </div>
            )
          })}
        </div>
      )

      const photoCol = (
        <div className="min-w-0" style={{ flex: '3' }}>
          {sidePhotoContent}
        </div>
      )
      const textCol = group.text ? (
        <div
          className="min-w-0 flex items-start w-full text-left"
          style={{ flex: '2' }}
        >
          <MarkdownRenderer
            content={group.text.text_content || ''}
            darkMode={darkMode}
            className="leading-[2.1] [word-break:keep-all] w-full min-w-0 font-serif"
          />
        </div>
      ) : null

      result.push(
        <div key={`side-${bid}`} className="flex my-space-md items-start" style={{ gap: `${sideGap}px`, width: `${effectiveWidth}px` }}>
          {isPhotoRight ? <>{photoCol}{textCol}</> : <>{textCol}{photoCol}</>}
        </div>
      )
      return
    }

    // 일반 사진 블록
    const layout = group.layout
    const photos = group.photos

    if (layout === 'single') {
      result.push(
        <div key={`block-${bid}`} className="mb-space-sm space-y-4"
          style={{ width: `${effectiveWidth}px` }}>
          {photos.map((photo, pi) => (
            <PhotoReveal key={photo.id} className="break-inside-avoid" delay={pi * 60}>
              <img
                src={cfUrl(photo.image_url, 'grid')}
                srcSet={`${cfUrl(photo.image_url, 'grid')} 800w, ${cfUrl(photo.image_url, 'public')} 3200w`}
                sizes="(max-width: 896px) 100vw, 848px"
                alt={photo.caption || ''}
                loading={photo.id === lcpPhotoId ? 'eager' : 'lazy'}
                fetchPriority={photo.id === lcpPhotoId ? 'high' : 'auto'}
                className="w-full rounded-photo cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => onLightbox?.(photo as PortfolioPhoto, allLightboxItems)}
              />
            </PhotoReveal>
          ))}
        </div>
      )
    } else {
      const cols = layout === 'wide' ? 2 : 3
      const gap  = layout === 'wide' ? PORTFOLIO_GAP.wide : PORTFOLIO_GAP.grid
      const rows: PortfolioChapterItem[][] = []
      for (let k = 0; k < photos.length; k += cols) {
        rows.push(photos.slice(k, k + cols))
      }
      result.push(
        <div key={`block-${bid}`} className="mb-space-xs">
          {rows.map((rowPhotos, rowIdx) =>
            renderRow(rowPhotos, gap, `row-${bid}-${rowIdx}`)
          )}
        </div>
      )
    }
  })

  return <>{result}</>
}