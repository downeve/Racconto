import type { ChapterItem } from '../components/StoryBlocks'

export type PortfolioRow = {
  rowIdx: number
  itemIds: string[]
  isFullWidth: boolean
}

export function colsForLayout(layout: 'grid' | 'wide' | 'single'): 1 | 2 | 3 {
  if (layout === 'single') return 1
  if (layout === 'wide') return 2
  return 3
}

export function computePortfolioRows(
  items: ChapterItem[],
  layout: 'grid' | 'wide' | 'single'
): PortfolioRow[] {
  const cols = colsForLayout(layout)
  const photos = items.filter(i => i.item_type === 'PHOTO')
  const rows: PortfolioRow[] = []
  let i = 0, rowIdx = 0

  while (i < photos.length) {
    const remain = photos.length - i
    if (remain === 1 && cols > 1) {
      rows.push({ rowIdx, itemIds: [photos[i].id], isFullWidth: true })
      i += 1
    } else {
      const take = Math.min(cols, remain)
      rows.push({
        rowIdx,
        itemIds: photos.slice(i, i + take).map(p => p.id),
        isFullWidth: false,
      })
      i += take
    }
    rowIdx += 1
  }
  return rows
}
