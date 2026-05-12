import { useEffect, useState, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import FolderProjectMapper from '../components/FolderProjectMapper'
import { useAuth } from '../context/AuthContext'
import {
  Sun, Moon, Check,
  Palette, Columns3, Paintbrush, Tag, Lock, UserCircle,
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL
const DELIVERY_ENABLED = import.meta.env.VITE_ENABLE_DELIVERY === 'true'

const COLOR_KEYS = [
  { key: 'color_label_red',    color: 'bg-red-500',    value: 'red', meaningKey: 'reject' },
  { key: 'color_label_yellow', color: 'bg-yellow-400', value: 'yellow', meaningKey: 'hold' },
  { key: 'color_label_green',  color: 'bg-green-500',  value: 'green', meaningKey: 'select' },
  { key: 'color_label_blue',   color: 'bg-blue-500',   value: 'blue', meaningKey: 'clientShare' },
  { key: 'color_label_purple', color: 'bg-purple-500', value: 'purple', meaningKey: 'finalSelect' },
]

const RESERVED_WORDS = [
  // App.tsx에 등록된 경로들
  'login', 'dashboard', 'register', 'verify-email', 
  'forgot-password', 'reset-password', 'features', 
  'projects', 'trash', 'settings', 'racconto-admin', 
  'download', 'delivery', 
  
  // 추가로 막아두면 좋은 범용 예약어 (선택)
  'admin', 'api', 'support', 'help', 'root', 'user', 'portfolio'
];


export default function Settings() {
  const { user } = useAuth()
  const [email, setEmail] = useState(user?.email || '')

  const [settings, setSettings] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  
  const [portfolioTheme, setPortfolioTheme] = useState('light')
  const [deliveryTagColor, setDeliveryTagColor] = useState('purple')
  const [defaultGridCols, setDefaultGridCols] = useState('3')
  const [defaultShowExif, setDefaultShowExif] = useState('true')
  const [defaultSortBy, setDefaultSortBy] = useState('default')
  const [defaultSortOrder, setDefaultSortOrder] = useState('asc')

  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [usernameSaved, setUsernameSaved] = useState(false)
  const [urlCopied, setUrlCopied] = useState(false)
  const originalUsername = useRef('')

  const [tier, setTier] = useState('')
  const [projectCount, setProjectCount] = useState(0)
  const [projectLimit, setProjectLimit] = useState(0)
  const [photoCount, setPhotoCount] = useState(0)
  const [photoLimit, setPhotoLimit] = useState(0)

  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawPassword, setWithdrawPassword] = useState('')
  const [withdrawError, setWithdrawError] = useState('')
  const [showWithdraw, setShowWithdraw] = useState(false)

  const { logout } = useAuth()
  const { t, i18n } = useTranslation()

  const handlePasswordChange = async () => {
    setPasswordError('')
    setPasswordSuccess('')
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t('settings.passwordInputAll'))
      return
    }
    if (newPassword !== confirmPassword) {
      // 다국어 적용: 비밀번호 불일치 에러
      setPasswordError(t('settings.passwordMismatch'))
      return
    }
    if (newPassword.length < 8) {
      // 다국어 적용: 비밀번호 최소 길이 에러 (숫자 변수 처리)
      setPasswordError(t('settings.passwordMinLength', { minLength: 8 }))
      return
    }
    try {
      const token = localStorage.getItem('token')
      await axios.put(`${API}/auth/password`, {
        current_password: currentPassword,
        new_password: newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPasswordSuccess(t('settings.passwordChanged'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPasswordError(err.response?.data?.detail || t('settings.passwordChangeFailed'))
    }
  }

  // ── 설정 조회 ─────────────────────────────────────────────────
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await axios.get(`${API}/settings/`)
      return res.data as Record<string, string>
    },
  })

  const token = localStorage.getItem('token')
  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.data
    },
  })

  // 쿼리 데이터가 로드되면 폼 상태 초기화
  useEffect(() => {
    if (!settingsData) return
    setSettings(settingsData)
    setPortfolioTheme(settingsData['portfolio_theme'] || 'light')
    setDeliveryTagColor(settingsData['delivery_tag_color'] || 'purple')
    setDefaultGridCols(settingsData['default_grid_cols'] || '3')
    setDefaultShowExif(settingsData['default_show_exif'] || 'true')
    setDefaultSortBy(settingsData['default_sort_by'] || 'default')
    setDefaultSortOrder(settingsData['default_sort_order'] || 'asc')
  }, [settingsData])

  useEffect(() => {
    if (!meData) return
    setUsername(meData.username || '')
    originalUsername.current = meData.username || ''
    setEmail(meData.email || '')
    setTier(meData.tier || '')
    setProjectCount(meData.project_count ?? 0)
    setProjectLimit(meData.project_limit ?? 0)
    setPhotoCount(meData.photo_count ?? 0)
    setPhotoLimit(meData.photo_limit ?? 0)
  }, [meData])

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  // ── 설정 저장 ─────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () =>
      axios.put(`${API}/settings/batch/update`, {
        ...settings,
        portfolio_theme: portfolioTheme,
        delivery_tag_color: deliveryTagColor,
        default_grid_cols: defaultGridCols,
        default_show_exif: defaultShowExif,
        default_sort_by: defaultSortBy,
        default_sort_order: defaultSortOrder,
      }),
    onSuccess: () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const handleSave = () => saveMutation.mutate()

  const handleUsernameCheck = async (value: string) => {
    setUsername(value)
    if (value === originalUsername.current) {   // ← 추가
      setUsernameStatus('idle')
      return
    }
    if (value.length < 3) { setUsernameStatus('idle'); return }
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) { setUsernameStatus('invalid'); return }

    // 🚨 [추가] 예약어인지 먼저 검사!
    if (RESERVED_WORDS.includes(value.toLowerCase())) {
      setUsernameStatus('taken'); // 이미 사용 중인 이름으로 취급하여 차단
      return;
    }

    setUsernameStatus('checking')
    try {
      const res = await axios.get(`${API}/auth/check-username/${value}`)
      setUsernameStatus(res.data.available ? 'available' : 'taken')
    } catch {
      setUsernameStatus('idle')
    }
  }

  const handleUsernameSave = async () => {
    const token = localStorage.getItem('token')
    try {
      await axios.put(`${API}/auth/username`, { username }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // [추가] 저장이 성공하면, 변경된 유저네임을 담아서 커스텀 이벤트를 발생시킴!
      window.dispatchEvent(new CustomEvent('usernameChanged', { detail: username }));
      
      setUsernameSaved(true)
      setUsernameStatus('idle')
      setTimeout(() => setUsernameSaved(false), 2000)
    } catch (err: any) {
      const code = err.response?.data?.detail
      if (code === 'USERNAME_ALREADY_TAKEN') setUsernameStatus('taken')
      else if (code === 'USERNAME_INVALID_CHARS') setUsernameStatus('invalid')
    }
  }

  const isSocialUser = !!user?.oauth_provider
  const isLineUser = user?.oauth_provider === 'line'
  const displayIdentity = isLineUser ? (username || email) : email

  const handleWithdraw = async () => {
    if (!isSocialUser && !withdrawPassword) {
      setWithdrawError(t('settings.withdrawPasswordRequired'))
      return
    }
    setWithdrawing(true)
    setWithdrawError('')
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API}/auth/withdraw`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { password: isSocialUser ? null : withdrawPassword, lang: i18n.language.startsWith('ko') ? 'ko' : 'en' }
      })
      logout()
    } catch (err: any) {
      const code = err.response?.data?.detail
      if (code === 'WRONG_PASSWORD') {
        setWithdrawError(t('settings.withdrawWrongPassword'))
      } else {
        setWithdrawError(t('settings.withdrawFailed'))
      }
      setWithdrawing(false)
    }
  }

  function colorName(value: string) {
    const c = COLOR_KEYS.find(o => o.value === value)
    if (!c) return value
    return settings[c.key] || t(`colorLabels.${c.value}`)
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-edit-paper rounded-btn">
      <header className="mb-10">
        <p className="t-eyebrow text-muted mb-2">Account</p>
        <h1 className="font-serif text-[2rem] leading-[1.1] tracking-[-0.015em] font-normal">
          {t('settings.title')}
        </h1>
      </header>

      {/* 사용자 정보 */}
      <div className="border-b border-hair pb-8 mb-0">
        <div className="flex items-start gap-6">
          {/* 좌: 아바타 + 사용자 정보 */}
          <div className="flex items-center gap-3 flex-1">
            <div className="w-9 h-9 rounded-full bg-ink-2 flex items-center justify-center shrink-0">
              <span className="text-canvas text-h3 font-medium">
                {displayIdentity ? displayIdentity[0].toUpperCase() : '?'}
              </span>
            </div>
            <div>
              <p className="t-eyebrow text-muted mb-0.5">
                {t('settings.currentUser')}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-base text-ink font-medium tracking-tight">
                  {displayIdentity || 'Loading...'}
                </p>
                {tier && (
                  <span className="t-eyebrow border border-hair px-2 py-0.5 text-muted">
                    {t(`settings.tier.${tier}`, tier)}
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* 세로 경계선 */}
          <div className="w-px bg-hair self-stretch shrink-0" />
          {/* 우: 사용량 */}
          <div className="space-y-2.5 min-w-[160px]">
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="t-eyebrow text-muted">{t('settings.usage.projects')}</p>
                <p className="text-sm font-medium text-ink">{projectCount} / {projectLimit}</p>
              </div>
              <div className="h-1 bg-hair overflow-hidden">
                <div
                  className="h-full bg-ink/65"
                  style={{ width: `${projectLimit > 0 ? Math.min((projectCount / projectLimit) * 100, 100) : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="t-eyebrow text-muted">{t('settings.usage.photos')}</p>
                <p className="text-sm font-medium text-ink">{photoCount} / {photoLimit}</p>
              </div>
              <div className="h-1 bg-hair overflow-hidden">
                <div
                  className="h-full bg-ink/65"
                  style={{ width: `${photoLimit > 0 ? Math.min((photoCount / photoLimit) * 100, 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 기본 보기 설정 */}
      <div className="border-b border-hair py-8">
        <h3 className="t-eyebrow text-muted mb-6 flex items-center gap-2">
          <Columns3 className="w-4 h-4" strokeWidth={1.5} />
          {t('settings.defaultView')}
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-[max-content_1fr] items-center gap-x-4 gap-y-6">
            {/* 그리드 & EXIF 한 줄 배치 */}
            <div className="col-span-2 flex items-center gap-12">
              {/* 1. 그리드 컬럼 */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted">{t('settings.defaultGridCols')}</span>
                <div className="flex gap-2">
                  {['2', '3', '4', '5'].map((cols) => (
                    <button
                      key={cols}
                      onClick={() => setDefaultGridCols(cols)}
                      className={`w-8 h-8 text-xs font-medium transition-colors ${defaultGridCols === cols ? 'bg-ink text-canvas' : 'bg-hair hover:bg-canvas-2 text-muted hover:text-ink'}`}
                    >
                      {cols}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. EXIF 기본값 */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted">{t('settings.defaultExif')}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDefaultShowExif('true')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${defaultShowExif === 'true' ? 'bg-ink text-canvas' : 'bg-hair hover:bg-canvas-2 text-muted hover:text-ink'}`}
                  >
                    ON
                  </button>
                  <button
                    onClick={() => setDefaultShowExif('false')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${defaultShowExif === 'false' ? 'bg-ink text-canvas' : 'bg-hair hover:bg-canvas-2 text-muted hover:text-ink'}`}
                  >
                    OFF
                  </button>
                </div>
              </div>
            </div>

            <span className="text-sm text-muted">{t('photo.listOrder')}</span>
            <div className="flex items-center gap-4">
              {/* 정렬 기준 */}
              <div className="flex gap-2">
                {[
                  { value: 'default', label: t('photo.orderUpload') },
                  { value: 'taken_at', label: t('photo.orderTaken') },
                  { value: 'name', label: t('photo.orderName') }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDefaultSortBy(opt.value)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${defaultSortBy === opt.value ? 'bg-ink text-canvas' : 'bg-hair hover:bg-canvas-2 text-muted hover:text-ink'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* 구분선 */}
              <div className="w-px h-4 bg-hair" />

              {/* 오름/내림차순 */}
              <div className="flex gap-2">
                <button
                  onClick={() => setDefaultSortOrder('asc')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${defaultSortOrder === 'asc' ? 'bg-ink text-canvas' : 'bg-hair hover:bg-canvas-2 text-muted hover:text-ink'}`}
                >
                  {t('photo.orderAsc')}
                </button>
                <button
                  onClick={() => setDefaultSortOrder('desc')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${defaultSortOrder === 'desc' ? 'bg-ink text-canvas' : 'bg-hair hover:bg-canvas-2 text-muted hover:text-ink'}`}
                >
                  {t('photo.orderDesc')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 컬러 레이블 설정 */}
      <div className="border-b border-hair py-8">
        <h3 className="t-eyebrow text-muted mb-6 flex items-center gap-2">
          <Palette className="w-4 h-4" strokeWidth={1.5} />
          {t('settings.colorLabelNames')}
        </h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          {COLOR_KEYS.map(({ key, color, value, meaningKey }) => (
            <div key={key} className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-card ${color} shrink-0`} />
              <span className="text-sm text-muted w-12 shrink-0">{t(`colorLabels.${value}`)}</span>
              <input
                className="w-40 border-hair border rounded px-3 py-1.5 text-sm outline-none focus:border-ink transition-[background,color,border] duration-150 ease-out"
                value={settings[key] || ''}
                placeholder={t(`colors.${meaningKey}`)}
                onChange={e => handleChange(key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 포트폴리오 테마 */}
      <div className="border-b border-hair py-8">
        <h3 className="t-eyebrow text-muted mb-6 flex items-center gap-2">
          <Paintbrush className="w-4 h-4" strokeWidth={1.5} />
          {t('settings.portfolioThemeDesc')}
        </h3>
        <div className="flex gap-3">
          <button
            onClick={() => setPortfolioTheme('light')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm border transition-colors ${portfolioTheme === 'light' ? 'bg-ink text-canvas border-ink' : 'border-hair hover:bg-canvas-2 text-muted hover:text-ink'}`}
          >
            <Sun size={14} strokeWidth={1.5} />{t('settings.themeLight')}
          </button>
          <button
            onClick={() => setPortfolioTheme('dark')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm border transition-colors ${portfolioTheme === 'dark' ? 'bg-ink text-canvas border-ink' : 'border-hair hover:bg-canvas-2 text-muted hover:text-ink'}`}
          >
            <Moon size={14} strokeWidth={1.5} />{t('settings.themeDark')}
          </button>
        </div>
      </div>

      {/* 퍼블릭 포트폴리오 URL */}
      <div className="border-b border-hair py-8">
        <h3 className="t-eyebrow text-muted mb-1 flex items-center gap-2">
          <UserCircle className="w-4 h-4" strokeWidth={1.5} />
          {t('settings.publicPortfolio')}
        </h3>
        <p className="text-[0.6875rem] text-faint mb-5 ml-6">
          {t('settings.publicPortfolioDesc')}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-faint shrink-0">racconto.app/</span>
          <input
            className="border-hair border rounded px-3 py-2 text-sm outline-none focus:border-ink w-48 transition-colors"
            placeholder="username"
            value={username}
            onChange={e => handleUsernameCheck(e.target.value)}
          />
          <button
            onClick={handleUsernameSave}
            disabled={(usernameStatus !== 'available' && username !== '') && !usernameSaved}
            className={`px-4 py-2 text-sm transition-colors ${
              usernameSaved ? 'bg-[oklch(0.55_0.10_150)] text-canvas' :
              (usernameStatus === 'available' || username === '') ? 'bg-ink text-canvas hover:bg-ink-2' :
              'bg-hair text-faint cursor-not-allowed'
            }`}
          >
            {usernameSaved ? <Check size={14} strokeWidth={1.5} /> : t('common.save')}
          </button>
        </div>
        {usernameStatus === 'available' && (
          <p className="text-xs text-green-500 mt-1.5 ml-[calc(theme(spacing.7)+theme(spacing.32)+theme(spacing.2))] flex items-center gap-1"><Check size={12} strokeWidth={1.5} />{t('settings.usernameAvailable')}</p>
        )}
        {usernameStatus === 'taken' && (
          <p className="text-xs text-red-500 mt-1.5">{t('settings.usernameTaken')}</p>
        )}
        {usernameStatus === 'invalid' && (
          <p className="text-xs text-red-500 mt-1.5">{t('settings.usernameInvalid')}</p>
        )}
        {username && usernameStatus === 'idle' && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(`https://racconto.app/${username}`)
              setUrlCopied(true)
              setTimeout(() => setUrlCopied(false), 2000)
            }}
            className="flex items-center gap-1.5 mt-1.5 text-caption text-faint hover:text-muted transition-colors duration-150"
          >
            {urlCopied
              ? <><Check size={10} strokeWidth={2} className="text-accent" />racconto.app/{username}</>
              : <>racconto.app/{username}</>}
          </button>
        )}
      </div>

      {/* 로컬 폴더 연결 - Electron 앱에서만 표시 */}
      <FolderProjectMapper />

      {/* 납품 선택 자동 태그 */}
      {DELIVERY_ENABLED && (
      <div className="border-b border-hair py-8">
        <h3 className="t-eyebrow text-muted mb-1 flex items-center gap-2">
          <Tag className="w-4 h-4" strokeWidth={1.5} />
          납품 선택 자동 태그
        </h3>
        <p className="text-[0.6875rem] text-faint mb-5 ml-6">
          고객이 납품 링크에서 선택 완료하면 해당 사진에 자동으로 이 컬러 레이블이 태깅됩니다.
        </p>
        <div className="flex gap-2 flex-wrap">
          {COLOR_KEYS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setDeliveryTagColor(opt.value)}
              className={`flex items-center gap-2 px-3 py-2 text-sm border transition-colors ${
                deliveryTagColor === opt.value
                  ? 'bg-ink text-canvas border-ink'
                  : 'border-hair hover:bg-canvas-2 text-muted hover:text-ink'
              }`}
            >
              <span className={`w-3 h-3 rounded-card ${opt.color}`} />
              {colorName(opt.value)}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* 비밀번호 변경 */}
      <div className="border-b border-hair py-8">
        <h3 className="t-eyebrow text-muted mb-6 flex items-center gap-2">
          <Lock className="w-4 h-4" strokeWidth={1.5} />
          {t('settings.managePassword')}
        </h3>
        <div className="space-y-4">
          <div>
            <input
              type="password"
              className="w-full border-hair border rounded-card px-3 py-2 text-sm outline-none focus:border-ink transition-colors"
              placeholder={t('settings.currentPassword')}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="password"
              className="border-hair border rounded-card px-3 py-2 text-sm outline-none focus:border-ink transition-colors"
              placeholder={t('settings.newPassword')}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              className="border-hair border rounded-card px-3 py-2 text-sm outline-none focus:border-ink transition-colors"
              placeholder={t('settings.newPasswordConfirm')}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>

          {passwordError && <p className="text-red-500 text-xs">{passwordError}</p>}
          {passwordSuccess && <p className="text-green-500 text-xs">{passwordSuccess}</p>}

          <div className="flex justify-start pt-2">
            <button
              onClick={handlePasswordChange}
              className="bg-ink text-canvas px-4 py-2 text-sm hover:bg-ink-2 transition-colors"
            >
              {t('settings.changePassword')}
            </button>
          </div>
        </div>
      </div>

      {/* 저장 버튼 */}
      <div className="flex justify-end pt-8">
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-8 py-2.5 text-sm font-medium tracking-[0.02em] rounded-none transition-colors ${
            saved ? 'bg-[oklch(0.55_0.10_150)] text-canvas' : 'bg-ink text-canvas hover:bg-ink-2'
          }`}
        >
          {saved ? t('settings.saveSuccess') : t('common.save')}
        </button>
      </div>

      {/* 회원 탈퇴 */}
      <div className="mt-12 border-t border-hair pt-6">
        {!showWithdraw ? (
          <button
            onClick={() => setShowWithdraw(true)}
            className="text-sm text-[oklch(0.55_0.10_25)] hover:text-[oklch(0.45_0.12_25)] underline underline-offset-2 transition-colors"
          >
            {t('settings.withdrawAccount')}
          </button>
        ) : (
          <div className="border-y border-[oklch(0.78_0.08_25)] py-6 bg-[oklch(0.96_0.025_25)]">
            <h3 className="text-small font-medium text-[oklch(0.40_0.12_25)] mb-1">
              {t('settings.withdrawTitle')}
            </h3>
            <p className="text-menu text-[oklch(0.50_0.10_25)] mb-4">
              {t('settings.withdrawDesc')}
            </p>
            {!isSocialUser && (
              <input
                type="password"
                className="w-full border border-[oklch(0.78_0.08_25)] px-3 py-2 text-sm outline-none focus:border-[oklch(0.55_0.10_25)] mb-3 bg-canvas"
                placeholder={t('settings.withdrawPasswordPlaceholder')}
                value={withdrawPassword}
                onChange={e => setWithdrawPassword(e.target.value)}
              />
            )}
            {withdrawError && (
              <p className="text-menu text-[oklch(0.50_0.10_25)] mb-3">{withdrawError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="flex items-center gap-1.5 px-4 py-2 text-menu bg-[oklch(0.50_0.15_25)] text-canvas hover:bg-[oklch(0.45_0.15_25)] disabled:opacity-50 transition-colors"
              >
                {withdrawing ? (
                  <>
                    <svg className="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    {t('settings.withdrawing')}
                  </>
                ) : t('settings.withdrawConfirm')}
              </button>
              <button
                onClick={() => { setShowWithdraw(false); setWithdrawPassword(''); setWithdrawError('') }}
                className="px-4 py-2 text-menu border border-hair hover:bg-canvas-2 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
