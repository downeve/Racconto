import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useRef, useState } from 'react'
import PublicNavbar from '../components/PublicNavbar'

interface FeatureData {
  number: string
  tag: string
  title: string
  desc: string
  screenshotSrc: string
  screenshotAlt: string
  isDesktop?: boolean
}

function MobileFeatureCard({ feature, index }: { feature: FeatureData; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-600 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
      style={{ transitionDelay: `${index * 50}ms` }}
    >
      <div className="rounded-lg overflow-hidden shadow-lg border border-stone-200 bg-stone-50 mb-4">
        <img
          src={feature.screenshotSrc}
          alt={feature.screenshotAlt}
          className="w-full object-cover object-top"
        />
      </div>
      <p className="text-xs tracking-[0.25em] text-stone-400 uppercase mb-2">
        <span className="font-mono mr-2 text-stone-300">{feature.number}</span>
        {feature.tag}
      </p>
      <h3
        className="text-xl font-bold text-stone-900 mb-3 leading-snug"
        style={{ fontFamily: "'Georgia', serif" }}
      >
        {feature.title}
      </h3>
      <p className="text-sm text-stone-500 leading-relaxed">{feature.desc}</p>

      {feature.isDesktop && (
        <div className="mt-4 rounded border border-stone-200 bg-[#F7F4F0] px-4 py-4">
          <p className="text-xs tracking-[0.2em] text-stone-400 uppercase mb-2">
            Desktop App · Beta
          </p>
          <p className="text-xs text-stone-600 leading-relaxed mb-3">
            Free Download for macOS(.dmg) & Windows(.exe)
          </p>
          <div className="flex gap-2">
            <a
              href="/downloads/Racconto.dmg"
              className="flex-1 text-center py-2 bg-stone-900 text-white text-xs tracking-widest rounded"
            >
              macOS
            </a>
            <a
              href="/downloads/Racconto-Setup.exe"
              className="flex-1 text-center py-2 border border-stone-300 text-stone-700 text-xs tracking-widest rounded"
            >
              Windows
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MobileFeaturesPage() {
  const { t } = useTranslation()

  const FEATURES: FeatureData[] = [
    {
      number: '01',
      tag: 'Story Structure',
      title: t('landing.feature.feature1DetailTitle'),
      desc: t('landing.feature.feature1DetailDesc'),
      screenshotAlt: 'Story structure screenshot',
      screenshotSrc: './screenshots/screenshot-story.webp',
    },
    {
      number: '02',
      tag: 'Desktop App',
      title: t('landing.feature.feature2DetailTitle'),
      desc: t('landing.feature.feature2DetailDesc'),
      screenshotAlt: 'Desktop app screenshot',
      screenshotSrc: './screenshots/screenshot-electron-2.webp',
      isDesktop: true,
    },
    {
      number: '03',
      tag: 'Project Notes',
      title: t('landing.feature.feature3DetailTitle'),
      desc: t('landing.feature.feature3DetailDesc'),
      screenshotAlt: 'Notes screenshot',
      screenshotSrc: './screenshots/screenshot-notes.webp',
    },
    {
      number: '04',
      tag: 'Photo Curation',
      title: t('landing.feature.feature4DetailTitle'),
      desc: t('landing.feature.feature4DetailDesc'),
      screenshotAlt: 'Photo curation screenshot',
      screenshotSrc: './screenshots/screenshot-photos.webp',
    },
    {
      number: '05',
      tag: 'Public Portfolio',
      title: t('landing.feature.feature5DetailTitle'),
      desc: t('landing.feature.feature5DetailDesc'),
      screenshotAlt: 'Portfolio screenshot',
      screenshotSrc: './screenshots/screenshot-portfolio.webp',
    },
  ]

  return (
    <div
      className="min-h-screen bg-[#F7F4F0] text-stone-900"
      style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
    >
      <PublicNavbar />

      {/* Header */}
      <section className="pt-28 pb-10 px-6 text-center">
        <p className="text-xs tracking-[0.35em] text-stone-400 uppercase mb-4">
          What Racconto does
        </p>
        <h1
          className="text-3xl font-bold text-stone-900 mb-4 leading-tight break-keep"
          style={{ letterSpacing: '-0.02em' }}
        >
          {t('landing.feature.featureDetailTitle')}
        </h1>
        <p
          className="text-sm text-stone-500 leading-relaxed break-keep"
          style={{ fontStyle: 'italic' }}
        >
          {t('landing.feature.featureDetailDesc')}
        </p>
        <div className="flex items-center justify-center gap-4 mt-8">
          <div className="h-px w-12 bg-stone-300" />
          <div className="w-1 h-1 rounded-full bg-stone-400" />
          <div className="h-px w-12 bg-stone-300" />
        </div>
      </section>

      {/* Features */}
      <section className="pb-16 px-6">
        <div className="space-y-16">
          {FEATURES.map((feature, i) => (
            <MobileFeatureCard key={feature.number} feature={feature} index={i} />
          ))}
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
