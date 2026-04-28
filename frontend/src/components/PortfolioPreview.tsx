import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { computePortfolioRows } from '../utils/portfolioRows'
import type { ChapterItem } from './StoryBlocks'

interface PreviewBlock {
  blockId: string
  blockLayout: 'grid' | 'wide' | 'single'
  items: ChapterItem[]
  blockType: 'PHOTO' | 'TEXT' | 'SIDE'
}

interface PortfolioPreviewProps {
  blocks: PreviewBlock[]
}

const BAR_HEIGHT = 20
const BAR_GAP = 3
const BLOCK_GAP = 8

export default function PortfolioPreview({ blocks }: PortfolioPreviewProps) {
  const { t } = useTranslation()

  const rendered = useMemo(() => {
    return blocks.map(block => {
      if (block.blockType === 'TEXT') {
        return { blockId: block.blockId, kind: 'text' as const }
      }
      if (block.blockType === 'SIDE') {
        const photos = block.items.filter(i => i.item_type === 'PHOTO')
        return { blockId: block.blockId, kind: 'side' as const, photos }
      }
      const rows = computePortfolioRows(block.items, block.blockLayout)
      const photoMap = Object.fromEntries(
        block.items.filter(i => i.item_type === 'PHOTO').map(p => [p.id, p])
      )
      return {
        blockId: block.blockId,
        kind: 'photo' as const,
        rows: rows.map(r => ({
          rowIdx: r.rowIdx,
          isFullWidth: r.isFullWidth,
          photos: r.itemIds.map(id => photoMap[id]).filter(Boolean),
        })),
      }
    })
  }, [blocks])

  if (blocks.length === 0) return null

  return (
    <div className="shrink-0 w-[200px] sticky top-6 self-start">
      <p className="text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-2">
        {t('story.portfolioPreviewTitle')}
      </p>
      <div className="space-y-0" style={{ gap: `${BLOCK_GAP}px` }}>
        {rendered.map((block, blockIdx) => (
          <div key={block.blockId} style={{ marginBottom: blockIdx < rendered.length - 1 ? `${BLOCK_GAP}px` : 0 }}>
            {block.kind === 'text' && (
              <div className="flex items-center gap-1 my-1">
                <div className="flex-1 h-px bg-stone-200" />
                <span className="text-[8px] font-mono text-stone-300 shrink-0">T</span>
                <div className="flex-1 h-px bg-stone-200" />
              </div>
            )}

            {block.kind === 'side' && (
              <div
                style={{ display: 'flex', gap: `${BAR_GAP}px`, marginBottom: `${BAR_GAP}px`, height: `${BAR_HEIGHT}px` }}
              >
                <div
                  className="rounded-sm bg-stone-200 overflow-hidden"
                  style={{ flex: 3, height: `${BAR_HEIGHT}px` }}
                >
                  {block.photos[0]?.image_url && (
                    <div
                      className="w-full h-full"
                      style={{ backgroundImage: `url(${block.photos[0].image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                    />
                  )}
                </div>
                <div
                  className="rounded-sm bg-stone-100 border border-stone-200"
                  style={{ flex: 2, height: `${BAR_HEIGHT}px` }}
                />
              </div>
            )}

            {block.kind === 'photo' && block.rows.map(row => (
              <div
                key={row.rowIdx}
                style={{ display: 'flex', gap: `${BAR_GAP}px`, marginBottom: `${BAR_GAP}px` }}
              >
                {row.isFullWidth ? (
                  <div
                    className="rounded-sm bg-stone-200 overflow-hidden"
                    style={{ flex: 1, height: `${BAR_HEIGHT}px` }}
                  >
                    {row.photos[0]?.image_url && (
                      <div
                        className="w-full h-full"
                        style={{ backgroundImage: `url(${row.photos[0].image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                      />
                    )}
                  </div>
                ) : (
                  row.photos.map(photo => (
                    <div
                      key={photo.id}
                      className="rounded-sm bg-stone-200 overflow-hidden"
                      style={{ flex: 1, height: `${BAR_HEIGHT}px` }}
                    >
                      {photo.image_url && (
                        <div
                          className="w-full h-full"
                          style={{ backgroundImage: `url(${photo.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
