import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Monitor } from 'lucide-react'
import { Wordmark } from '../components/Wordmark'
import { useAuth } from '../context/AuthContext'

export default function MobileAppInfo() {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-edit-canvas text-edit-ink flex flex-col">

      {/* Header */}
      <header className="px-6 py-5 border-b border-edit-line">
        <Wordmark size="sm" />
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="w-12 h-12 rounded-full border border-edit-line bg-edit-paper flex items-center justify-center mb-8">
          <Monitor size={20} strokeWidth={1.5} className="text-edit-muted" />
        </div>

        <p className="t-eyebrow text-edit-muted mb-5">
          {t('mobileAppInfo.eyebrow')}
        </p>

        <h1 className="font-serif text-h2 font-normal text-edit-ink tracking-tight
                       mb-5 leading-[1.2] break-keep whitespace-pre-line">
          {t('mobileAppInfo.title')}
        </h1>

        <p className="text-body text-edit-muted leading-relaxed mb-10 break-keep max-w-xs">
          {t('mobileAppInfo.subtitle')}
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link
            to="/download"
            className="w-full inline-flex items-center justify-center gap-2
                       px-6 py-3.5 bg-edit-ink text-edit-paper
                       t-caption tracking-[0.08em] rounded-[1px]
                       hover:bg-edit-ink/85 transition-colors duration-150"
          >
            {t('mobileAppInfo.downloadBtn')}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full inline-flex items-center justify-center gap-2
                       px-6 py-3.5 text-edit-muted
                       t-caption tracking-[0.08em]
                       hover:text-edit-ink transition-colors duration-150"
          >
            {t('auth.logout')}
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-edit-line text-center">
        <p className="t-caption text-edit-faint">© {new Date().getFullYear()} Racconto</p>
      </footer>
    </div>
  )
}
