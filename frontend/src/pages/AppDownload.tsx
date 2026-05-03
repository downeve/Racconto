import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import PublicNavbar from '../components/PublicNavbar'
import { Link } from 'react-router-dom'

type Platform = 'mac' | 'windows'

interface GitHubAsset {
  name: string
  browser_download_url: string
}

interface GitHubRelease {
  tag_name: string
  assets: GitHubAsset[]
}

export default function AppDownload() {
  const { t } = useTranslation()
  const [platform, setPlatform] = useState<Platform>('mac')
  const [macStep, setMacStep] = useState<number | null>(null)
  const [winStep, setWinStep] = useState<number | null>(null)
  const [arm64Url, setArm64Url] = useState<string>('#')
  const [x64Url, setX64Url] = useState<string>('#')
  const [winUrl, setWinUrl] = useState<string>('#')
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    fetch('https://api.github.com/repos/downeve/Racconto/releases/latest')
      .then(res => res.json())
      .then((data: GitHubRelease) => {
        setVersion(data.tag_name)
        const arm64 = data.assets.find(a => a.name.includes('arm64.dmg'))
        const x64 = data.assets.find(a => a.name.includes('x64.dmg'))
        const win = data.assets.find(a => a.name.includes('Setup.exe'))
        if (arm64) setArm64Url(arm64.browser_download_url)
        if (x64) setX64Url(x64.browser_download_url)
        if (win) setWinUrl(win.browser_download_url)
      })
      .catch(() => {})
  }, [])

  type Step = {
    title: string
    desc: string
    detail?: string
    code?: string
    }

  const macSteps: Step[] = [
    {
      title: t('download.mac.step1Title'),
      desc: t('download.mac.step1Desc'),
    },
    {
      title: t('download.mac.step2Title'),
      desc: t('download.mac.step2Desc'),
    },
    {
      title: t('download.mac.step3Title'),
      desc: t('download.mac.step3Desc'),
      detail: t('download.mac.step3Detail'),
      code: 'xattr -cr /Applications/Racconto.app',
    },
    {
      title: t('download.mac.step4Title'),
      desc: t('download.mac.step4Desc'),
    },
  ]

  const winSteps: Step[] = [
    {
      title: t('download.win.step1Title'),
      desc: t('download.win.step1Desc'),
    },
    {
      title: t('download.win.step2Title'),
      desc: t('download.win.step2Desc'),
      detail: t('download.win.step2Detail'),
    },
    {
      title: t('download.win.step3Title'),
      desc: t('download.win.step3Desc'),
    },
    {
      title: t('download.win.step4Title'),
      desc: t('download.win.step4Desc'),
    },
  ]

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <PublicNavbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-body tracking-[0.3em] text-faint uppercase mb-4">
            {t('download.eyebrow')}
          </p>
          <h1
            className="text-h1 md:text-display font-serif font-bold text-ink mb-4 leading-tight"
            style={{ letterSpacing: '-0.02em' }}
          >
            {t('download.title')}
          </h1>
          <p className="text-h3 text-muted leading-relaxed mb-3 break-keep">
            {t('download.subtitle')}
          </p>
          <p className="text-small text-faint tracking-widest">
            {version} · macOS · Windows
          </p>
        </div>
      </section>

      {/* Platform Toggle + Download */}
      <section className="py-10 px-6">
        <div className="max-w-xl mx-auto">

          {/* Toggle */}
          <div className="flex rounded-card border border-hair overflow-hidden mb-8">
            <button
              onClick={() => setPlatform('mac')}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3 text-small tracking-widest transition-colors duration-150 ${
                platform === 'mac'
                  ? 'bg-ink text-card'
                  : 'bg-canvas text-muted hover:bg-canvas-2'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              macOS
            </button>
            <button
              onClick={() => setPlatform('windows')}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3 text-small tracking-widest transition-colors duration-150 ${
                platform === 'windows'
                  ? 'bg-ink text-card'
                  : 'bg-canvas text-muted hover:bg-canvas-2'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 12V6.75l6-1.32v6.57H3zm17 0V5l-9 1.68V12h9zm-17 1h6v6.08L3 17.75V13zm17 0v7l-9-1.71V13h9z" />
              </svg>
              Windows
            </button>
          </div>

          {/* Download Card */}
          <div className="rounded-card border border-hair bg-canvas-2 p-6 mb-10">
            {platform === 'mac' ? (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-small font-semibold text-ink mb-1">
                    Racconto-beta-arm64.dmg<br />
                    / Racconto-beta-x64.dmg
                  </p>
                  <p className="text-menu text-muted">
                    macOS 11+ · Apple Silicon & Intel · {version}
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                    <a
                    href={arm64Url}
                    className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-ink text-white text-small tracking-widest rounded hover:bg-stone-700 transition-colors duration-150"
                    >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {t('download.macArm64btn')}
                    </a>
                    <a
                    href={x64Url}
                    className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 border border-stone-300 text-stone-700 text-small tracking-widest rounded hover:border-stone-500 hover:text-stone-900 transition-colors duration-150"
                    >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {t('download.macIntelbtn')}
                    </a>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-small font-semibold text-ink mb-1">
                    Racconto-beta-Setup.exe
                  </p>
                  <p className="text-caption text-faint">
                    Windows 10+ · x64 · {version}
                  </p>
                </div>
                <a
                  href={winUrl}
                  className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-ink text-white text-small tracking-widest rounded hover:bg-stone-700 transition-colors duration-150"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {t('download.winbtn')}
                </a>
              </div>
            )}
          </div>

          {/* 인증 안내 배너 */}
          <div className="flex gap-3 rounded border border-stone-200 bg-stone-50 px-4 py-3 mb-10">
            <svg className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-menu text-muted leading-relaxed">
              {t('download.notarizationNote')}
            </p>
          </div>

          {/* 설치 안내 */}
          <div>
            <p className="text-small tracking-[0.3em] text-muted uppercase mb-5">
              {t('download.installGuide')} — {platform === 'mac' ? 'macOS' : 'Windows'}
            </p>

            <div className="flex flex-col gap-2">
              {(platform === 'mac' ? macSteps : winSteps).map((step, i) => {
                const isOpen = platform === 'mac' ? macStep === i : winStep === i
                const toggle = () => {
                  if (platform === 'mac') setMacStep(isOpen ? null : i)
                  else setWinStep(isOpen ? null : i)
                }
                return (
                  <div key={i} className="border border-hair rounded-card overflow-hidden">
                    <button
                      onClick={toggle}
                      className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-canvas-2 transition-colors duration-100"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-caption font-mono text-faint w-5 shrink-0">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="text-small font-medium text-ink">{step.title}</span>
                      </div>
                      <svg
                        className={`w-3.5 h-3.5 text-faint shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 border-t border-hair bg-canvas-2">
                        <p className="text-small text-muted leading-relaxed mt-4">{step.desc}</p>
                        {'detail' in step && step.detail && (
                          <p className="text-small text-muted leading-relaxed mt-2">{step.detail}</p>
                        )}
                        {'code' in step && step.code && (
                          <div className="mt-3 flex items-center justify-between gap-3 rounded bg-ink px-4 py-2.5">
                            <code className="text-menu text-stone-300 font-mono">{step.code}</code>
                            <button
                              onClick={() => navigator.clipboard.writeText(step.code!)}
                              className="text-menu text-stone-500 hover:text-stone-300 transition-colors shrink-0"
                            >
                              {t('download.copy')} {/* '복사' */}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Features reminder */}
      <section className="py-16 px-6 border-t border-hair">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-small tracking-[0.3em] text-faint uppercase mb-4">
            {t('download.featuresEyebrow')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left mt-6">
            {[
              {
                icon: (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                ),
                title: t('download.feat1Title'), 
                desc: t('download.feat1Desc'),
              },
              {
                icon: (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M12 20h.01" />
                  </svg>
                ),
                title: t('download.feat2Title'),
                desc: t('download.feat2Desc'),
              },
              {
                icon: (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                  </svg>
                ),
                title: t('download.feat3Title'),
                desc: t('download.feat3Desc'), // '로컬 폴더와 서버가 자동으로 동기화됩니다.'
              },
            ].map((f, i) => (
              <div key={i} className="rounded-card border border-hair p-4">
                <div className="text-faint mb-2">{f.icon}</div>
                <p className="text-small font-medium text-ink mb-1">{f.title}</p>
                <p className="text-caption text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-ink text-white text-center">
        <div className="max-w-md mx-auto">
          <p className="text-faint text-small mb-4 leading-relaxed">
            {t('download.ctaDesc')}
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-3.5 bg-card text-ink-2 text-small font-serif font-semibold tracking-widest hover:bg-ink-2 hover:text-hair transition-colors duration-150 rounded"
          >
            {t('landing.ctaPrimary')}
          </Link>
          <p className="mt-4 text-caption text-faint">
            {t('landing.alreadyHaveAccount')}
            <Link to="/login" className="hover:text-muted underline underline-offset-2">
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-ink border-t border-hair">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-muted text-small font-serif font-bold tracking-widest">Racconto</span>
          <p className="text-muted text-caption">© 2026 Racconto. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}