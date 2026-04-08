import { useEffect, useState } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import Heading from '../components/Heading' //
import FolderProjectMapper from '../components/FolderProjectMapper'
import { 
  SwatchIcon, 
  ViewColumnsIcon, 
  PaintBrushIcon, 
  TagIcon, 
  LockClosedIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'

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

  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [usernameSaved, setUsernameSaved] = useState(false)
  
  const { t } = useTranslation()

  const handlePasswordChange = async () => {
    setPasswordError('')
    setPasswordSuccess('')
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t('settings.passwordInputAll'))
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않아요')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('비밀번호는 8자 이상이어야 해요')
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
      setSettings(res.data)
      setPortfolioTheme(res.data['portfolio_theme'] || 'light')
      setDeliveryTagColor(res.data['delivery_tag_color'] || 'purple')
      setDefaultGridCols(res.data['default_grid_cols'] || '3')
      setDefaultShowExif(res.data['default_show_exif'] || 'true')
      setDefaultSortBy(res.data['default_sort_by'] || 'default')
      
      // username은 /auth/me에서 별도 로드
      const token = localStorage.getItem('token')
      axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setUsername(res.data.username || '')
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
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleUsernameCheck = async (value: string) => {
    setUsername(value)
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

      // 💡 [추가] 저장이 성공하면, 변경된 유저네임을 담아서 커스텀 이벤트를 발생시킴!
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

  function colorName(value: string) {
    const c = COLOR_KEYS.find(o => o.value === value)
    if (!c) return value
    return settings[c.key] || t(`colorLabels.${c.value}`)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Heading level={2} className="mb-2">
        {t('settings.title')}
      </Heading>

      {/* 기본 보기 설정 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
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
                  {['2', '3', '4'].map((cols) => (
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
            <div className="flex gap-2">
              {[
                { value: 'default', label: t('photo.orderUpload') || '업로드순' },
                { value: 'taken_at', label: t('photo.orderTaken') || '촬영일순' },
                { value: 'name', label: t('photo.orderName') || '파일명순' }
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

          </div>
        </div>
      </div>

      {/* 컬러 레이블 설정 - 2, 2, 1 배열 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <SwatchIcon className="w-5 h-5 text-gray-500" />
          {t('settings.colorLabelNames')}
        </h3>
        {/* 아까 넣었던 pr-8은 빼셔도 됩니다 */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          {COLOR_KEYS.map(({ key, color, value }) => (
            <div key={key} className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${color} shrink-0`} />
              <span className="text-sm text-gray-500 w-12 shrink-0">{t(`colorLabels.${value}`)}</span>
              {/* 💡 flex-1을 w-40(고정 너비)로 변경했습니다 */}
              <input
                className="w-40 border rounded px-3 py-1.5 text-sm outline-none focus:border-black transition-colors"
                value={settings[key] || ''}
                onChange={e => handleChange(key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 포트폴리오 테마 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <PaintBrushIcon className="w-5 h-5 text-gray-500" />
          {t('settings.portfolioThemeDesc')}
        </h3>
        <div className="flex gap-3">
          <button
            onClick={() => setPortfolioTheme('light')}
            className={`px-4 py-2 text-sm rounded border ${portfolioTheme === 'light' ? 'bg-black text-white border-black' : 'border-gray-300 hover:bg-gray-50'}`}
          >
            ☀️ {t('settings.themeLight')}
          </button>
          <button
            onClick={() => setPortfolioTheme('dark')}
            className={`px-4 py-2 text-sm rounded border ${portfolioTheme === 'dark' ? 'bg-black text-white border-black' : 'border-gray-300 hover:bg-gray-50'}`}
          >
            🌙 {t('settings.themeDark')}
          </button>
        </div>
      </div>

      {/* 퍼블릭 포트폴리오 URL */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="font-semibold mb-1 flex items-center gap-2">
          <UserCircleIcon className="w-5 h-5 text-gray-500" />
          {t('settings.publicPortfolio')}
        </h3>
        <p className="text-xs text-gray-400 mb-4 ml-7">
          {t('settings.publicPortfolioDesc')}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 shrink-0">racconto.app/p/</span>
          <input
            className="border rounded px-3 py-2 text-sm outline-none focus:border-black w-48"
            placeholder="username"
            value={username}
            onChange={e => handleUsernameCheck(e.target.value)}
          />
          <button
            onClick={handleUsernameSave}
            // 💡 수정: '사용 가능' 상태이거나 '빈 칸'일 때 버튼 활성화
            disabled={(usernameStatus !== 'available' && username !== '') && !usernameSaved}
            className={`px-4 py-2 text-sm rounded transition-colors ${
              usernameSaved ? 'bg-green-600 text-white' :
              (usernameStatus === 'available' || username === '') ? 'bg-black text-white hover:bg-gray-800' :
              'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {usernameSaved ? '✓' : t('common.save')}
          </button>
        </div>
        {usernameStatus === 'available' && (
          <p className="text-xs text-green-500 mt-1.5 ml-[calc(theme(spacing.7)+theme(spacing.32)+theme(spacing.2))]">✓ {t('settings.usernameAvailable')}</p>
        )}
        {usernameStatus === 'taken' && (
          <p className="text-xs text-red-500 mt-1.5">{t('settings.usernameTaken')}</p>
        )}
        {usernameStatus === 'invalid' && (
          <p className="text-xs text-red-500 mt-1.5">{t('settings.usernameInvalid')}</p>
        )}
        {username && usernameStatus === 'idle' && (
          <p className="text-xs text-gray-400 mt-1.5">
            racconto.app/p/{username}
          </p>
        )}
      </div>

      {/* 로컬 폴더 연결 - Electron 앱에서만 표시 */}
      <FolderProjectMapper />

      {/* 납품 선택 자동 태그 */}
      {DELIVERY_ENABLED && (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
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
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded border transition-colors ${
                deliveryTagColor === opt.value
                  ? 'bg-black text-white border-black'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className={`w-3 h-3 rounded-full ${opt.color}`} />
              {colorName(opt.value)}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* 비밀번호 변경 - 2줄 구성 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <LockClosedIcon className="w-5 h-5 text-gray-500" />
          {t('settings.managePassword')}
        </h3>
        <div className="space-y-4">
          {/* 첫 번째 줄: 현재 비밀번호 */}
          <div>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-black"
              placeholder={t('settings.currentPassword')}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
            />
          </div>
          {/* 두 번째 줄: 새 비밀번호 & 확인 */}
          <div className="grid grid-cols-2 gap-3">
            <input
              type="password"
              className="border rounded px-3 py-2 text-sm outline-none focus:border-black"
              placeholder={t('settings.newPassword')}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              className="border rounded px-3 py-2 text-sm outline-none focus:border-black"
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
              className="bg-black text-white px-4 py-2 text-sm hover:bg-gray-800 transition-colors"
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
            saved ? 'bg-green-600 text-white' : 'bg-black text-white hover:bg-gray-800 shadow-md'
          }`}
        >
          {saved ? t('settings.saveSuccess') : t('common.save')}
        </button>
      </div>
    </div>
  )
}