import MarkdownRenderer from '../MarkdownRenderer'
import PhotoReveal from '../PhotoReveal'
import type { PortfolioChapterItem, PortfolioPhoto } from '../PortfolioChapterItems'
import { cfUrl } from '../../utils/cfImage'

interface Props {
  items: PortfolioChapterItem[]
  allLightboxItems?: { photo: PortfolioPhoto; title: string }[]
  darkMode: boolean
  containerWidth?: number
  gap?: number
  onLightbox?: (photo: PortfolioPhoto, items: { photo: PortfolioPhoto; title: string }[]) => void
}

export default function MobilePortfolioChapterItems({
  items, allLightboxItems = [], darkMode, onLightbox
}: Props) {

  // 페이지의 첫 PHOTO — LCP 후보. eager + fetchPriority="high" 적용.
  const lcpPhotoId = items.find(i => i.item_type === 'PHOTO' && i.image_url)?.id

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

    // 독립 텍스트 블록
    if (item.item_type === 'TEXT' && item.block_type !== 'side-left' && item.block_type !== 'side-right') {
      result.push(
        <div key={`text-${i}`} className="my-8">
          <MarkdownRenderer
            content={item.text_content || ''}
            darkMode={darkMode}
            className="leading-[2] [word-break:keep-all] font-serif text-[15.5px]"
          />
        </div>
      )
      return
    }

    if (!bid || renderedBlocks.has(bid)) return
    renderedBlocks.add(bid)
    const group = blockMap.get(bid)
    if (!group) return

    // Side-by-side → 모바일 vstack
    // side-left: 텍스트 위, 사진 아래
    // side-right: 사진 위, 텍스트 아래
    if (group.type === 'SIDE') {
      const isTextFirst = group.blockType === 'side-left'
      const photoBlock = (
        <div className="space-y-2">
          {group.photos.map(photo => (
            <div key={photo.id} className="rounded-photo overflow-hidden cursor-pointer" onClick={() => onLightbox?.(photo as PortfolioPhoto, allLightboxItems)}>
              <img
                src={cfUrl(photo.image_url, 'grid')}
                srcSet={`${cfUrl(photo.image_url, 'mobile')} 480w, ${cfUrl(photo.image_url, 'grid')} 800w`}
                sizes="(max-width: 768px) 100vw, 800px"
                alt={photo.caption || ''}
                loading={photo.id === lcpPhotoId ? 'eager' : 'lazy'}
                fetchPriority={photo.id === lcpPhotoId ? 'high' : 'auto'}
                className="w-full block rounded-photo"
              />
              {photo.caption && <p className={`t-caption mt-2 ${darkMode ? 'text-d-faint' : 'text-faint'}`}>{photo.caption}</p>}
            </div>
          ))}
        </div>
      )
      const textBlock = group.text?.text_content ? (
        <MarkdownRenderer
          content={group.text.text_content}
          darkMode={darkMode}
          className="leading-[2] [word-break:keep-all] font-serif text-[15.5px]"
        />
      ) : null
      result.push(
        <div key={`side-${bid}`} className="flex flex-col gap-4 my-4">
          {isTextFirst ? textBlock : photoBlock}
          {isTextFirst ? photoBlock : textBlock}
        </div>
      )
      return
    }

    // GRID / WIDE / SINGLE → 모두 1열 풀폭
    const photos = group.photos
    result.push(
      <div key={`block-${bid}`} className="mb-6 space-y-2">
        {photos.map((photo, pi) => (
          <PhotoReveal
            key={photo.id}
            className="w-full overflow-hidden rounded-photo cursor-pointer"
            delay={pi * 60}
            onClick={() => onLightbox?.(photo as PortfolioPhoto, allLightboxItems)}
          >
            <img
              src={cfUrl(photo.image_url, 'grid')}
              srcSet={`${cfUrl(photo.image_url, 'mobile')} 480w, ${cfUrl(photo.image_url, 'grid')} 800w`}
              sizes="(max-width: 768px) 100vw, 800px"
              alt={photo.caption || ''}
              loading={photo.id === lcpPhotoId ? 'eager' : 'lazy'}
              fetchPriority={photo.id === lcpPhotoId ? 'high' : 'auto'}
              className="w-full object-cover hover:opacity-90 transition-opacity block"
            />
            {photo.caption && (
              <p className={`t-caption mt-2 ${darkMode ? 'text-d-faint' : 'text-faint'}`}>
                {photo.caption}
              </p>
            )}
          </PhotoReveal>
        ))}
      </div>
    )
  })

  return <>{result}</>
}
