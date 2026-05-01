import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PublicNavbar from '../components/PublicNavbar'

export default function MobileLandingPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('ko') ? 'ko' : 'en'
  const ss = (name: string) => `./screenshots/${name}_${lang}.webp`

  const features = [
    {
      number: '01',
      title: t('landing.feature1Title'),
      desc: t('landing.feature1Desc'),
      src: ss('screenshot-story'),
      alt: 'Story structure',
    },
    {
      number: '02',
      title: t('landing.feature5Title'),
      desc: t('landing.feature5Desc'),
      src: ss('screenshot-electron-1'),
      alt: 'Desktop app',
    },
    {
      number: '03',
      title: t('landing.feature4Title'),
      desc: t('landing.feature4Desc'),
      src: ss('screenshot-notes'),
      alt: 'Project notes',
    },
    {
      number: '04',
      title: t('landing.feature2Title'),
      desc: t('landing.feature2Desc'),
      src: ss('screenshot-photos'),
      alt: 'Photo curation',
    },
    {
      number: '05',
      title: t('landing.feature3Title'),
      desc: t('landing.feature3Desc'),
      src: ss('screenshot-portfolio'),
      alt: 'Public portfolio',
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
            className="w-full max-w-xs px-6 py-4 bg-stone-900 text-white text-sm tracking-widest text-center rounded"
          >
            {t('landing.ctaPrimary')}
          </Link>
          <Link
            to="/features"
            className="w-full max-w-xs px-6 py-4 border border-stone-300 text-stone-600 text-sm tracking-widest text-center rounded"
          >
            {t('landing.ctaSecondary')}
          </Link>
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
      <section className="py-12 px-6 bg-white">
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
                <img
                  src={feature.src}
                  alt={feature.alt}
                  className="w-full object-cover object-top"
                />
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
            </div>
          ))}
        </div>
      </section>

      {/* Desktop notice */}
      <section className="py-10 px-6 bg-[#F7F4F0]">
        <div className="rounded-lg border border-stone-200 bg-white px-5 py-6 text-center">
          <p className="text-2xl mb-3">🖥️</p>
          <p className="text-sm font-semibold text-stone-800 mb-2 break-keep">
            {t('landing.desktopOptimizationInfo')}
          </p>
          <p className="text-xs text-stone-500 leading-relaxed mb-5 break-keep">
            {t('landing.desktopOptimizationDesc')}
          </p>
          <div className="flex flex-col gap-3">
            <a
              href="https://racconto.app#download"
              className="px-5 py-3 bg-stone-900 text-white text-xs tracking-widest rounded"
            >
              {t('landing.downloadDesktopApp')}
            </a>
            <a
              href="https://racconto.app"
              className="px-5 py-3 border border-stone-300 text-stone-700 text-xs tracking-widest rounded"
            >
              {t('landing.openInBrowser')}
            </a>
          </div>
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
        <p className="text-stone-400 mb-2 text-sm leading-relaxed">
          {t('landing.betaDesc')}
        </p>
        <p className="text-stone-500 mb-8 text-xs">
          {t('landing.betaLimit')}
        </p>
        <Link
          to="/register"
          className="inline-block w-full max-w-xs px-8 py-4 bg-white text-stone-900 text-sm tracking-widest font-semibold rounded"
        >
          {t('landing.ctaPrimary')}
        </Link>
        <p className="mt-5 text-xs text-stone-500">
          {t('landing.alreadyHaveAccount')}{' '}
          <Link to="/login" className="text-stone-300 underline underline-offset-2">
            {t('auth.login')}
          </Link>
        </p>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 bg-stone-900 border-t border-stone-800 flex items-center justify-between">
        <span className="text-stone-500 text-sm tracking-widest">Racconto</span>
        <p className="text-stone-600 text-xs">© 2026 Racconto.</p>
      </footer>
    </div>
  )
}
