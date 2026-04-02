import { useEffect, useState } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'

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
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function colorName(value: string) {
    const c = COLOR_KEYS.find(o => o.value === value)
    if (!c) return value
    
    //c.label 대신 t() 함수를 사용해 동적으로 번역을 가져옵니다.
    return settings[c.key] || t(`colorLabels.${c.value}`)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-8">{t('settings.title')}</h2>

      {/* 컬러 레이블 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="font-semibold mb-4">{t('settings.colorLabelNames')}</h3>
        <div className="space-y-3">
          {COLOR_KEYS.map(({ key, color, value }) => (
            <div key={key} className="flex items-center gap-4">
              <div className={`w-4 h-4 rounded-full ${color} shrink-0`} />
              <span className="text-sm text-gray-500 w-12 shrink-0">{t(`colorLabels.${value}`)}</span>
              <input
                className="flex-1 border rounded px-3 py-1.5 text-sm"
                value={settings[key] || ''}
                onChange={e => handleChange(key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 기본 보기 설정 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="font-semibold mb-4">{t('settings.defaultView')}</h3>
        <div className="space-y-4">
        <div className="grid grid-cols-[max-content_1fr] items-center gap-x-4 gap-y-6">
          
          {/* 그리드 컬럼 */}
          <span className="text-sm text-gray-500">{t('settings.defaultGridCols')}</span>
          <div className="flex gap-2">
            {[
              { cols: '2', icon: '2' },
              { cols: '3', icon: '3' },
              { cols: '4', icon: '4' },
              { cols: '1', icon: '≡' },
            ].map(({ cols, icon }) => (
              <button
                key={cols}
                onClick={() => setDefaultGridCols(cols)}
                className={`w-8 h-8 text-xs rounded ${defaultGridCols === cols ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* EXIF 기본값 */}
          <span className="text-sm text-gray-500">{t('settings.defaultExif')}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setDefaultShowExif('true')}
              className={`px-3 py-1.5 text-xs rounded ${defaultShowExif === 'true' ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              ON
            </button>
            <button
              onClick={() => setDefaultShowExif('false')}
              className={`px-3 py-1.5 text-xs rounded ${defaultShowExif === 'false' ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              OFF
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* 포트폴리오 테마 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="font-semibold mb-4">{t('settings.portfolioThemeDesc')}</h3>
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

      {/* 납품 선택 자동 태그 */}
      {DELIVERY_ENABLED && (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="font-semibold mb-1">납품 선택 자동 태그</h3>
        <p className="text-xs text-gray-400 mb-4">
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
        <p className="text-xs text-gray-400 mt-3">
          → 고객 선택 완료 시 선택된 사진에 <strong>{colorName(deliveryTagColor)}</strong> 레이블 자동 태깅
        </p>
      </div>
      )}

      {/* 비밀번호 변경 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="font-semibold mb-4">{t('settings.managePassword')}</h3>
        <div className="space-y-3">
          <input
            type="password"
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder={t('settings.currentPassword')}
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
          />
          <input
            type="password"
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder={t('settings.newPassword')}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
          <input
            type="password"
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder={t('settings.newPasswordConfirm')}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
          />
          {passwordError && <p className="text-red-500 text-xs">{t('settings.passwordChangeFailed')}</p>}
          {passwordSuccess && <p className="text-green-500 text-xs">{t('settings.passwordChanged')}</p>}
          <button
            onClick={handlePasswordChange}
            className="bg-black text-white px-4 py-2 text-sm hover:bg-gray-800"
          >
            {t('settings.changePassword')}
          </button>
        </div>
      </div>

      {/* 저장 버튼 */}
      <button
        onClick={handleSave}
        className="bg-black text-white px-6 py-2 text-sm tracking-wider hover:bg-gray-800"
      >
        {saved ? t('settings.saveSuccess') : t('common.save')}
      </button>
    </div>
  )
}