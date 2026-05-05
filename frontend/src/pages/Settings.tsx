import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import Heading from '../components/Heading' //
import FolderProjectMapper from '../components/FolderProjectMapper'
import { useAuth } from '../context/AuthContext'
import {
  SwatchIcon,
  ViewColumnsIcon,
  PaintBrushIcon,
  TagIcon,
  LockClosedIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import { Sun, Moon, Check } from 'lucide-react'

const API = import.meta.env.VITE_API_URL
const DELIVERY_ENABLED = import.meta.env.VITE_ENABLE_DELIVERY === 'true'

const COLOR_KEYS = [
  { key: 'color_label_red',    color: 'bg-red-500',    value: 'red' },
  { key: 'color_label_yellow', color: 'bg-yellow-400', value: 'yellow' },
  { key: 'color_label_green',  color: 'bg-green-500',  value: 'green' },
  { key: 'color_label_blue',   color: 'bg-blue-500',   value: 'blue' },
  { key: 'color_label_purple', color: 'bg-purple-500', value: 'purple' },
]

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

  useEffect(() => {
    axios.get(`${API}/settings/`).then(res => {

      console.log('설정 API 응답 데이터:', res.data)
      
      setSettings(res.data)
      setPortfolioTheme(res.data['portfolio_theme'] || 'light')
      setDeliveryTagColor(res.data['delivery_tag_color'] || 'purple')
      setDefaultGridCols(res.data['default_grid_cols'] || '3')
      setDefaultShowExif(res.data['default_show_exif'] || 'true')
      setDefaultSortBy(res.data['default_sort_by'] || 'default')
      setDefaultSortOrder(res.data['default_sort_order'] || 'asc')
      
      // username은 /auth/me에서 별도 로드
      const token = localStorage.getItem('token')
      axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setUsername(res.data.username || '')
        originalUsername.current = res.data.username || ''
        setEmail(res.data.email || '')
        setTier(res.data.tier || '')
        setProjectCount(res.data.project_count ?? 0)
        setProjectLimit(res.data.project_limit ?? 0)
        setPhotoCount(res.data.photo_count ?? 0)
        setPhotoLimit(res.data.photo_limit ?? 0)
      })
    })
  }, [])

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    await axios.put(`${API}/settings/batch/update`, {
      ...settings,
      portfolio_theme: portfolioTheme,
      delivery_tag_color: deliveryTagColor,
      default_grid_cols: defaultGridCols,
      default_show_exif: defaultShowExif,
      default_sort_by: defaultSortBy,
      default_sort_order: defaultSortOrder,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleUsernameCheck = async (value: string) => {
    setUsername(value)
    if (value === originalUsername.current) {   // ← 추가
      setUsernameStatus('idle')
      return
    }
    if (value.length < 3) { setUsernameStatus('idle'); return }
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) { setUsernameStatus('invalid'); return }
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

  const handleWithdraw = async () => {
    if (!withdrawPassword) {
      setWithdrawError(t('settings.withdrawPasswordRequired'))
      return
    }
    setWithdrawing(true)
    setWithdrawError('')
    try {
      const token = localStorage.getItem('token')
      // 비밀번호 확인
      const formData = new FormData()
      formData.append('username', '') // 임시
      await axios.delete(`${API}/auth/withdraw`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { password: withdrawPassword, lang: i18n.language.startsWith('ko') ? 'ko' : 'en' }
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
    <div className="max-w-2xl mx-auto p-6">
      <Heading level={2} className="mb-4 font-serif font-semibold">
        {t('settings.title')}
      </Heading>

      {/* 사용자 정보 */}
      <div className="mb-5 p-4 bg-stone-50 rounded-card border border-stone-200 shadow">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-stone-600 shadow flex items-center justify-center">
            <span className="text-card text-h3 font-bold">
              {email ? email[0].toUpperCase() : '?'}
            </span>
          </div>
          <div>
            <p className="text-xs text-stone-500 font-bold uppercase tracking-widest mb-0.5">
              {t('settings.currentUser')}
            </p>
            <p className="text-base text-stone-900 font-semibold tracking-tight">
              {email || 'Loading...'}
            </p>
          </div>
          {tier && (
            <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-card bg-stone-800 text-white tracking-wide">
              {t(`settings.tier.${tier}`, tier)}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-card p-3 border border-stone-100">
            <p className="text-xs text-stone-400 mb-1">{t('settings.usage.projects')}</p>
            <p className="text-sm font-semibold text-stone-800">
              {projectCount} / {projectLimit}
            </p>
            <div className="mt-1.5 h-1 bg-stone-100 rounded-card overflow-hidden">
              <div
                className="h-full bg-stone-600 rounded-card"
                style={{ width: `${projectLimit > 0 ? Math.min((projectCount / projectLimit) * 100, 100) : 0}%` }}
              />
            </div>
          </div>
          <div className="bg-white rounded-card p-3 border border-stone-100">
            <p className="text-xs text-stone-400 mb-1">{t('settings.usage.photos')}</p>
            <p className="text-sm font-semibold text-stone-800">
              {photoCount} / {photoLimit}
            </p>
            <div className="mt-1.5 h-1 bg-stone-100 rounded-card overflow-hidden">
              <div
                className="h-full bg-stone-600 rounded-card"
                style={{ width: `${photoLimit > 0 ? Math.min((photoCount / photoLimit) * 100, 100) : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 기본 보기 설정 */}
      <div className="bg-white rounded-card shadow p-6 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <ViewColumnsIcon className="w-5 h-5 text-gray-500" />
          {t('settings.defaultView')}
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-[max-content_1fr] items-center gap-x-4 gap-y-6">
            {/* 그리드 & EXIF 한 줄 배치 */}
            <div className="col-span-2 flex items-center gap-12">
              {/* 1. 그리드 컬럼 */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">{t('settings.defaultGridCols')}</span>
                <div className="flex gap-2">
                  {['2', '3', '4', '5'].map((cols) => (
                    <button
                      key={cols}
                      onClick={() => setDefaultGridCols(cols)}
                      className={`w-8 h-8 text-xs rounded font-medium ${defaultGridCols === cols ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                      {cols}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. EXIF 기본값 */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">{t('settings.defaultExif')}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDefaultShowExif('true')}
                    className={`px-3 py-1.5 text-xs rounded font-medium ${defaultShowExif === 'true' ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    ON
                  </button>
                  <button
                    onClick={() => setDefaultShowExif('false')}
                    className={`px-3 py-1.5 text-xs rounded font-medium ${defaultShowExif === 'false' ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    OFF
                  </button>
                </div>
              </div>
            </div>

            <span className="text-sm text-gray-500">{t('photo.listOrder')}</span>
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
                    className={`px-3 py-1.5 text-xs rounded font-medium ${defaultSortBy === opt.value ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* 구분선 */}
              <div className="w-px h-4 bg-gray-200" />

              {/* 오름/내림차순 */}
              <div className="flex gap-2">
                <button
                  onClick={() => setDefaultSortOrder('asc')}
                  className={`px-3 py-1.5 text-xs rounded font-medium ${defaultSortOrder === 'asc' ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  {t('photo.orderAsc')}
                </button>
                <button
                  onClick={() => setDefaultSortOrder('desc')}
                  className={`px-3 py-1.5 text-xs rounded font-medium ${defaultSortOrder === 'desc' ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  {t('photo.orderDesc')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 컬러 레이블 설정 - 2, 2, 1 배열 */}
      <div className="bg-white rounded-card shadow p-6 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <SwatchIcon className="w-5 h-5 text-gray-500" />
          {t('settings.colorLabelNames')}
        </h3>
        {/* 아까 넣었던 pr-8은 빼셔도 됩니다 */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          {COLOR_KEYS.map(({ key, color, value }) => (
            <div key={key} className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-card ${color} shrink-0`} />
              <span className="text-sm text-gray-500 w-12 shrink-0">{t(`colorLabels.${value}`)}</span>
              {/* flex-1을 w-40(고정 너비)으로 변경 */}
              <input
                className="w-40 border rounded px-3 py-1.5 text-sm outline-none focus:border-black transition-[background,color,border] duration-150 ease-out"
                value={settings[key] || ''}
                onChange={e => handleChange(key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 포트폴리오 테마 */}
      <div className="bg-white rounded-card shadow p-6 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <PaintBrushIcon className="w-5 h-5 text-gray-500" />
          {t('settings.portfolioThemeDesc')}
        </h3>
        <div className="flex gap-3">
          <button
            onClick={() => setPortfolioTheme('light')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded border ${portfolioTheme === 'light' ? 'bg-black text-white border-black' : 'border-gray-300 hover:bg-gray-50'}`}
          >
            <Sun size={14} strokeWidth={1.5} />{t('settings.themeLight')}
          </button>
          <button
            onClick={() => setPortfolioTheme('dark')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded border ${portfolioTheme === 'dark' ? 'bg-black text-white border-black' : 'border-gray-300 hover:bg-gray-50'}`}
          >
            <Moon size={14} strokeWidth={1.5} />{t('settings.themeDark')}
          </button>
        </div>
      </div>

      {/* 퍼블릭 포트폴리오 URL */}
      <div className="bg-white rounded-card shadow p-6 mb-6">
        <h3 className="font-semibold mb-1 flex items-center gap-2">
          <UserCircleIcon className="w-5 h-5 text-gray-500" />
          {t('settings.publicPortfolio')}
        </h3>
        <p className="text-xs text-gray-400 mb-4 ml-7">
          {t('settings.publicPortfolioDesc')}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 shrink-0">racconto.app/</span>
          <input
            className="border rounded px-3 py-2 text-sm outline-none focus:border-black w-48"
            placeholder="username"
            value={username}
            onChange={e => handleUsernameCheck(e.target.value)}
          />
          <button
            onClick={handleUsernameSave}
            // 수정: '사용 가능' 상태이거나 '빈 칸'일 때 버튼 활성화
            disabled={(usernameStatus !== 'available' && username !== '') && !usernameSaved}
            className={`px-4 py-2 text-sm rounded transition-[background,color,border] duration-150 ease-out ${
              usernameSaved ? 'bg-green-600 text-white' :
              (usernameStatus === 'available' || username === '') ? 'bg-black text-white hover:bg-gray-800' :
              'bg-gray-100 text-gray-400 cursor-not-allowed'
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
          <p className="text-xs text-gray-400 mt-1.5">
            racconto.app/{username}
          </p>
        )}
      </div>

      {/* 로컬 폴더 연결 - Electron 앱에서만 표시 */}
      <FolderProjectMapper />

      {/* 납품 선택 자동 태그 */}
      {DELIVERY_ENABLED && (
      <div className="bg-white rounded-card shadow p-6 mb-6">
        <h3 className="font-semibold mb-1 flex items-center gap-2">
          <TagIcon className="w-5 h-5 text-gray-500" />
          납품 선택 자동 태그
        </h3>
        <p className="text-xs text-gray-400 mb-4 ml-7">
          고객이 납품 링크에서 선택 완료하면 해당 사진에 자동으로 이 컬러 레이블이 태깅됩니다.
        </p>
        <div className="flex gap-2 flex-wrap">
          {COLOR_KEYS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setDeliveryTagColor(opt.value)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded border transition-[background,color,border] duration-150 ease-out ${
                deliveryTagColor === opt.value
                  ? 'bg-black text-white border-black'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className={`w-3 h-3 rounded-card ${opt.color}`} />
              {colorName(opt.value)}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* 비밀번호 변경 - 2줄 구성 */}
      <div className="bg-white rounded-card shadow p-6 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <LockClosedIcon className="w-5 h-5 text-gray-500" />
          {t('settings.managePassword')}
        </h3>
        <div className="space-y-4">
          {/* 첫 번째 줄: 현재 비밀번호 */}
          <div>
            <input
              type="password"
              className="w-full border rounded-card px-3 py-2 text-sm outline-none focus:border-black"
              placeholder={t('settings.currentPassword')}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
            />
          </div>
          {/* 두 번째 줄: 새 비밀번호 & 확인 */}
          <div className="grid grid-cols-2 gap-3">
            <input
              type="password"
              className="border rounded-card px-3 py-2 text-sm outline-none focus:border-black"
              placeholder={t('settings.newPassword')}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              className="border rounded-card px-3 py-2 text-sm outline-none focus:border-black"
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
              className="bg-black text-white px-4 py-2 text-sm hover:bg-gray-800 transition-[background,color,border] duration-150 ease-out"
            >
              {t('settings.changePassword')}
            </button>
          </div>
        </div>
      </div>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-8 py-2.5 text-sm font-bold tracking-wider rounded transition-all ${
            saved ? 'bg-green-600 text-white' : 'bg-black text-white hover:bg-gray-800 shadow'
          }`}
        >
          {saved ? t('settings.saveSuccess') : t('common.save')}
        </button>
      </div>

      {/* 회원 탈퇴 */}
      <div className="mt-12 border-t border-gray-200 pt-6">
        {!showWithdraw ? (
          <button
            onClick={() => setShowWithdraw(true)}
            className="text-sm text-red-400 hover:text-red-600 underline underline-offset-2"
          >
            {t('settings.withdrawAccount')}
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-card p-5">
            <h3 className="text-small font-semibold text-red-700 mb-1">
              {t('settings.withdrawTitle')}
            </h3>
            <p className="text-menu text-red-500 mb-4">
              {t('settings.withdrawDesc')}
            </p>
            <input
              type="password"
              className="w-full border border-red-200 rounded px-3 py-2 text-sm outline-none focus:border-red-400 mb-3 bg-white"
              placeholder={t('settings.withdrawPasswordPlaceholder')}
              value={withdrawPassword}
              onChange={e => setWithdrawPassword(e.target.value)}
            />
            {withdrawError && (
              <p className="text-menu text-red-500 mb-3">{withdrawError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="flex items-left gap-1.5 px-4 py-2 text-menu bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
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
                className="px-4 py-2 text-menu border rounded hover:bg-gray-50"
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
