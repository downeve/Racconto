import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Download, Folder, WifiOff, RotateCw, ChevronDown, Info } from 'lucide-react'
import PublicNavbar from '../components/PublicNavbar'
import { Wordmark } from '../components/Wordmark'

type Platform = 'mac' | 'win'

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
  const [arm64Url, setArm64Url] = useState('#')
  const [x64Url, setX64Url] = useState('#')
  const [winUrl, setWinUrl] = useState('#')
  const [version, setVersion] = useState('')
  const [recommendArm, setRecommendArm] = useState(false)
  const [openStep, setOpenStep] = useState<number | null>(null)

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

    const isMacOS = /Macintosh|Mac OS X/.test(navigator.userAgent)
    const isArmLikely = isMacOS && !navigator.userAgent.includes('Intel')
    setRecommendArm(isArmLikely)
  }, [])

  const macSteps = [
    { title: t('download.mac.step1Title'), desc: t('download.mac.step1Desc') },
    { title: t('download.mac.step3Title'), desc: t('download.mac.step3Desc'), detail: t('download.mac.step3Detail') },
    { title: t('download.mac.step4Title'), desc: t('download.mac.step4Desc') },
  ]
  const winSteps = [
    { title: t('download.win.step1Title'), desc: t('download.win.step1Desc') },
    { title: t('download.win.step2Title'), desc: t('download.win.step2Desc'), detail: t('download.win.step2Detail') },
    { title: t('download.win.step3Title'), desc: t('download.win.step3Desc') },
    { title: t('download.win.step4Title'), desc: t('download.win.step4Desc') },
  ]
  const steps = platform === 'mac' ? macSteps : winSteps

  const features = [
    { key: 'folder', Icon: Folder,  title: t('download.feat1Title'), desc: t('download.feat1Desc') },
    { key: 'wifi',   Icon: WifiOff, title: t('download.feat2Title'), desc: t('download.feat2Desc') },
    { key: 'sync',   Icon: RotateCw,title: t('download.feat3Title'), desc: t('download.feat3Desc') },
  ]

  return (
    <div className="min-h-screen bg-edit-canvas text-edit-ink">
      <PublicNavbar />

      {/* Hero */}
      <section className="px-6 md:px-12 pt-16 md:pt-24 pb-12 max-w-3xl mx-auto">
        <p className="t-eyebrow text-edit-muted mb-4">{t('download.eyebrow')}</p>
        <h1 className="font-serif text-h1 md:text-display text-edit-ink
                       font-normal tracking-tight leading-[1.1] mb-6 break-keep">
          {t('download.title')}
        </h1>
        <p className="font-serif text-body md:text-h3 text-edit-muted
                      leading-[1.65] mb-4 break-keep">
          {t('download.subtitle')}
        </p>
        <p className="t-caption text-edit-faint">
          {version && `${version} · `}macOS · Windows
        </p>
      </section>

      {/* Platform Segmented Toggle */}
      <div className="px-6 md:px-12 mb-8 max-w-3xl mx-auto">
        <div className="inline-flex border border-edit-line rounded-[1px] p-0.5 bg-edit-paper">
          {(['mac', 'win'] as const).map(p => (
            <button
              key={p}
              onClick={() => { setPlatform(p); setOpenStep(null) }}
              className={`inline-flex items-center gap-2 px-4 py-2
                          t-caption tracking-[0.08em] rounded-[1px]
                          transition-colors duration-150
                          ${platform === p
                            ? 'bg-edit-ink text-edit-paper'
                            : 'text-edit-muted hover:text-edit-ink'}`}
            >
              {p === 'mac'
                ? <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                : <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 12V6.75l6-1.32v6.57H3zm17 0V5l-9 1.68V12h9zm-17 1h6v6.08L3 17.75V13zm17 0v7l-9-1.71V13h9z"/>
                  </svg>
              }
              {p === 'mac' ? 'macOS' : 'Windows'}
            </button>
          ))}
        </div>
      </div>

      {/* Download Buttons */}
      <div className="px-6 md:px-12 mb-6 max-w-3xl mx-auto">
        {platform === 'mac' ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <a href={arm64Url} download
               className="flex-1 inline-flex items-center justify-center gap-2
                          px-5 py-3 bg-edit-ink text-edit-paper
                          t-caption tracking-[0.08em] rounded-[1px]
                          hover:bg-edit-ink/85 transition-colors">
              <Download size={12} strokeWidth={1.5} />
              Apple Silicon
              {recommendArm && (
                <span className="ml-1 t-eyebrow opacity-60">
                  {t('download.recommended')}
                </span>
              )}
            </a>
            <a href={x64Url} download
               className="flex-1 inline-flex items-center justify-center gap-2
                          px-5 py-3 border border-edit-line-strong text-edit-ink
                          t-caption tracking-[0.08em] rounded-[1px]
                          hover:border-edit-ink hover:bg-edit-paper transition-colors">
              <Download size={12} strokeWidth={1.5} />
              Intel
            </a>
          </div>
        ) : (
          <a href={winUrl} download
             className="inline-flex items-center gap-2 px-6 py-3
                        bg-edit-ink text-edit-paper
                        t-caption tracking-[0.08em] rounded-[1px]
                        hover:bg-edit-ink/85 transition-colors">
            <Download size={12} strokeWidth={1.5} />
            {t('download.winbtn')}
          </a>
        )}
      </div>

      {/* 안내 박스 */}
      <div className="px-6 md:px-12 mb-10 max-w-3xl mx-auto">
        <div className="border-l-2 border-edit-warning bg-edit-warning/[0.04] px-4 py-3 flex gap-3">
          <Info size={14} strokeWidth={1.5} className="shrink-0 mt-0.5 text-edit-warning" />
          <p className="text-body text-edit-ink/80 leading-relaxed break-keep">
            {t('download.notarizationNote')}
          </p>
        </div>
      </div>

      {/* 설치 안내 아코디언 */}
      <section className="px-6 md:px-12 py-8 max-w-3xl mx-auto">
        <p className="t-eyebrow text-edit-muted mb-6">
          {t('download.installGuide')} — {platform === 'mac' ? 'macOS' : 'Windows'}
        </p>
        {steps.map((step, i) => (
          <div key={i} className="border-b border-edit-line last:border-b-0">
            <button
              onClick={() => setOpenStep(openStep === i ? null : i)}
              className="w-full flex items-center gap-3 py-4 text-left"
            >
              <span className="t-eyebrow text-edit-faint w-6 shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="font-serif text-body text-edit-ink flex-1 break-keep">
                {step.title}
              </span>
              <ChevronDown
                size={13} strokeWidth={1.5}
                className={`text-edit-faint shrink-0 transition-transform duration-200
                            ${openStep === i ? 'rotate-180' : ''}`}
              />
            </button>
            {openStep === i && (
              <div className="pb-5 pl-9 space-y-2">
                <p className="text-body text-edit-muted leading-relaxed break-keep">
                  {step.desc}
                </p>
                {'detail' in step && step.detail && (
                  <p className="text-body text-edit-muted leading-relaxed break-keep">
                    {step.detail}
                  </p>
                )}

              </div>
            )}
          </div>
        ))}
      </section>

      {/* Features reminder — 종이 단락 */}
      <section className="px-6 md:px-12 py-12 max-w-3xl mx-auto">
        <p className="t-eyebrow text-edit-muted mb-6">{t('download.featuresEyebrow')}</p>
        <div>
          {features.map(f => (
            <div key={f.key} className="py-5 border-t border-edit-line first:border-t-0">
              <div className="flex items-start gap-4">
                <f.Icon size={16} strokeWidth={1.25} className="text-edit-muted shrink-0 mt-1" />
                <div>
                  <p className="font-serif text-h3 text-edit-ink mb-1 leading-tight tracking-tight break-keep">
                    {f.title}
                  </p>
                  <p className="text-body text-edit-muted leading-relaxed break-keep">
                    {f.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA 다크 섹션 */}
      <section className="bg-edit-ink text-edit-paper px-6 md:px-12 py-24 mt-12">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-h1 font-normal tracking-tight mb-6 break-keep">
            {t('download.ctaTitle')}
          </h2>
          <p className="font-serif text-body text-edit-paper/75 leading-[1.65] mb-10 break-keep">
            {t('download.ctaDesc')}
          </p>
          <Link
            to="/register"
            className="inline-block px-10 py-4 bg-edit-paper text-edit-ink
                       t-caption tracking-[0.08em] rounded-[1px]
                       hover:bg-edit-paper/90 transition-colors"
          >
            {t('landing.ctaPrimary')}
          </Link>
          <p className="mt-5 t-caption text-edit-paper/50">
            {t('landing.alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-edit-paper/70 hover:text-edit-paper underline underline-offset-2">
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
