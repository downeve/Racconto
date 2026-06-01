import { Sun, Moon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import PortfolioChapterItems, { type PortfolioChapterItem } from '../../components/PortfolioChapterItems'
import type { ChapterItem } from '../../components/StoryBlocks'

interface Chapter {
  id: string
  project_id: string
  title: string
  description: string | null
  order_num: number
  parent_id: string | null
}

interface StoryPreviewModalProps {
  chapters: Chapter[]
  showPreview: boolean
  onClosePreview: () => void
  chapterPreviewId: string | null
  chapterPreviewOpen: boolean
  previewDarkMode: boolean
  setPreviewDarkMode: React.Dispatch<React.SetStateAction<boolean>>
  getVisibleChapterItems: (chapterId: string) => ChapterItem[]
  closeChapterPreview: () => void
}

export default function StoryPreviewModal({
  chapters,
  showPreview,
  onClosePreview,
  chapterPreviewId,
  chapterPreviewOpen,
  previewDarkMode,
  setPreviewDarkMode,
  getVisibleChapterItems,
  closeChapterPreview,
}: StoryPreviewModalProps) {
  const { t } = useTranslation()

  return (
    <>
      {/* ── 포트폴리오 미리보기 오버레이 ─────────────────────── */}
      {showPreview && (() => {
        const dm = previewDarkMode
        const bg = dm ? 'bg-ink text-hair' : 'bg-canvas text-ink'
        const headerBg = dm ? 'bg-ink/90 border-hair/10' : 'bg-canvas/90 border-faint'
        const subText = dm ? 'text-faint' : 'text-muted'
        const divider = dm ? 'bg-muted' : 'bg-faint'
        const closeColor = dm ? 'text-faint hover:text-hair' : 'text-faint hover:text-ink-2'
        const toggleClass = dm
          ? 'border-muted text-faint hover:text-hair'
          : 'border-faint text-muted hover:text-ink'

        return (
          <div className={`fixed inset-0 z-[90] ${bg} overflow-y-auto transition-[background,color,border] duration-150 ease-out`}>
            {/* 헤더 */}
            <div className={`sticky top-0 z-10 backdrop-blur-sm border-b ${headerBg}`}>
              <div className="max-w-4xl mx-auto px-6 h-12 flex items-center justify-between">
                <span className={`text-xs tracking-widest uppercase ${subText}`}>Portfolio Preview</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPreviewDarkMode(v => !v)}
                    className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-btn border transition-[background,color,border] duration-150 ease-out ${toggleClass}`}
                  >
                    {dm
                      ? <><Sun size={12} strokeWidth={1.5} />{t('settings.themeBeige')}</>
                      : <><Moon size={12} strokeWidth={1.5} />{t('settings.themeDark')}</>}
                  </button>
                  <button
                    onClick={onClosePreview}
                    className={`text-xl p-2 rounded-btn transition-[background,color,border] duration-150 ease-out ${closeColor}`}
                  >✕</button>
                </div>
              </div>
            </div>

            {/* 본문 */}
            <div className="max-w-4xl mx-auto px-6 pt-space-md pb-space-xl">
              {chapters.length === 0 ? (
                <p className={`text-center py-20 ${subText}`}>{t('story.noChapter')}</p>
              ) : (
                <div className="space-y-0">
                  {chapters.filter(c => !c.parent_id).map((chapter, idx) => {
                    const subChapters = chapters.filter(c => c.parent_id === chapter.id)
                    const items = getVisibleChapterItems(chapter.id)
                    return (
                      <div key={chapter.id} className={idx > 0 ? 'pt-36' : 'pt-space-lg'}>

                        {/* 챕터 헤더 — oversized numeral + capped hairline */}
                        <header className="mb-10">
                          <div className="flex items-baseline gap-5">
                            <span
                              className={`font-serif font-light leading-none tracking-[-0.04em] [font-variant-numeric:oldstyle-nums] ${dm ? 'text-d-accent' : 'text-accent'}`}
                              style={{ fontSize: 'clamp(72px, 8vw, 112px)' }}
                            >
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <div className={`flex-1 max-w-[480px] h-[0.5px] ${dm ? 'bg-d-line' : 'bg-hair'}`} />
                          </div>
                          <h3 className="font-serif text-[32px] leading-[1.1] tracking-[-0.015em] font-normal mt-6">
                            {chapter.title}
                          </h3>
                          {chapter.description && (
                            <p className={`mt-[18px] font-serif text-[16px] leading-[1.65] [word-break:keep-all] whitespace-pre-wrap ${subText}`}>
                              {chapter.description}
                            </p>
                          )}
                        </header>

                        <PortfolioChapterItems
                          items={items as PortfolioChapterItem[]}
                        />

                        {/* 서브챕터 */}
                        {subChapters.map((sub, subIdx) => (
                          <div key={sub.id} className="mt-space-md">
                            <div className={`h-px mb-10 w-1/3 ${divider}`} />
                            <div className="mb-8">
                              <p className={`t-eyebrow mb-2 ${dm ? 'text-d-faint' : 'text-faint'}`}>
                                Section {String(idx + 1).padStart(2, '0')}.{String(subIdx + 1).padStart(2, '0')}.
                              </p>
                              <h4 className="font-serif text-[20px] tracking-tight font-normal">
                                {sub.title}
                              </h4>
                              {sub.description && (
                                <p className={`text-body font-serif mt-2 max-w-xl [word-break:keep-all] whitespace-pre-wrap ${subText}`}>
                                  {sub.description}
                                </p>
                              )}
                            </div>
                            <PortfolioChapterItems
                              items={getVisibleChapterItems(sub.id) as PortfolioChapterItem[]}
                            />
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── 챕터별 슬라이드오버 Preview ─────────────────────── */}
      {chapterPreviewId && (() => {
        const dm = previewDarkMode
        const bg = dm ? 'bg-ink text-hair' : 'bg-canvas text-ink'
        const headerBg = dm ? 'bg-ink/90 border-hair/10' : 'bg-canvas/90 border-faint'
        const subText = dm ? 'text-faint' : 'text-muted'
        const accent = dm ? 'bg-card/30' : 'bg-faint'
        const toggleClass = dm
          ? 'border-muted text-faint hover:text-hair'
          : 'border-faint text-muted hover:text-ink'

        const targetChapter = chapters.find(c => c.id === chapterPreviewId)
        if (!targetChapter) return null

        const isSubChapter = !!targetChapter.parent_id
        const parentChapter = isSubChapter
          ? chapters.find(c => c.id === targetChapter.parent_id)
          : null

        return (
          <>
            {/* 딤 배경 */}
            <div
              className={`fixed inset-0 z-[85] bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 ${chapterPreviewOpen ? 'opacity-100' : 'opacity-0'}`}
              onClick={closeChapterPreview}
            />

            {/* 슬라이드오버 패널 */}
            <div
              className={`fixed top-0 right-0 h-full z-[86] w-[min(896px,100vw)] ${bg} shadow-2xl flex flex-col
                transition-transform duration-300 ease-out
                ${chapterPreviewOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
              {/* 패널 헤더 */}
              <div className={`shrink-0 sticky top-0 z-10 backdrop-blur-sm border-b ${headerBg}`}>
                <div className="px-5 h-12 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-serif text-h3 tracking-tight truncate">{targetChapter.title}</span>
                    {isSubChapter && parentChapter && (
                      <span className={`text-xs shrink-0 ${subText}`}>↑ {parentChapter.title}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setPreviewDarkMode(v => !v)}
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-btn border transition-[background,color,border] duration-150 ease-out ${toggleClass}`}
                    >
                      {dm
                        ? <><Sun size={11} strokeWidth={1.5} />{t('settings.themeBeige')}</>
                        : <><Moon size={11} strokeWidth={1.5} />{t('settings.themeDark')}</>}
                    </button>
                    <button
                      onClick={closeChapterPreview}
                      className={`text-lg p-1.5 rounded-btn transition-[background,color,border] duration-150 ease-out ${subText} hover:text-ink`}
                    >✕</button>
                  </div>
                </div>
              </div>

              {/* 패널 본문 */}
              <div className="flex-1 overflow-y-auto px-8 pt-6 pb-12">
                <div className="mb-8">
                  {targetChapter.description && (
                    <p className={`text-body font-serif max-w-full [word-break:keep-all] whitespace-pre-wrap mb-6 ${subText}`}>
                      {targetChapter.description}
                    </p>
                  )}
                  <div className={`mb-6 h-px w-10 ${accent}`} />
                  <PortfolioChapterItems
                    items={getVisibleChapterItems(chapterPreviewId) as PortfolioChapterItem[]}
                    containerWidth={832}
                  />
                </div>
              </div>
            </div>
          </>
        )
      })()}
    </>
  )
}
