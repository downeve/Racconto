import { useTranslation } from 'react-i18next'

const API_BASE = import.meta.env.VITE_API_URL || 'https://racconto.app/api'

interface Props {
  mode?: 'login' | 'register'
  className?: string
}

type Provider = 'google' | 'apple' | 'naver' | 'line'

const ORDER_BY_LANG: Record<string, Provider[]> = {
  ko: ['naver', 'google', 'apple', 'line'],
  en: ['google', 'apple', 'naver', 'line'],
  ja: ['line', 'apple', 'google', 'naver'],
}

export function SocialAuthButtons({ mode = 'login', className = '' }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('ko') ? 'ko' : i18n.language.startsWith('ja') ? 'ja' : 'en'
  const order = ORDER_BY_LANG[lang]

  return (
    <div className={className}>
      <Divider label={t('auth.or')} />
      <div className="mt-6 grid grid-cols-2 gap-2.5">
        {order.map(provider => (
          <SocialButton
            key={provider}
            href={`${API_BASE}/auth/${provider}/${mode}`}
            variant={provider}
            label={t(`auth.${provider}`)}
          />
        ))}
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

type Variant = Provider

interface SocialButtonProps {
  href: string
  variant: Variant
  label: string
}

function SocialButton({ href, variant, label }: SocialButtonProps) {
  const variants: Record<Variant, string> = {
    google: 'border border-edit-line text-edit-ink hover:border-edit-line-strong hover:bg-edit-paper',
    apple:  'bg-edit-ink text-edit-paper hover:bg-edit-ink/85 border border-edit-ink',
    naver:  'text-white hover:opacity-90',
    line:   'text-white hover:opacity-90',
  }
  const inlineBg =
    variant === 'naver' ? { backgroundColor: '#03C75A' } :
    variant === 'line'  ? { backgroundColor: '#06C755' } :
    undefined
  return (
    <a
      href={href}
      style={inlineBg}
      className={`flex items-center justify-center gap-2 px-3 py-2.5
                  rounded-[1px] t-caption transition-colors duration-150
                  ${variants[variant]}`}
    >
      <SocialIcon variant={variant} />
      {label}
    </a>
  )
}

function SocialIcon({ variant }: { variant: Variant }) {
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
  if (variant === 'naver') return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="white">
      <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
    </svg>
  )
  // LINE (Simple Icons path)
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="white">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.627.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M12 0C5.373 0 0 4.973 0 11.09c0 5.427 4.191 9.963 9.892 10.912.385.082.906.258 1.038.594.12.302.078.775.038 1.08l-.164 1.02c-.05.302-.244 1.189.044 1.298.291.107 1.543-.599 2.141-.951 1.814-1.069 3.338-2.394 4.562-3.96C18.898 18.803 24 15.14 24 11.09 24 4.973 18.627 0 12 0"/>
    </svg>
  )
}
