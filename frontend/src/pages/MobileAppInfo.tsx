import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Monitor } from 'lucide-react'

export default function MobileAppInfo() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      {/* Header */}
      <header className="px-6 pt-10 pb-4">
        <span className="text-small font-serif font-bold tracking-widest text-ink">Racconto</span>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="w-12 h-12 rounded-full border border-hair bg-canvas-2 flex items-center justify-center mb-8">
          <Monitor size={20} strokeWidth={1.5} className="text-muted" />
        </div>

        <p className="text-caption tracking-[0.3em] text-faint uppercase mb-5">
          {t('mobileAppInfo.eyebrow')}
        </p>

        <h1
          className="text-h2 font-serif font-bold text-ink mb-5 leading-tight whitespace-pre-line"
          style={{ letterSpacing: '-0.02em' }}
        >
          {t('mobileAppInfo.title')}
        </h1>

        <p className="text-small text-muted leading-relaxed mb-10 whitespace-pre-line break-keep max-w-xs">
          {t('mobileAppInfo.subtitle')}
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <a
            href="https://racconto.app/download"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-ink text-white text-small tracking-widest rounded hover:bg-stone-700 transition-colors duration-150"
          >
            {t('mobileAppInfo.downloadBtn')}
          </a>
          <a
            href="https://racconto.app"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-hair text-muted text-small tracking-widest rounded hover:border-stone-400 hover:text-ink transition-colors duration-150"
          >
            {t('mobileAppInfo.openDesktop')}
          </a>
        </div>

        {/* Portfolio note */}
        <div className="mt-12 pt-8 border-t border-hair w-full max-w-xs">
          <p className="text-caption text-faint mb-2">{t('mobileAppInfo.portfolioNote')}</p>
          <Link
            to="/"
            className="text-small text-muted underline underline-offset-2 hover:text-ink transition-colors duration-150"
          >
            {t('mobileAppInfo.portfolioLink')}
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center">
        <p className="text-caption text-faint">© 2026 Racconto. All rights reserved.</p>
      </footer>
    </div>
  )
}
