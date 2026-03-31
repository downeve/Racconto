import { useEffect, useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

const COLOR_KEYS = [
  { key: 'color_label_red',    color: 'bg-red-500',    value: 'red',    label: '빨강' },
  { key: 'color_label_yellow', color: 'bg-yellow-400', value: 'yellow', label: '노랑' },
  { key: 'color_label_green',  color: 'bg-green-500',  value: 'green',  label: '초록' },
  { key: 'color_label_blue',   color: 'bg-blue-500',   value: 'blue',   label: '파랑' },
  { key: 'color_label_purple', color: 'bg-purple-500', value: 'purple', label: '보라' },
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

  const handlePasswordChange = async () => {
    setPasswordError('')
    setPasswordSuccess('')
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('모든 항목을 입력해주세요')
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
      setPasswordSuccess('비밀번호가 변경되었습니다!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPasswordError(err.response?.data?.detail || '변경에 실패했어요')
    }
  }

  useEffect(() => {
    axios.get(`${API}/settings/`).then(res => {
      setSettings(res.data)
      setPortfolioTheme(res.data['portfolio_theme'] || 'light')
      setDeliveryTagColor(res.data['delivery_tag_color'] || 'purple')
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
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // 현재 컬러 레이블 이름 가져오기 (커스텀 이름 반영)
  function colorName(value: string) {
    const c = COLOR_KEYS.find(o => o.value === value)
    if (!c) return value
    return settings[c.key] || c.label
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-8">설정</h2>

      {/* 컬러 레이블 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="font-semibold mb-4">컬러 레이블 이름</h3>
        <div className="space-y-3">
          {COLOR_KEYS.map(({ key, color, label }) => (
            <div key={key} className="flex items-center gap-4">
              <div className={`w-4 h-4 rounded-full ${color} shrink-0`} />
              <span className="text-sm text-gray-500 w-12 shrink-0">{label}</span>
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
        <h3 className="font-semibold mb-4">기본 보기 설정</h3>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">기본 그리드 컬럼</span>
          <div className="flex gap-2">
            {[
              { cols: '2', icon: '2' },
              { cols: '3', icon: '3' },
              { cols: '4', icon: '4' },
              { cols: '1', icon: '≡' },
            ].map(({ cols, icon }) => (
              <button
                key={cols}
                onClick={() => handleChange('default_grid_cols', cols)}
                className={`w-8 h-8 text-xs rounded ${settings['default_grid_cols'] === cols ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 포트폴리오 테마 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="font-semibold mb-4">포트폴리오 기본 테마</h3>
        <div className="flex gap-3">
          <button
            onClick={() => setPortfolioTheme('light')}
            className={`px-4 py-2 text-sm rounded border ${portfolioTheme === 'light' ? 'bg-black text-white border-black' : 'border-gray-300 hover:bg-gray-50'}`}
          >
            ☀️ 라이트 (베이지)
          </button>
          <button
            onClick={() => setPortfolioTheme('dark')}
            className={`px-4 py-2 text-sm rounded border ${portfolioTheme === 'dark' ? 'bg-black text-white border-black' : 'border-gray-300 hover:bg-gray-50'}`}
          >
            🌙 다크
          </button>
        </div>
      </div>

      {/* 납품 선택 태그 */}
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

      {/* 비밀번호 변경 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="font-semibold mb-4">비밀번호 변경</h3>
        <div className="space-y-3">
          <input
            type="password"
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="현재 비밀번호"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
          />
          <input
            type="password"
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="새 비밀번호"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
          <input
            type="password"
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="새 비밀번호 확인"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
          />
          {passwordError && <p className="text-red-500 text-xs">{passwordError}</p>}
          {passwordSuccess && <p className="text-green-500 text-xs">{passwordSuccess}</p>}
          <button
            onClick={handlePasswordChange}
            className="bg-black text-white px-4 py-2 text-sm hover:bg-gray-800"
          >
            비밀번호 변경
          </button>
        </div>
      </div>

      {/* 저장 버튼 */}
      <button
        onClick={handleSave}
        className="bg-black text-white px-6 py-2 text-sm tracking-wider hover:bg-gray-800"
      >
        {saved ? '✓ 저장됨' : '저장'}
      </button>
    </div>
  )
}