import { useRef } from 'react'
import { useMobileLayout } from '../../context/MobileLayoutContext'

export default function MobileBottomSheet() {
  const { bottomSheetContent, setBottomSheetContent } = useMobileLayout()
  const sheetStartY = useRef(0)

  const close = () => setBottomSheetContent(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    sheetStartY.current = e.touches[0].clientY
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0].clientY - sheetStartY.current > 80) close()
  }

  if (!bottomSheetContent) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      <div
        className="relative bg-white rounded-t-2xl overflow-y-auto"
        style={{ maxHeight: '80dvh', paddingBottom: 'env(safe-area-inset-bottom)' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-stone-300" />
        </div>
        {bottomSheetContent}
      </div>
    </div>
  )
}
