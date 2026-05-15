import { useEffect, useState } from 'react'

export function useActiveChapter(chapterIds: string[]): string {
  const [activeId, setActiveId] = useState<string>(chapterIds[0] ?? '')
  const idsKey = chapterIds.join(',')

  useEffect(() => {
    if (chapterIds.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // 위에서부터 가장 먼저 보이는 챕터로 업데이트
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          const id = visible[0].target.id.replace('chapter-section-', '')
          setActiveId(id)
        }
      },
      { rootMargin: '-10% 0px -55% 0px', threshold: 0 }
    )

    chapterIds.forEach(id => {
      const el = document.getElementById(`chapter-section-${id}`)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  return activeId
}
