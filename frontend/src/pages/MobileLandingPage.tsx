import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useRef } from 'react'
import PublicNavbar from '../components/PublicNavbar'

export default function MobileLandingPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('ko') ? 'ko' : 'en'
  const ss = (name: string, ext: string = 'webp') => `./screenshots/${name}_${lang}.${ext}`
  const featuresRef = useRef<HTMLDivElement>(null)
  

  const features = [
    {
      number: '01',
      title: t('landing.feature1Title'),
      desc: t('landing.feature1Desc'),
      visual: (
        <img
          src={ss('screenshot-story', 'gif')}
          alt="Story structure"
          className="w-full object-cover object-top"
        />
      ),
    },
    {
      number: '02',
      title: t('landing.feature2Title'),
      desc: t('landing.feature2Desc'),
      visual: (
        <img
          src={ss('screenshot-electron-1', 'gif')}
          alt="Desktop app"
          className="w-full object-cover object-top"
        />
      ),
    },
    {
      number: '03',
      title: t('landing.feature3Title'),
      desc: t('landing.feature3Desc'),
      visual: (
        <img
          src={ss('screenshot-notes')}
          alt="Project notes"
          className="w-full object-cover object-top"
        />
      ),
    },
    {
      number: '04',
      title: t('landing.feature4Title'),
      desc: t('landing.feature4Desc'),
      visual: (
        <img
          src={ss('screenshot-photos')}
          alt="Photo curation"
          className="w-full object-cover object-top"
        />
      ),
    },
    {
      number: '05',
      title: t('landing.feature5Title'),
      desc: t('landing.feature5Desc'),
      visual: (
        <img
          src={ss('screenshot-portfolio', 'gif')}
          alt="Public portfolio"
          className="w-full object-cover object-top"
        />
      ),
    },
  ]

  return (
    <div
      className="min-h-screen bg-canvas text-ink"
    >
      <PublicNavbar />

      {/* Hero */}
      <section className="pt-28 pb-16 px-6 text-center">
        <p className="text-xs tracking-[0.3em] text-stone-400 uppercase mb-5">
          {t('landing.heroEyebrow')}
        </p>
        <h1
          className="text-4xl font-bold leading-tight mb-3 text-stone-900 break-keep"
          style={{ letterSpacing: '-0.02em' }}
        >
          {t('landing.heroTitle')}
        </h1>
        <h1
          className="text-4xl font-bold leading-tight mb-6 text-stone-900 break-keep"
          style={{ letterSpacing: '-0.02em' }}
        >
          {t('landing.heroTitle2')}
        </h1>
        <p
          className="text-base text-stone-500 leading-relaxed mb-8 break-keep"
          style={{ fontStyle: 'italic' }}
        >
          {t('landing.heroSubtitle')}
        </p>
        <div className="flex flex-col items-center gap-3">
          <Link
            to="/register"
            className="font-serif w-full max-w-xs px-6 py-4 bg-stone-900 text-white text-sm tracking-widest text-center rounded"
            style={{
              fontWeight: 700,
              letterSpacing: '0.08em',
              transform: 'translateY(1px)',
            }}
          >
            {t('landing.ctaPrimary')}
          </Link>
          <button
            onClick={() => featuresRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="w-full max-w-xs px-6 py-4 border border-stone-300 text-stone-600 text-sm tracking-widest text-center rounded"
          >
            {t('landing.ctaSecondary')}
          </button>
        </div>
        <p className="mt-5 text-xs text-stone-400 tracking-wider">
          {t('landing.betaBadge')}
        </p>
      </section>

      {/* Screenshot */}
      <section className="pb-12 px-6">
        <p className="text-xs tracking-[0.3em] text-stone-400 uppercase mb-3 text-center">
          {t('landing.demoEyebrow')}
        </p>
        <p
          className="text-xl font-bold text-stone-900 mb-5 text-center"
        >
          {t('landing.demoTitle')}
        </p>
        <div className="rounded-lg overflow-hidden shadow border border-stone-200">
          <img
            src={ss('screenshot-main')}
            alt="Racconto app"
            className="w-full object-cover object-top"
          />
        </div>
      </section>

      {/* Features */}
       <section ref={featuresRef} className="py-12 px-6 bg-white">
        <div className="text-center mb-10">
          <p className="text-xs tracking-[0.3em] text-stone-400 uppercase mb-2">
            {t('landing.featuresEyebrow')}
          </p>
          <h2 className="text-2xl font-bold text-stone-900">
            {t('landing.featuresTitle')}
          </h2>
        </div>

        <div className="space-y-10">
          {features.map((feature) => (
            <div key={feature.number}>
              <div className="rounded-lg overflow-hidden shadow border border-stone-200 mb-4">
                {feature.visual}
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xs text-stone-300 font-mono tracking-widest">
                  {feature.number}
                </span>
                <h3 className="text-base font-semibold text-stone-900">
                  {feature.title}
                </h3>
              </div>
              <p className="text-sm text-stone-500 leading-relaxed pl-7">
                {feature.desc}
              </p>
                  {feature.number === '02' && (
                  <div className="mt-4 rounded border border-stone-200 bg-canvas px-6 py-5 flex flex-col sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-small tracking-[0.2em] text-muted font-semibold uppercase mb-2">Desktop App · Beta</p>
                    <p className="text-small text-ink-2 leading-relaxed mb-4">
                      Free Download for macOS(.dmg) & Windows(.exe).
                    </p>
                    <div className="flex flex-wrap gap-3">
                    <Link
                      to="/download"
                      className="inline-flex items-center gap-2 px-4 py-2 border border-stone-300 text-stone-700 text-xs tracking-widest rounded hover:border-stone-500 hover:text-stone-900 transition-[background,color,border] duration-150 ease-out"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                      </svg>
                      macOS /
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 12V6.75l6-1.32v6.57H3zm17 0V5l-9 1.68V12h9zm-17 1h6v6.08L3 17.75V13zm17 0v7l-9-1.71V13h9z" />
                      </svg>
                      Windows Download
                    </Link>
                    </div>
                  </div>
                  </div>
                  )}
            </div>
          ))}
        </div>
      </section>

      {/* Desktop notice */}
      <section className="py-10 px-6 bg-canvas">
        <div className="rounded-lg border border-hair bg-white px-5 py-6 text-center">
          <p className="text-2xl mb-3">🖥️</p>
          <p className="text-sm font-semibold text-stone-800 mb-2 break-keep">
            {t('landing.desktopOptimizationInfo')}
          </p>
          <p className="text-xs text-stone-500 leading-relaxed mb-5 break-keep">
            {t('landing.desktopOptimizationDesc')}
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-stone-900 text-white text-center">
        <p className="text-xs tracking-[0.3em] text-stone-400 uppercase mb-4">
          {t('landing.betaEyebrow')}
        </p>
        <h2 className="text-2xl font-bold mb-3">
          {t('landing.betaTitle')}
        </h2>
        <p className="text-faint mb-2 text-small leading-relaxed">
          {t('landing.betaDesc')}
        </p>
        <p className="text-muted mb-8 text-caption">
          {t('landing.betaLimit')}
        </p>
        <Link
          to="/register"
          className="inline-block w-full max-w-xs px-8 py-4 bg-card text-ink text-sm tracking-widest font-semibold rounded"
            style={{
              fontWeight: 700,
              letterSpacing: '0.08em',
              transform: 'translateY(1px)',
            }}
        >
          {t('landing.ctaPrimary')}
        </Link>
        <p className="mt-5 text-xs text-muted">
          {t('landing.alreadyHaveAccount')}{' '}
          <Link to="/login" className="text-stone-300 underline underline-offset-2">
            {t('auth.login')}
          </Link>
        </p>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 bg-ink border-t border-stone-800 flex items-center justify-between">
        <span className="text-muted text-small tracking-widest">Racconto</span>
        <p className="text-stone-600 text-xs">© 2026 Racconto.</p>
      </footer>
    </div>
  )
}