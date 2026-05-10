import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MoreHorizontal } from 'lucide-react'

export function PhotoActionMenu({ onMove, onDelete }: { onMove: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
        className="w-7 h-7 flex items-center justify-center rounded-full
                   bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white
                   transition-colors"
        aria-label="More actions"
      >
        <MoreHorizontal size={14} strokeWidth={2} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 z-popover min-w-[140px]
                        bg-white border border-edit-line rounded-[2px]
                        shadow-[0_4px_12px_rgba(0,0,0,0.06)] py-1">
          <button
            onClick={() => { onMove(); setOpen(false) }}
            className="w-full px-3 py-1.5 text-left text-[0.75rem] text-edit-ink hover:bg-edit-paper"
          >
            {t('story.toOtherBlockTitle')}
          </button>
          <button
            onClick={() => { onDelete(); setOpen(false) }}
            className="w-full px-3 py-1.5 text-left text-[0.75rem] text-edit-danger hover:bg-edit-paper"
          >
            {t('story.removePhoto')}
          </button>
        </div>
      )}
    </div>
  )
}
