import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, X } from 'lucide-react'

/**
 * Electron 환경에서만 표시. GitHub Releases 의 latest tag 가 현재 앱 버전보다
 * 높으면 우상단 알림 배너를 띄움. "다운로드" 클릭 시 OS/arch 별 dmg/exe URL 을
 * 시스템 기본 브라우저에서 직접 열어 다운로드 시작. "나중에" 클릭 시 같은 버전
 * 알림 재차단(localStorage).
 */
const DISMISS_KEY = 'update_dismissed_version'

export default function UpdateNotificationBanner() {
  const { t } = useTranslation()
  const [info, setInfo] = useState<UpdateInfo | null>(null)

  useEffect(() => {
    if (!window.racconto) return

    const handle = (next: UpdateInfo) => {
      if (!next?.hasUpdate) return
      // 사용자가 같은 버전에 "나중에" 누른 적이 있으면 표시 안 함
      if (localStorage.getItem(DISMISS_KEY) === next.latest) return
      setInfo(next)
    }

    // 자동 push (main 의 setTimeout 결과)
    window.racconto.onUpdateAvailable(handle)

    // 컴포넌트 마운트 시 캐시된 결과 1회 조회 (이미 체크 완료된 경우)
    window.racconto.getCachedUpdate().then(cached => {
      if (cached) handle(cached)
    }).catch(() => {})
  }, [])

  if (!info) return null

  const handleDownload = () => {
    const url = info.downloadUrl || info.htmlUrl
    window.racconto?.openExternal(url)
    setInfo(null)
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, info.latest)
    setInfo(null)
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 right-4 z-popover w-80 max-w-[calc(100vw-2rem)]
                 bg-edit-paper border border-edit-line rounded-btn
                 shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-4
                 animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="t-eyebrow text-edit-faint">{t('update.eyebrow', 'New version')}</p>
          <p className="text-[0.9375rem] font-serif text-edit-ink mt-0.5">
            {t('update.available', 'Racconto v{{version}} is available', { version: info.latest })}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          aria-label={t('common.close', 'Close')}
          className="text-edit-faint hover:text-edit-ink transition-colors shrink-0 -mr-1"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>

      <p className="t-caption text-edit-muted mb-3">
        {t('update.currentVersion', 'Current: v{{version}}', { version: info.current })}
      </p>

      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={handleDismiss}
          className="px-3 py-1.5 text-[0.75rem] tracking-[0.04em] uppercase
                     text-edit-muted hover:text-edit-ink transition-colors"
        >
          {t('update.later', 'Later')}
        </button>
        <button
          onClick={handleDownload}
          disabled={!info.downloadUrl && !info.htmlUrl}
          className="inline-flex items-center gap-1.5 px-3 py-1.5
                     bg-edit-ink text-edit-paper hover:bg-edit-ink/85
                     text-[0.75rem] tracking-[0.04em] uppercase
                     rounded-btn transition-colors disabled:opacity-40"
        >
          <Download size={12} strokeWidth={1.5} />
          {t('update.download', 'Download')}
        </button>
      </div>
    </div>
  )
}
