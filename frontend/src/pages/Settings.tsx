import { useEffect, useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

const COLOR_KEYS = [
  { key: 'color_label_red', color: 'bg-red-500', label: '빨강' },
  { key: 'color_label_yellow', color: 'bg-yellow-400', label: '노랑' },
  { key: 'color_label_green', color: 'bg-green-500', label: '초록' },
  { key: 'color_label_blue', color: 'bg-blue-500', label: '파랑' },
  { key: 'color_label_purple', color: 'bg-purple-500', label: '보라' },
]

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    axios.get(`${API}/settings/`).then(res => setSettings(res.data))
  }, [])

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    await axios.put(`${API}/settings/batch/update`, settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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