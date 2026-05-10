import { useTranslation } from 'react-i18next'

const API_BASE = import.meta.env.VITE_API_URL || 'https://racconto.app/api'

interface Props {
  mode?: 'login' | 'register'
  className?: string
}

export function SocialAuthButtons({ mode = 'login', className = '' }: Props) {
  const { t } = useTranslation()
  return (
    <div className={className}>
      <Divider label={t('auth.or')} />
      <div className="mt-6 space-y-2.5">
        <SocialButton
          href={`${API_BASE}/auth/google/${mode}`}
          variant="google"
          label={t('auth.google')}
        />
        <SocialButton
          href={`${API_BASE}/auth/apple/${mode}`}
          variant="apple"
          label={t('auth.apple')}
        />
        <SocialButton
          href={`${API_BASE}/auth/naver/${mode}`}
          variant="naver"
          label={t('auth.naver')}
        />
      </div>
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <div className="w-full border-t border-edit-line" />
      </div>
      <div className="relative flex justify-center">
        <span className="px-3 bg-edit-canvas t-eyebrow text-edit-faint">{label}</span>
      </div>
    </div>
  )
}

interface SocialButtonProps {
  href: string
  variant: 'google' | 'apple' | 'naver'
  label: string
}

function SocialButton({ href, variant, label }: SocialButtonProps) {
  const variants: Record<typeof variant, string> = {
    google: 'border border-edit-line text-edit-ink hover:border-edit-line-strong hover:bg-edit-paper',
    apple:  'bg-edit-ink text-edit-paper hover:bg-edit-ink/85 border border-edit-ink',
    naver:  'text-white hover:opacity-90',
  }
  const inlineBg = variant === 'naver' ? { backgroundColor: '#03C75A' } : undefined
  return (
    <a
      href={href}
      style={inlineBg}
      className={`w-full flex items-center justify-center gap-3 px-4 py-2.5
                  rounded-[1px] t-caption transition-colors duration-150
                  ${variants[variant]}`}
    >
      <SocialIcon variant={variant} />
      {label}
    </a>
  )
}

function SocialIcon({ variant }: { variant: 'google' | 'apple' | 'naver' }) {
  if (variant === 'google') return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
  if (variant === 'apple') return (
    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="white">
      <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
    </svg>
  )
}
