import { Sun, Moon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../theme/ThemeProvider'

/**
 * 앱 크롬 빠른 테마 토글 (Dark Mode STEP 6).
 * 현재 effective 기준 라이트↔다크 즉시 전환 — 누르면 pref 가 명시값(light/dark)으로 set 되어
 * 'system' 에서 벗어난다. 소스 오브 트루스(시스템 따름 포함)는 Settings 3지선다.
 * 색은 의미 토큰만 — 어떤 크롬(라이트/다크)에 놓여도 자동 매핑.
 */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { effective, setPref } = useTheme()
  const { t } = useTranslation()
  const isDark = effective === 'dark'

  return (
    <button
      type="button"
      onClick={() => setPref(isDark ? 'light' : 'dark')}
      aria-label={isDark ? t('settings.themeBeige') : t('settings.themeDark')}
      title={isDark ? t('settings.themeBeige') : t('settings.themeDark')}
      className={`inline-flex items-center justify-center rounded-btn text-muted hover:text-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
    >
      {isDark
        ? <Sun size={16} strokeWidth={1.5} />
        : <Moon size={16} strokeWidth={1.5} />}
    </button>
  )
}
