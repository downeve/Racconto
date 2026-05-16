import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useRef } from 'react'
import { Monitor, ArrowDown } from 'lucide-react'
import PublicNavbar from '../components/PublicNavbar'

export default function MobileLandingPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('ko') ? 'ko' : i18n.language.startsWith('ja') ? 'ja' : 'en'
  const ss = (name: string, ext: string = 'webp') => `./screenshots/${name}_${lang}.${ext}`
  const sv = (name: string) => `./screenshots/${name}_${lang}`
  // 한국어만 word-break: keep-all 적용 (어절 단위 줄바꿈). 일본어는 공백이 없어 단일 단어로
  // 처리되며 horizontal overflow를 일으키므로 제외. 영어는 공백이 있어 영향 없음.
  const breakKeep = lang === 'ko' ? 'break-keep' : ''
  const featuresRef = useRef<HTMLDivElement>(null)

  const scrollToFeatures = () => {
    const el = featuresRef.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 24
    window.scrollTo({ top, behavior: 'smooth' })
  }

  const features = [
    {
      key: 'story',
      title: t('landing.feature1Title'),
      desc: t('landing.feature1Desc'),
      video: sv('screenshot-story'),
    },
    {
      key: 'desktop',
      title: t('landing.feature2Title'),
      desc: t('landing.feature2Desc'),
      video: sv('screenshot-electron-1'),
    },
    {
      key: 'notes',
      title: t('landing.feature3Title'),
      desc: t('landing.feature3Desc'),
      image: ss('screenshot-notes'),
    },
    {
      key: 'curation',
      title: t('landing.feature4Title'),
      desc: t('landing.feature4Desc'),
      image: ss('screenshot-photos'),
    },
    {
      key: 'portfolio',
      title: t('landing.feature5Title'),
      desc: t('landing.feature5Desc'),
      video: sv('screenshot-portfolio'),
    },
  ]

  return (
    <div className="min-h-screen bg-edit-canvas text-edit-ink">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative px-6 pt-28 pb-16 overflow-hidden">
        {/* Grid lines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
          aria-hidden
        />
        <p className="relative text-menu font-mono tracking-[0.18em] uppercase text-edit-muted mb-5 text-center">{t('landing.heroEyebrow')}</p>
        <h1 className={`relative font-serif text-h1 text-edit-ink font-normal tracking-tight
                       leading-[1.1] mb-6 ${breakKeep} text-center`}>
          {t('landing.heroTitle')}<br />{t('landing.heroTitle2')}
        </h1>
        <p className={`relative font-serif text-h2 text-edit-ink/75 leading-[1.65] mb-10 text-center ${breakKeep}`}>
          {t('landing.heroSubtitle')}
        </p>
        <Link
          to="/register"
          className="block w-full max-w-xs mx-auto px-6 py-4
                     bg-edit-ink text-edit-paper text-center
                     t-caption tracking-[0.08em] rounded-[1px]
                     hover:bg-edit-ink/85 transition-colors mb-3"
        >
          {t('landing.ctaPrimaryPre')}<span className="font-serif">Racconto</span>{t('landing.ctaPrimaryPost')}
        </Link>
        <button
          onClick={scrollToFeatures}
          className="flex items-center justify-center gap-2 w-full t-caption text-edit-muted hover:text-edit-ink transition-colors"
        >
          {t('landing.ctaSecondary')}
          <ArrowDown size={11} strokeWidth={1.5} />
        </button>
        <p className="mt-5 t-eyebrow text-edit-faint text-center">{t('landing.betaBadge')}</p>
      </section>

      {/* Demo screenshot */}
      <section className="bg-edit-canvas px-6 pb-16 text-center">
        <p className="t-eyebrow text-edit-muted mb-3">{t('landing.demoEyebrow')}</p>
        <h2 className="font-serif text-h2 text-edit-ink font-normal tracking-tight mb-5">
          {t('landing.demoTitle')}
        </h2>
        <img
          src={ss('screenshot-main-mobile')}
          alt="Racconto app"
          className="w-full block border border-edit-line"
        />
      </section>

      {/* Features */}
      <section ref={featuresRef} className="bg-edit-paper px-6 py-12">
        <div className="text-center mb-10">
          <p className="t-eyebrow text-edit-muted mb-2">{t('landing.featuresEyebrow')}</p>
          <h2 className={`font-serif text-h2 text-edit-ink font-normal tracking-tight whitespace-pre-line ${breakKeep}`}>
            {t('landing.featuresTitle')}
          </h2>
        </div>

        <div className="space-y-16">
          {features.map(f => (
            <div key={f.key} className="text-center">
              <h3 className={`font-serif text-h2 text-edit-ink font-normal
                             tracking-tight leading-[1.15] mb-4 whitespace-pre-line ${breakKeep}`}>
                {f.title}
              </h3>
              <p className={`font-serif text-body text-edit-ink/75 leading-[1.7] ${breakKeep}`}>
                {f.desc}
              </p>
              {f.video ? (
                <video autoPlay muted loop playsInline className="w-full mt-6 block border border-edit-line">
                  <source src={`${f.video}.webm`} type="video/webm" />
                  <source src={`${f.video}.mp4`} type="video/mp4" />
                </video>
              ) : f.image ? (
                <img src={f.image} alt={f.title} className="w-full mt-6 block border border-edit-line" />
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* 데스크톱 안내 */}
      <section className="px-6 py-12">
        <div className="border border-edit-line bg-edit-paper-2 rounded-[1px]
                        px-5 py-7 text-center max-w-sm mx-auto">
          <Monitor size={28} strokeWidth={1.25} className="mx-auto mb-4 text-edit-muted" />
          <p className={`font-serif text-h3 text-edit-ink mb-2 ${breakKeep}`}>
            {t('landing.desktopOptimizationInfo')}
          </p>
          <p className={`text-body text-edit-muted leading-relaxed ${breakKeep}`}>
            {t('landing.desktopOptimizationDesc')}
          </p>
        </div>
      </section>

      {/* Beta CTA */}
      <section className="bg-edit-ink text-edit-paper px-6 py-16 text-center">
        <p className="t-eyebrow text-edit-paper/60 mb-4">{t('landing.betaEyebrow')}</p>
        <h2 className={`font-serif text-h2 font-normal tracking-tight mb-3 ${breakKeep}`}>
          {t('landing.betaTitle')}
        </h2>
        <p className={`text-body text-edit-paper/75 leading-relaxed mb-2 ${breakKeep}`}>
          {t('landing.betaDesc')}
        </p>
        <p className="t-eyebrow text-edit-paper/40 mb-10">{t('landing.betaLimit')}</p>
        <Link
          to="/register"
          className="block w-full max-w-xs mx-auto px-6 py-4
                     bg-edit-paper text-edit-ink text-center
                     t-caption tracking-[0.08em] rounded-[1px]
                     hover:bg-edit-paper/90 transition-colors mb-5"
        >
          {t('landing.ctaPrimaryPre')}<span className="font-serif">Racconto</span>{t('landing.ctaPrimaryPost')}
        </Link>
        <p className="t-caption text-edit-paper/50">
          {t('landing.alreadyHaveAccount')}{' '}
          <Link to="/login" className="text-edit-paper/70 hover:text-edit-paper underline underline-offset-2">
            {t('auth.login')}
          </Link>
        </p>
      </section>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-edit-line flex items-center justify-between">
        <span className="font-serif font-bold text-h3 text-edit-ink tracking-[0.08em]">Racconto</span>
        <p className="t-caption text-edit-faint">© {new Date().getFullYear()} Racconto</p>
      </footer>
    </div>
  )
}
