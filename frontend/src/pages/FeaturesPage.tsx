import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useRef, useState } from 'react'
import PublicNavbar from '../components/PublicNavbar'

// ─── 타입 정의 추가 (이 부분을 통해 FeatureSection과 FeaturesPage가 타입을 공유합니다) ───
interface FeatureData {
  number: string
  tag: string
  title: string
  desc: string
  screenshotAlt: string
  screenshotSrc: string
  animateScroll?: boolean
  isDesktop?: boolean
}

// ─── 다운로드 배너 (기능 05 하단 인라인 배치) ───────────────────────────────
function DownloadBanner() {
  return (
    <div className="mt-6 rounded border border-stone-200 bg-[#F7F4F0] px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <p className="text-xs tracking-[0.2em] text-stone-400 uppercase mb-1">Desktop App · Beta</p>
        <p className="text-sm text-stone-600 leading-relaxed">
          Free Download for macOS(.dmg) & Windows(.exe) install file here.
        </p>
      </div>
      <div className="flex gap-3 shrink-0">
        <a
          href="/downloads/Racconto.dmg"
          className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-xs tracking-widest rounded hover:bg-stone-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          macOS
        </a>
        <a
          href="/downloads/Racconto-Setup.exe"
          className="inline-flex items-center gap-2 px-4 py-2 border border-stone-300 text-stone-700 text-xs tracking-widest rounded hover:border-stone-500 hover:text-stone-900 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 12V6.75l6-1.32v6.57H3zm17 0V5l-9 1.68V12h9zm-17 1h6v6.08L3 17.75V13zm17 0v7l-9-1.71V13h9z" />
          </svg>
          Windows
        </a>
      </div>
    </div>
  )
}

// ─── Feature 카드 ─────────────────────────────────────────────────────────────
// 💡 수정된 부분: (typeof FEATURES)[0] 대신 직접 만든 FeatureData 타입을 사용합니다.
function FeatureSection({
  feature,
  index,
}: {
  feature: FeatureData
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.12 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const isOdd = index % 2 !== 0

  return (
    <div
      ref={ref}
      className={`grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div className={isOdd ? 'md:order-2' : ''}>
        <div className="rounded-lg overflow-hidden shadow-lg border border-stone-200 bg-stone-50">
          <div
            className={feature.animateScroll ? 'w-full' : 'w-full'}
            style={
              feature.animateScroll
                ? { animation: 'slowScroll 8s ease-in-out infinite alternate' }
                : undefined
            }
          >
            <img
              src={feature.screenshotSrc}
              alt={feature.screenshotAlt}
              className="w-full object-cover object-top"
            />
          </div>
        </div>
      </div>

      <div className={isOdd ? 'md:order-1' : ''}>
        <p className="text-xs tracking-[0.25em] text-stone-400 uppercase mb-3">
          <span className="font-mono mr-2 text-stone-300">{feature.number}</span>
          {feature.tag}
        </p>
        <h3
          className="text-2xl md:text-3xl font-bold text-stone-900 mb-4 leading-snug"
          style={{ fontFamily: "'Georgia', serif" }}
        >
          {feature.title}
        </h3>
        <p className="text-stone-500 text-sm md:text-base leading-relaxed">
          {feature.desc}
        </p>

        {feature.isDesktop && (
          <div className="hidden sm:block">
            <DownloadBanner />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function FeaturesPage() {
  const { t } = useTranslation()

  // 💡 타입 안정성을 위해 `FeatureData[]` 타입을 명시해 주면 더 좋습니다.
  const FEATURES: FeatureData[] = [
    {
      number: '01',
      tag: 'Story Structure',
      title: t('landing.feature.feature1DetailTitle'),
      desc: t('landing.feature.feature1DetailDesc'),
      screenshotAlt: 'Story structure screenshot',
      screenshotSrc: './screenshots/screenshot-story.webp',
      animateScroll: true,
    },
    {
      number: '02',
      tag: 'Desktop App',
      title: t('landing.feature.feature2DetailTitle'),
      desc: t('landing.feature.feature2DetailDesc'),
      screenshotAlt: 'Desktop app screenshot',
      screenshotSrc: './screenshots/screenshot-electron.webp',
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
      <style>{`
        @keyframes slowScroll {
          from { transform: translateY(0); }
          to   { transform: translateY(-20%); }
        }
      `}</style>

      <PublicNavbar />

      <section className="pt-32 pb-16 px-6 text-center">
        <p className="text-xs tracking-[0.35em] text-stone-400 uppercase mb-4">
          What Racconto does
        </p>
        <h1
          className="text-4xl md:text-6xl font-bold text-stone-900 mb-5 leading-tight"
          style={{ fontFamily: "'Georgia', serif", letterSpacing: '-0.02em' }}
        >
          {t('landing.feature.featureDetailTitle')}
        </h1>
        <p
          className="text-lg text-stone-500 max-w-xl mx-auto leading-relaxed"
          style={{ fontStyle: 'italic' }}
        >
          {t('landing.feature.featureDetailDesc')}
        </p>

        <div className="flex items-center justify-center gap-4 mt-10">
          <div className="h-px w-16 bg-stone-300" />
          <div className="w-1.5 h-1.5 rounded-full bg-stone-400" />
          <div className="h-px w-16 bg-stone-300" />
        </div>
      </section>

      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto space-y-24">
          {FEATURES.map((feature, i) => (
            <FeatureSection key={feature.number} feature={feature} index={i} />
          ))}
        </div>
      </section>

      <section className="py-24 px-6 bg-stone-900 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs tracking-[0.3em] text-stone-400 uppercase mb-4">
            {t('landing.betaEyebrow')}
          </p>
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            {t('landing.betaTitle')}
          </h2>
          <p className="text-stone-400 mb-2 text-sm leading-relaxed">
            {t('landing.betaDesc')}
          </p>
          <p className="text-stone-500 mb-10 text-xs">{t('landing.betaLimit')}</p>
          <Link
            to="/register"
            className="inline-block px-10 py-4 bg-white text-stone-900 text-sm tracking-widest font-semibold hover:bg-stone-100 transition-colors rounded"
          >
            {t('landing.ctaPrimary')}
          </Link>
          <p className="mt-6 text-xs text-stone-500">
            {t('landing.alreadyHaveAccount')}{' '}
            <Link
              to="/login"
              className="text-stone-300 hover:text-white underline underline-offset-2"
            >
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </section>

      <footer className="py-8 px-6 bg-stone-900 border-t border-stone-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span
            className="text-stone-500 text-sm tracking-widest"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            Racconto
          </span>
          <p className="text-stone-600 text-xs">© 2026 Racconto. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}