import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useRef, useState } from 'react'
import PublicNavbar from '../components/PublicNavbar'

export default function LandingPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('ko') ? 'ko' : 'en'
  const ss = (name: string, ext: string = 'webp') => `./screenshots/${name}_${lang}.${ext}`
  const [scrollY, setScrollY] = useState(0)
  const featuresRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const features = [
    {
      number: '01',
      title: t('landing.feature1Title'),
      desc: t('landing.feature1Desc'),
      visual: (
        <div className="w-full aspect-[16/9] rounded overflow-hidden shadow-md relative">
          <div
            className="absolute inset-x-0 top-0"
            //style={{ animation: 'slowScroll 8s ease-in-out infinite alternate' }}
          >
            <img
              src={ss('screenshot-story')}
              alt="Story structure"
              className="w-full"
            />
          </div>
        </div>
      ),
    },
    {
      number: '02',
      title: t('landing.feature2Title'),
      desc: t('landing.feature2Desc'),
      visual: (
        <div className="w-full aspect-[16/9] rounded overflow-hidden shadow-md">
          <img
            src={ss('screenshot-electron-1', 'gif')}
            alt="Desktop app"
            className="w-full h-full object-cover object-top"
          />
        </div>
      ),
    },
    {
      number: '03',
      title: t('landing.feature3Title'),
      desc: t('landing.feature3Desc'),
      visual: (
        <div className="w-full aspect-[16/9] rounded overflow-hidden shadow-md">
          <img
            src={ss('screenshot-notes')}
            alt="Project notes"
            className="w-full h-full object-cover object-top"
          />
        </div>
      ),
    },
    {
      number: '04',
      title: t('landing.feature4Title'),
      desc: t('landing.feature4Desc'),
      visual: (
        <div className="w-full aspect-[16/9] rounded overflow-hidden shadow-md">
          <img
            src={ss('screenshot-photos')}
            alt="Photo curation workflow"
            className="w-full h-full object-cover object-top"
          />
        </div>
      ),
    },
    {
      number: '05',
      title: t('landing.feature5Title'),
      desc: t('landing.feature5Desc'),
      visual: (
        <div className="w-full aspect-[16/9] rounded overflow-hidden shadow-md">
          <img
            src={ss('screenshot-portfolio', 'gif')}
            alt="Public portfolio"
            className="w-full h-full object-cover object-top"
          />
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-canvas text-ink">

      {/* ─── 아래 스타일 코드를 추가하세요 ─── */}
      <style>{`
        @keyframes slowScroll {
          from { transform: translateY(0); }
          to   { transform: translateY(-15%); } /* -20%에서 -12%로 변경: 숫자를 줄일수록 덜 올라갑니다 */
        }
      `}</style>
      {/* ─────────────────────────────────── */}

      <PublicNavbar />

      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-32 relative overflow-hidden">

        {/* 배경 그리드 장식 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to bottom, #E7E3DE 1px, transparent 1px), linear-gradient(90deg, #e7e3de 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            opacity: 0.4,
            transform: `translateY(${scrollY * 0.1}px)`,
          }}
        />

        {/* 메인 텍스트 */}
        <div className="relative z-10 text-center max-w-4xl">
          <p className="text-body md:text-h3 tracking-[0.3em] text-faint uppercase mb-6">
            {t('landing.heroEyebrow')}
          </p>
          <h1
            className="text-h1 md:text-display font-serif font-bold leading-tight mb-6 text-ink break-keep"
            style={{ letterSpacing: '-0.02em' }}
          >
            {t('landing.heroTitle')}
          </h1>
          <h1
            className="text-h1 md:text-display font-serif font-bold leading-tight mb-8 text-ink break-keep"
            style={{ letterSpacing: '-0.02em' }}
          >
            {t('landing.heroTitle2')}
          </h1>
          <p className="text-h3 md:text-h2 text-muted leading-relaxed mb-10 max-w-xl mx-auto break-keep">
            {t('landing.heroSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-8 py-3.5 min-w-48 text-body font-serif font-semibold btn-primary tracking-widest transition-all duration-200 shadow rounded"
            >
              {t('landing.ctaPrimary')}
            </Link>
            <button
              onClick={() => featuresRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-3.5 min-w-48 text-body font-serif font-semibold btn-secondary-on-card transition-all duration-200 rounded"
            >
              {t('landing.ctaSecondary')}
            </button>
          </div>
          <p className="mt-6 text-base text-muted tracking-wider">
            {t('landing.betaBadge')}
          </p>
        </div>

        {/* 스크롤 힌트 */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
          <div className="w-px h-12 bg-muted animate-pulse" />
        </div>
      </section>

      {/* App Demo */}
      <section className="py-16 px-6 bg-canvas">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs tracking-[0.3em] text-stone-400 uppercase mb-3">{t('landing.demoEyebrow')}</p>
            <h2 className="text-2xl md:text-3xl font-bold text-ink">
              {t('landing.demoTitle')}
            </h2>
          </div>

          {/* 메인 스크린샷 */}
          <div className="rounded-card overflow-hidden shadow border border-hair mb-6">
            <img
              src={ss('screenshot-main')}
              alt="Racconto app"
              className="w-full object-cover object-top"
            />
          </div>

          {/* 서브 스크린샷 2개 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-card overflow-hidden shadow border border-hair">
              <img
                src={ss('screenshot-lightbox')}
                alt="Lightbox view"
                className="w-full object-cover"
              />
            </div>
            <div className="rounded-card overflow-hidden shadow border border-hair">
              <img
                src={ss('screenshot-note-panel')}
                alt="Note panel"
                className="w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section ref={featuresRef} className="py-24 px-6 bg-canvas-2">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm tracking-[0.3em] text-faint uppercase mb-3">
              {t('landing.featuresEyebrow')}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-ink">
              {t('landing.featuresTitle')}
            </h2>
          </div>

          <div className="flex flex-col gap-20">
            {features.map((feature, index) => (
              <div
                key={feature.number}
                className={`flex flex-col md:flex-row md:items-center gap-10 md:gap-16 ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}
              >
                <div className="w-full md:w-3/5 shrink-0 shadow">
                  {feature.visual}
                </div>
                <div className="w-full md:w-2/5">
                  <span className="text-menu text-faint font-mono tracking-widest block mb-3">{feature.number}</span>
                  <h3 className="text-h2 font-semibold text-ink mb-3">{feature.title}</h3>
                  <p className="text-h3 text-muted [word-break:keep-all] leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Beta CTA */}
      <section className="py-24 px-6 bg-ink text-white">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-base tracking-[0.3em] text-faint uppercase mb-4">{t('landing.betaEyebrow')}</p>
          <h2 className="text-2xl md:text-4xl font-semibold mb-4">
            {t('landing.betaTitle')}
          </h2>
          <p className="text-faint mb-2 text-sm leading-relaxed">
            {t('landing.betaDesc')}
          </p>
          <p className="text-faint mb-10 text-xs">
            {t('landing.betaLimit')}
          </p>
          <Link
            to="/register"
            className="inline-block px-10 py-4 bg-card text-ink-2 text-sm tracking-widest font-semibold hover:bg-ink-2 hover:text-hair transition-[background,color,border] duration-150 ease-out rounded"
          >
            {t('landing.ctaPrimary')}
          </Link>
          <p className="mt-6 text-xs text-faint">
            {t('landing.alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-hair hover:text-muted underline underline-offset-2">
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-ink border-t border-hair">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-ink text-sm tracking-widest">
            Racconto
          </span>
          <p className="text-muted text-xs">© 2026 Racconto. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}