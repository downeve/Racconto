import { useState } from 'react'
import MarkdownRenderer from '../MarkdownRenderer'
import type { PortfolioChapterItem, PortfolioPhoto } from '../PortfolioChapterItems'

interface Props {
  items: PortfolioChapterItem[]
  allLightboxItems?: { photo: PortfolioPhoto; title: string }[]
  darkMode: boolean
  containerWidth?: number
  gap?: number
  onLightbox?: (photo: PortfolioPhoto, items: { photo: PortfolioPhoto; title: string }[]) => void
}

export default function MobilePortfolioChapterItems({
  items, allLightboxItems = [], darkMode, gap = 4, onLightbox
}: Props) {
  const [imageRatios, setImageRatios] = useState<Record<string, number>>({})

  const handleImageLoad = (url: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    if (!img.naturalWidth || !img.naturalHeight) return
    const ratio = img.naturalWidth / img.naturalHeight
    setImageRatios(prev => prev[url] !== undefined ? prev : { ...prev, [url]: ratio })
  }

  const renderRow = (rowPhotos: PortfolioChapterItem[], rowKey: string) => {
    const ratios = rowPhotos.map(p => imageRatios[p.image_url || ''] ?? 1.5)

    return (
      <div key={rowKey} style={{ display: 'flex', gap: `${gap}px`, marginBottom: `${gap}px` }}>
        {rowPhotos.map((photo, j) => (
          <div
            key={photo.id}
            style={{ flex: ratios[j], aspectRatio: `${ratios[j] * 100} / 100`, overflow: 'hidden', cursor: 'pointer' }}
            onClick={() => onLightbox?.(photo as PortfolioPhoto, allLightboxItems)}
          >
            <img
              src={photo.image_url}
              loading="lazy"
              className="w-full h-full rounded-photo object-cover block"
              onLoad={(e) => handleImageLoad(photo.image_url || '', e)}
            />
          </div>
        ))}
      </div>
    )
  }

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
      if (!blockMap.has(bid)) blockMap.set(bid, { layout: item.block_layout || 'grid', type: 'SIDE', photos: [], text: null, blockType: item.block_type || 'side-left' })
      const g = blockMap.get(bid)!
      if (item.item_type === 'PHOTO') { if (item.block_layout) g.layout = item.block_layout; g.photos.push(item); g.photos.sort((a, b) => (a.order_in_block ?? 0) - (b.order_in_block ?? 0)) }
      else g.text = item
    } else if (item.item_type === 'PHOTO') {
      if (!blockMap.has(bid)) blockMap.set(bid, { layout: item.block_layout || 'grid', type: 'PHOTO', photos: [], text: null, blockType: 'default' })
      blockMap.get(bid)!.photos.push(item)
      blockMap.get(bid)!.photos.sort((a, b) => (a.order_in_block ?? 0) - (b.order_in_block ?? 0))
    }
  })

  const result: React.ReactNode[] = []

  items.forEach((item, i) => {
    const bid = item.block_id

    if (item.item_type === 'TEXT' && item.block_type !== 'side-left' && item.block_type !== 'side-right') {
      result.push(
        <div key={`text-${i}`} className="my-8 px-2">
          <MarkdownRenderer content={item.text_content || ''} darkMode={darkMode} className="leading-[2.1] [word-break:keep-all] font-serif" />
        </div>
      )
      return
    }

    if (!bid || renderedBlocks.has(bid)) return
    renderedBlocks.add(bid)
    const group = blockMap.get(bid)
    if (!group) return

    // Side-by-side → 모바일에서 세로 스택
    if (group.type === 'SIDE') {
      result.push(
        <div key={`side-${bid}`} className="flex flex-col gap-3 my-4">
          <div className="space-y-2">
            {group.photos.map(photo => (
              <div key={photo.id} className="rounded-photo overflow-hidden cursor-pointer" onClick={() => onLightbox?.(photo as PortfolioPhoto, allLightboxItems)}>
                <img src={photo.image_url} loading="lazy" className="w-full block rounded-photo" />
              </div>
            ))}
          </div>
          {group.text?.text_content && (
            <MarkdownRenderer content={group.text.text_content} darkMode={darkMode} className="leading-[2.1] [word-break:keep-all] font-serif px-2" />
          )}
        </div>
      )
      return
    }

    const layout = group.layout
    const photos = group.photos

    if (layout === 'single') {
      result.push(
        <div key={`block-${bid}`} className="mb-4 space-y-2">
          {photos.map(photo => (
            <div key={photo.id} className="rounded-photo overflow-hidden cursor-pointer" onClick={() => onLightbox?.(photo as PortfolioPhoto, allLightboxItems)}>
              <img src={photo.image_url} loading="lazy" className="w-full rounded-photo block" />
            </div>
          ))}
        </div>
      )
    } else {
      const cols = layout === 'wide' ? 2 : 3
      const rows: PortfolioChapterItem[][] = []
      for (let k = 0; k < photos.length; k += cols) rows.push(photos.slice(k, k + cols))
      result.push(
        <div key={`block-${bid}`} className="mb-1">
          {rows.map((rowPhotos, rowIdx) => renderRow(rowPhotos, `row-${bid}-${rowIdx}`))}
        </div>
      )
    }
  })

  return <>{result}</>
}
