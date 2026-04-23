import { useState } from 'react'
import MarkdownRenderer from './MarkdownRenderer'

export const PORTFOLIO_WIDTH = 896  // max-w-4xl. 폭 변경 시 이 값과 className 함께 수정
export const PORTFOLIO_GAP = 6      // px — 사진 사이 간격

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
}

// ── PortfolioChapterItems 컴포넌트 ─────────────────────────

interface Props {
  items: PortfolioChapterItem[]
  allLightboxItems?: { photo: PortfolioPhoto; title: string }[]
  darkMode: boolean
  containerWidth?: number          // 기본값: PORTFOLIO_WIDTH - 48
  gap?: number                     // 기본값: PORTFOLIO_GAP
  onLightbox?: (photo: PortfolioPhoto, items: { photo: PortfolioPhoto; title: string }[]) => void
}

export default function PortfolioChapterItems({
  items,
  allLightboxItems = [],
  darkMode,
  containerWidth,
  gap,
  onLightbox,
}: Props) {
  const [imageRatios, setImageRatios] = useState<Record<string, number>>({})

  const effectiveWidth = containerWidth ?? PORTFOLIO_WIDTH - 48
  const effectiveGap = gap ?? PORTFOLIO_GAP

  const captionColor = darkMode ? 'text-gray-500' : 'text-gray-500'
  const subText = captionColor

  const handleImageLoad = (url: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    if (!img.naturalWidth || !img.naturalHeight) return
    const ratio = img.naturalWidth / img.naturalHeight
    setImageRatios(prev => {
      if (prev[url] !== undefined) return prev
      return { ...prev, [url]: ratio }
    })
  }

  // 한 행 렌더 — 비율 합으로 행 높이 계산
  const renderRow = (
    rowPhotos: PortfolioChapterItem[],
    rowKey: string
  ): React.ReactNode => {
    const ratios = rowPhotos.map(p => imageRatios[p.image_url || ''] ?? 1.5)
    const totalGap = effectiveGap * (rowPhotos.length - 1)
    const sumRatios = ratios.reduce((a, r) => a + r, 0)
    const rowHeight = (effectiveWidth - totalGap) / sumRatios

    return (
      <div key={rowKey} style={{ display: 'flex', gap: `${effectiveGap}px`, marginBottom: `${effectiveGap}px` }}>
        {rowPhotos.map((photo, j) => (
          <div
            key={photo.id}
            style={{ width: `${rowHeight * ratios[j]}px`, height: `${rowHeight}px`, flexShrink: 0 }}
            className="overflow-hidden rounded cursor-pointer"
            onClick={() => onLightbox?.(photo as PortfolioPhoto, allLightboxItems)}
          >
            <img
              src={photo.image_url}
              loading="lazy"
              className="w-full h-full object-cover hover:opacity-90 transition-opacity block"
              onLoad={(e) => handleImageLoad(photo.image_url || '', e)}
            />
            {photo.caption && (
              <p className={`text-xs mt-1 leading-relaxed ${subText}`}>{photo.caption}</p>
            )}
          </div>
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
      } else g.text = item
    } else if (item.item_type === 'PHOTO') {
      if (!blockMap.has(bid)) {
        blockMap.set(bid, { layout: item.block_layout || 'grid', type: 'PHOTO', photos: [], text: null, blockType: 'default' })
      }
      blockMap.get(bid)!.photos.push(item)
    }
  })

  // ── 렌더 ─────────────────────────────────────────────────
  const result: React.ReactNode[] = []

  items.forEach((item, i) => {
    const bid = item.block_id

    // 독립 텍스트 블록
    if (item.item_type === 'TEXT' && item.block_type !== 'side-left' && item.block_type !== 'side-right') {
      result.push(
        <div key={`text-${i}`} className="my-8 text-center italic">
          <MarkdownRenderer content={item.text_content || ''} darkMode={darkMode} className="text-base leading-[1.9] [word-break:keep-all]" />
        </div>
      )
      return
    }

    if (!bid || renderedBlocks.has(bid)) return
    renderedBlocks.add(bid)
    const group = blockMap.get(bid)
    if (!group) return

    // Side-by-side 블록
    if (group.type === 'SIDE') {
      const sideLayout = group.layout
      const sidePhotos = group.photos
      // side 컬럼 너비 = 전체의 약 3/5 (flex:3 기준)
      const sideColWidth = (effectiveWidth - 28) * 3 / 5

      let sidePhotoContent: React.ReactNode
      if (sideLayout === 'single') {
        sidePhotoContent = (
          <div className="space-y-2">
            {sidePhotos.map(photo => (
              <div key={photo.id} className="break-inside-avoid">
                <img
                  src={photo.image_url}
                  loading="lazy"
                  className="w-full rounded cursor-pointer hover:opacity-90 transition-opacity block"
                  onClick={() => onLightbox?.(photo as PortfolioPhoto, allLightboxItems)}
                />
                {photo.caption && (
                  <p className={`text-xs mt-1.5 leading-relaxed ${subText}`}>{photo.caption}</p>
                )}
              </div>
            ))}
          </div>
        )
      } else {
        const sideCols = sideLayout === 'wide' ? 2 : 3
        const sideRows: PortfolioChapterItem[][] = []
        for (let k = 0; k < sidePhotos.length; k += sideCols) {
          sideRows.push(sidePhotos.slice(k, k + sideCols))
        }
        sidePhotoContent = (
          <div>
            {sideRows.map((rowPhotos, rowIdx) => {
              const ratios = rowPhotos.map(p => imageRatios[p.image_url || ''] ?? 1.5)
              const totalGap = effectiveGap * (rowPhotos.length - 1)
              const sumRatios = ratios.reduce((a, r) => a + r, 0)
              const rowHeight = (sideColWidth - totalGap) / sumRatios
              return (
                <div key={`side-row-${bid}-${rowIdx}`} style={{ display: 'flex', gap: `${effectiveGap}px`, marginBottom: `${effectiveGap}px` }}>
                  {rowPhotos.map((photo, j) => (
                    <div
                      key={photo.id}
                      style={{ width: `${rowHeight * ratios[j]}px`, height: `${rowHeight}px`, flexShrink: 0 }}
                      className="overflow-hidden rounded cursor-pointer"
                      onClick={() => onLightbox?.(photo as PortfolioPhoto, allLightboxItems)}
                    >
                      <img
                        src={photo.image_url}
                        loading="lazy"
                        className="w-full h-full object-cover hover:opacity-90 transition-opacity block"
                        onLoad={(e) => handleImageLoad(photo.image_url || '', e)}
                      />
                      {photo.caption && (
                        <p className={`text-xs mt-1 leading-relaxed ${subText}`}>{photo.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )
      }

      const photoCol = (
        <div className="min-w-0" style={{ flex: '3' }}>
          {sidePhotoContent}
        </div>
      )
      const textCol = group.text ? (
        <div
          className={`min-w-0 flex items-center italic w-full ${group.blockType === 'side-left' ? 'text-right' : 'text-left'}`}
          style={{ flex: '2' }}
        >
          <MarkdownRenderer content={group.text.text_content || ''} darkMode={darkMode} className="text-base leading-[1.9] [word-break:keep-all] w-full" />
        </div>
      ) : null

      result.push(
        <div key={`side-${bid}`} className="flex my-6 items-center" style={{ gap: '28px', maxWidth: '100%' }}>
          {group.blockType === 'side-right' ? <>{photoCol}{textCol}</> : <>{textCol}{photoCol}</>}
        </div>
      )
      return
    }

    // 일반 사진 블록
    const layout = group.layout
    const photos = group.photos

    if (layout === 'single') {
      result.push(
        <div key={`block-${bid}`} className="mb-8 space-y-4">
          {photos.map(photo => (
            <div key={photo.id} className="break-inside-avoid">
              <img
                src={photo.image_url}
                loading="lazy"
                className="w-full rounded cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => onLightbox?.(photo as PortfolioPhoto, allLightboxItems)}
              />
              {photo.caption && (
                <p className={`text-xs mt-1.5 leading-relaxed ${subText}`}>{photo.caption}</p>
              )}
            </div>
          ))}
        </div>
      )
    } else {
      const cols = layout === 'wide' ? 2 : 3
      const rows: PortfolioChapterItem[][] = []
      for (let k = 0; k < photos.length; k += cols) {
        rows.push(photos.slice(k, k + cols))
      }
      result.push(
        <div key={`block-${bid}`} className="mb-6">
          {rows.map((rowPhotos, rowIdx) =>
            renderRow(rowPhotos, `row-${bid}-${rowIdx}`)
          )}
        </div>
      )
    }
  })

  return <>{result}</>
}