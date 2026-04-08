import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useRef, useState } from 'react'

export default function LandingPage() {
  const { t, i18n } = useTranslation()
  const [scrollY, setScrollY] = useState(0)
  const featuresRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ko' ? 'en' : 'ko'
    i18n.changeLanguage(nextLang)
    localStorage.setItem('app_language', nextLang)
  }

  const features = [
    {
      number: '01',
      title: t('landing.feature1Title'),
      desc: t('landing.feature1Desc'),
      visual: (
        <div className="relative w-full h-48 bg-stone-100 rounded overflow-hidden">
          <div className="absolute inset-0 grid grid-cols-3 gap-1 p-2">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className="bg-stone-300 rounded-sm"
                style={{
                  opacity: 0.4 + (i % 3) * 0.2,
                  transform: `scale(${0.95 + (i % 2) * 0.05})`,
                }}
              />
            ))}
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex gap-1">
            {['bg-red-400', 'bg-yellow-400', 'bg-green-400', 'bg-blue-400', 'bg-purple-400'].map((c, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${c} opacity-80`} />
            ))}
          </div>
        </div>
      ),
    },
    {
      number: '02',
      title: t('landing.feature2Title'),
      desc: t('landing.feature2Desc'),
      visual: (
        <div className="relative w-full h-48 bg-stone-100 rounded overflow-hidden p-3">
          <div className="space-y-2">
            {[
              { label: 'Chapter 1', indent: false, photos: 4 },
              { label: 'Sub-Chapter 1.1', indent: true, photos: 3 },
              { label: 'Sub-Chapter 1.2', indent: true, photos: 2 },
              { label: 'Chapter 2', indent: false, photos: 5 },
            ].map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 ${item.indent ? 'ml-4 border-l-2 border-blue-300 pl-2' : ''}`}
              >
                <span className="text-xs text-stone-500 font-medium w-32 truncate">{item.label}</span>
                <div className="flex gap-0.5 flex-1">
                  {[...Array(item.photos)].map((_, j) => (
                    <div key={j} className="h-5 flex-1 bg-stone-300 rounded-sm opacity-60" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      number: '03',
      title: t('landing.feature3Title'),
      desc: t('landing.feature3Desc'),
      visual: (
        <div className="relative w-full h-48 bg-stone-900 rounded overflow-hidden">
          <div className="absolute inset-0 grid grid-cols-3 gap-0.5 p-0.5">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-stone-700 rounded-sm"
                style={{ opacity: 0.5 + (i % 3) * 0.15 }}
              />
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-white/30 text-xs tracking-widest uppercase mb-1">racconto.app/p/</p>
              <p className="text-white text-sm font-semibold tracking-wider">yourname</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      number: '04',
      title: t('landing.feature4Title'),
      desc: t('landing.feature4Desc'),
      visual: (
        <div className="relative w-full h-48 bg-stone-100 rounded overflow-hidden p-3">
          <div className="space-y-2">
            {[
              { label: 'camera', value: 'Sony A7R V' },
              { label: 'lens', value: 'FE 35mm f/1.4' },
              { label: 'shutter', value: '1/250s' },
              { label: 'aperture', value: 'f/2.0' },
              { label: 'iso', value: 'ISO 400' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-stone-400 w-16 shrink-0">{item.label}</span>
                <span className="text-xs text-stone-600 font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-[#F7F4F0] text-stone-900" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#F7F4F0]/90 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-xl font-bold tracking-widest" style={{ fontFamily: "'Georgia', serif", letterSpacing: '0.15em' }}>
            Racconto
          </span>
          <div className="flex items-center gap-6">
            <button
              onClick={toggleLanguage}
              className="text-xs font-bold text-stone-400 hover:text-stone-700 tracking-widest transition-colors"
            >
              {i18n.language === 'ko' ? 'EN' : 'KO'}
            </button>
            <Link
              to="/login"
              className="text-sm tracking-wider text-stone-600 hover:text-stone-900 transition-colors"
            >
              {t('auth.login')}
            </Link>
            <Link
              to="/register"
              className="text-sm tracking-wider bg-stone-900 text-white px-4 py-2 hover:bg-stone-700 transition-colors"
            >
              {t('auth.register')}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-20 relative overflow-hidden">

        {/* 배경 그리드 장식 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(stone #e7e3de 1px, transparent 1px), linear-gradient(90deg, #e7e3de 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            opacity: 0.4,
            transform: `translateY(${scrollY * 0.1}px)`,
          }}
        />

        {/* 떠다니는 사진 프레임 장식 */}
        <div className="absolute top-32 left-8 md:left-24 w-28 h-36 bg-white shadow-lg rounded-sm rotate-[-6deg] opacity-60"
          style={{ transform: `rotate(-6deg) translateY(${scrollY * 0.05}px)` }}>
          <div className="w-full h-full bg-stone-200 rounded-sm" />
        </div>
        <div className="absolute top-40 right-8 md:right-24 w-24 h-32 bg-white shadow-lg rounded-sm rotate-[4deg] opacity-50"
          style={{ transform: `rotate(4deg) translateY(${scrollY * 0.08}px)` }}>
          <div className="w-full h-full bg-stone-300 rounded-sm" />
        </div>
        <div className="absolute bottom-32 left-12 md:left-40 w-20 h-28 bg-white shadow-md rounded-sm rotate-[3deg] opacity-40"
          style={{ transform: `rotate(3deg) translateY(${scrollY * 0.06}px)` }}>
          <div className="w-full h-full bg-stone-200 rounded-sm" />
        </div>
        <div className="absolute bottom-40 right-12 md:right-40 w-32 h-40 bg-white shadow-md rounded-sm rotate-[-3deg] opacity-35"
          style={{ transform: `rotate(-3deg) translateY(${scrollY * 0.04}px)` }}>
          <div className="w-full h-full bg-stone-300 rounded-sm" />
        </div>

        {/* 메인 텍스트 */}
        <div className="relative z-10 text-center max-w-3xl">
          <p className="text-xs tracking-[0.3em] text-stone-400 uppercase mb-6">
            {t('landing.heroEyebrow')}
          </p>
          <h1
            className="text-5xl md:text-7xl font-bold leading-tight mb-6 text-stone-900"
            style={{ fontFamily: "'Georgia', serif", letterSpacing: '-0.02em' }}
          >
            {t('landing.heroTitle')}
          </h1>
          <p className="text-lg md:text-xl text-stone-500 leading-relaxed mb-10 max-w-xl mx-auto"
            style={{ fontFamily: "'Georgia', serif", fontStyle: 'italic' }}>
            {t('landing.heroSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-8 py-3.5 bg-stone-900 text-white text-sm tracking-widest hover:bg-stone-700 transition-all duration-200 shadow-lg"
            >
              {t('landing.ctaPrimary')}
            </Link>
            <button
              onClick={() => featuresRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-3.5 border border-stone-300 text-stone-600 text-sm tracking-widest hover:border-stone-500 hover:text-stone-900 transition-all duration-200"
            >
              {t('landing.ctaSecondary')}
            </button>
          </div>
          <p className="mt-6 text-xs text-stone-400 tracking-wider">
            {t('landing.betaBadge')}
          </p>
        </div>

        {/* 스크롤 힌트 */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
          <div className="w-px h-12 bg-stone-400 animate-pulse" />
        </div>
      </section>

      {/* Features */}
      <section ref={featuresRef} className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs tracking-[0.3em] text-stone-400 uppercase mb-3">{t('landing.featuresEyebrow')}</p>
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900" style={{ fontFamily: "'Georgia', serif" }}>
              {t('landing.featuresTitle')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {features.map((feature) => (
              <div key={feature.number} className="group">
                {feature.visual}
                <div className="mt-5">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-xs text-stone-300 font-mono tracking-widest">{feature.number}</span>
                    <h3 className="text-lg font-semibold text-stone-900" style={{ fontFamily: "'Georgia', serif" }}>
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-sm text-stone-500 leading-relaxed pl-7">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Beta CTA */}
      <section className="py-24 px-6 bg-stone-900 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs tracking-[0.3em] text-stone-400 uppercase mb-4">{t('landing.betaEyebrow')}</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: "'Georgia', serif" }}>
            {t('landing.betaTitle')}
          </h2>
          <p className="text-stone-400 mb-2 text-sm leading-relaxed">
            {t('landing.betaDesc')}
          </p>
          <p className="text-stone-500 mb-10 text-xs">
            {t('landing.betaLimit')}
          </p>
          <Link
            to="/register"
            className="inline-block px-10 py-4 bg-white text-stone-900 text-sm tracking-widest font-semibold hover:bg-stone-100 transition-colors"
          >
            {t('landing.ctaPrimary')}
          </Link>
          <p className="mt-6 text-xs text-stone-500">
            {t('landing.alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-stone-300 hover:text-white underline underline-offset-2">
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-stone-900 border-t border-stone-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-stone-500 text-sm tracking-widest" style={{ fontFamily: "'Georgia', serif" }}>
            Racconto
          </span>
          <p className="text-stone-600 text-xs">© 2026 Racconto. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}