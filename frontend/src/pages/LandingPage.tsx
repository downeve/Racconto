import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useRef } from 'react'
import { ArrowDown, Monitor, ArrowUpRight } from 'lucide-react'
import PublicNavbar from '../components/PublicNavbar'
import { Wordmark } from '../components/Wordmark'

export default function LandingPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('ko') ? 'ko' : i18n.language.startsWith('ja') ? 'ja' : 'en'
  const ss = (name: string, ext: string = 'webp') => `./screenshots/${name}_${lang}.${ext}`
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
      image: ss('screenshot-story', 'gif'),
      imageAlt: 'Story structure',
    },
    {
      key: 'desktop',
      title: t('landing.feature2Title'),
      desc: t('landing.feature2Desc'),
      image: ss('screenshot-electron-1', 'gif'),
      imageAlt: 'Desktop app',
    },
    {
      key: 'notes',
      title: t('landing.feature3Title'),
      desc: t('landing.feature3Desc'),
      image: ss('screenshot-notes'),
      imageAlt: 'Project notes',
    },
    {
      key: 'curation',
      title: t('landing.feature4Title'),
      desc: t('landing.feature4Desc'),
      image: ss('screenshot-photos'),
      imageAlt: 'Photo curation',
    },
    {
      key: 'portfolio',
      title: t('landing.feature5Title'),
      desc: t('landing.feature5Desc'),
      image: ss('screenshot-portfolio', 'gif'),
      imageAlt: 'Public portfolio',
    },
  ]

  return (
    <div className="min-h-screen bg-edit-canvas text-edit-ink">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative min-h-[88vh] flex items-center pt-14 px-6 md:px-12 overflow-hidden">
        {/* Grid lines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
          aria-hidden
        />
        {/* Radial vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 20%, rgba(0,0,0,0.025) 0%, transparent 60%)',
          }}
          aria-hidden
        />

        <div className="relative max-w-5xl mx-auto text-center w-full">
          <p className="text-menu md:text-small font-mono tracking-[0.18em] uppercase text-edit-muted mb-6">
            {t('landing.heroEyebrow')}
          </p>
          <h1 className="font-serif text-h1 md:text-display text-edit-ink
                         font-normal tracking-tight leading-[1.05] mb-8 break-keep">
            {t('landing.heroTitle')}<br />{t('landing.heroTitle2')}
          </h1>
          <p className="font-serif text-h3 md:text-h2 text-edit-muted
                        leading-[1.65] mb-12 max-w-xl mx-auto break-keep">
            {t('landing.heroSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            <Link
              to="/register"
              className="px-8 py-3.5 bg-edit-ink text-edit-paper
                         t-caption tracking-[0.08em] rounded-[1px]
                         hover:bg-edit-ink/85 transition-colors duration-150"
            >
              {t('landing.ctaPrimaryPre')}<span className="font-serif">Racconto</span>{t('landing.ctaPrimaryPost')}
            </Link>
            <button
              onClick={scrollToFeatures}
              className="t-caption tracking-[0.08em] text-edit-muted hover:text-edit-ink
                         inline-flex items-center gap-2 transition-colors group"
            >
              {t('landing.ctaSecondary')}
              <ArrowDown size={11} strokeWidth={1.5}
                         className="transition-transform group-hover:translate-y-0.5" />
            </button>
          </div>
          <p className="mt-8 text-caption font-mono tracking-[0.18em] uppercase font-medium text-edit-faint">{t('landing.betaBadge')}</p>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-30">
          <div className="w-px h-12 bg-edit-ink animate-pulse" />
        </div>
      </section>

      {/* App Demo */}
      <section className="bg-edit-canvas px-6 md:px-12 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-caption font-mono tracking-[0.18em] uppercase font-medium text-edit-muted mb-3">{t('landing.demoEyebrow')}</p>
            <h2 className="font-serif text-h2 text-edit-ink font-normal tracking-tight">
              {t('landing.demoTitle')}
            </h2>
          </div>

          <figure className="mb-12">
            <img
              src={ss('screenshot-main')}
              alt="Racconto app"
              className="w-full block border border-edit-line"
            />
            <figcaption className="t-caption text-edit-faint mt-4 text-center max-w-md mx-auto break-keep">
              {t('landing.mainCaption')}
            </figcaption>
          </figure>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
            <figure>
              <img src={ss('screenshot-lightbox')} alt="Lightbox view" className="w-full block border border-edit-line" />
              <figcaption className="t-caption text-edit-faint mt-3 text-center break-keep">
                {t('landing.lightboxCaption')}
              </figcaption>
            </figure>
            <figure>
              <img src={ss('screenshot-note-panel')} alt="Note panel" className="w-full block border border-edit-line" />
              <figcaption className="t-caption text-edit-faint mt-3 text-center break-keep">
                {t('landing.coverCaption')}
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Features Z-pattern */}
      <section ref={featuresRef} className="bg-edit-paper px-6 md:px-12 py-24">
        <div className="max-w-6xl mx-auto">
          <header className="text-center mb-20">
            <p className="text-caption font-mono tracking-[0.18em] uppercase font-medium text-edit-muted mb-4">{t('landing.featuresEyebrow')}</p>
            <h2 className="font-serif text-h1 text-edit-ink font-normal tracking-tight break-keep">
              {t('landing.featuresTitle')}
            </h2>
          </header>

          <div className="space-y-32">
            {features.map((f, i) => (
              <div
                key={f.key}
                className={`grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center
                            ${i % 2 === 1 ? 'md:[&>*:first-child]:order-2' : ''}`}
              >
                {/* 이미지 — 65% */}
                <div className="md:col-span-8">
                  <img src={f.image} alt={f.imageAlt} className="w-full block border border-edit-line" />
                </div>
                {/* 텍스트 — 35% */}
                <div className="md:col-span-4">
                  <h3 className="font-serif text-h2 text-edit-ink font-normal tracking-tight mb-4 break-keep">
                    {f.title}
                  </h3>
                  <p className="font-serif text-body text-edit-ink/80 leading-[1.7] break-keep">
                    {f.desc}
                  </p>
                  {f.key === 'desktop' && <DesktopAppInlineLink t={t} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Beta CTA — 다크 섹션 */}
      <section className="bg-edit-ink text-edit-paper px-6 md:px-12 py-32">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-caption font-mono tracking-[0.18em] uppercase font-medium text-edit-paper/60 mb-4">{t('landing.betaEyebrow')}</p>
          <h2 className="font-serif text-h1 md:text-display font-normal tracking-tight mb-6 break-keep">
            {t('landing.betaTitle')}
          </h2>
          <p className="font-serif text-body md:text-h3 text-edit-paper/75 leading-[1.65] mb-4 break-keep">
            {t('landing.betaDesc')}
          </p>
          <p className="text-caption font-mono tracking-[0.18em] uppercase font-medium text-edit-paper/40 mb-12">{t('landing.betaLimit')}</p>
          <Link
            to="/register"
            className="inline-block px-10 py-4 bg-edit-paper text-edit-ink
                       t-caption tracking-[0.08em] rounded-[1px]
                       hover:bg-edit-paper/90 transition-colors duration-150"
          >
            {t('landing.ctaPrimaryPre')}<span className="font-serif">Racconto</span>{t('landing.ctaPrimaryPost')}
          </Link>
          <p className="mt-6 t-caption text-edit-paper/50">
            {t('landing.alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-edit-paper/70 hover:text-edit-paper underline underline-offset-2 transition-colors">
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-16 border-t border-edit-line bg-edit-canvas">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Wordmark size="sm" asLink={false} />
          <p className="t-caption text-edit-faint">© {new Date().getFullYear()} Racconto</p>
        </div>
      </footer>
    </div>
  )
}

function DesktopAppInlineLink({ t }: { t: (key: string) => string }) {
  return (
    <div className="mt-8 pt-6 border-t border-edit-line">
      <p className="text-caption font-mono tracking-[0.18em] uppercase font-medium text-edit-muted mb-3">
        {t('landing.desktopApp')} · Beta
      </p>
      <Link
        to="/download"
        className="inline-flex items-center gap-2 t-caption text-edit-ink
                   hover:text-edit-muted transition-colors group"
      >
        <Monitor size={13} strokeWidth={1.5} />
        macOS · Windows
        <ArrowUpRight size={11} strokeWidth={1.5}
          className="ml-1 transition-transform
                     group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Link>
      <p className="t-caption text-edit-faint mt-2 break-keep">
        {t('landing.dlNote')}
      </p>
    </div>
  )
}
