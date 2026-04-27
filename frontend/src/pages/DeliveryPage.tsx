// pages/DeliveryPage.tsx
// 클라이언트용 납품 링크 뷰 → /delivery/:linkId
// Portfolio.tsx 구조 기반

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Link2, Lock, Sun, Moon } from 'lucide-react'

const API = import.meta.env.VITE_API_URL

interface DeliveryPhoto {
  id: string
  image_url: string
  caption: string | null
  order: number
  is_selected: boolean
  comment: string | null
}

interface LinkInfo {
  id: string
  project_title: string
  label: string | null
  has_password: boolean
  expires_at: string | null
}

export default function DeliveryPage() {
  const { linkId } = useParams<{ linkId: string }>()

  const [step, setStep] = useState<'loading' | 'password' | 'view' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [info, setInfo] = useState<LinkInfo | null>(null)
  const [password, setPassword] = useState('')
  const [pwError, setPwError] = useState('')

  const [photos, setPhotos] = useState<DeliveryPhoto[]>([])
  const [selected, setSelected] = useState<Record<string, string | null>>({})

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [darkMode, setDarkMode] = useState(false)

  // 라이트박스
  const [lightboxPhoto, setLightboxPhoto] = useState<DeliveryPhoto | null>(null)

  // 코멘트 편집
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')

  useEffect(() => {
    fetchInfo()
  }, [linkId])

  async function fetchInfo() {
    const res = await fetch(`${API}/api/delivery/${linkId}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErrorMsg(data.detail || '링크를 찾을 수 없습니다')
      setStep('error')
      return
    }
    const data: LinkInfo = await res.json()
    setInfo(data)
    if (data.has_password) {
      setStep('password')
    } else {
      await fetchPhotos('')
    }
  }

  async function fetchPhotos(pw: string) {
    const headers: Record<string, string> = {}
    if (pw) headers['x-delivery-password'] = pw
    const res = await fetch(`${API}/api/delivery/${linkId}/photos`, { headers })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setPwError(data.detail || '오류가 발생했습니다')
      return
    }
    const data: DeliveryPhoto[] = await res.json()
    setPhotos(data)
    const init: Record<string, string | null> = {}
    data.forEach(p => { if (p.is_selected) init[p.id] = p.comment })
    setSelected(init)
    setStep('view')
  }

  async function submitPassword() {
    setPwError('')
    const res = await fetch(`${API}/api/delivery/${linkId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (!res.ok) { setPwError('비밀번호가 올바르지 않습니다'); return }
    await fetchPhotos(password)
  }

  async function submitSelections() {
    setSaving(true)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (password) headers['x-delivery-password'] = password
    const selections = Object.entries(selected).map(([photo_id, comment]) => ({
      photo_id,
      comment: comment || null,
    }))
    await fetch(`${API}/api/delivery/${linkId}/selections`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ selections }),
    })
    setSaving(false)
    setSaved(true)
  }

  function toggleSelect(photoId: string) {
    setSaved(false)
    setSelected(prev => {
      const next = { ...prev }
      if (photoId in next) delete next[photoId]
      else next[photoId] = null
      return next
    })
  }

  function saveComment() {
    if (!editingComment) return
    setSaved(false)
    setSelected(prev => ({ ...prev, [editingComment]: commentDraft.trim() || null }))
    setEditingComment(null)
  }

  // 라이트박스 키보드
  useEffect(() => {
    if (!lightboxPhoto) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxPhoto(null)
      if (e.key === 'ArrowRight') {
        const idx = photos.findIndex(p => p.id === lightboxPhoto!.id)
        if (idx < photos.length - 1) setLightboxPhoto(photos[idx + 1])
      }
      if (e.key === 'ArrowLeft') {
        const idx = photos.findIndex(p => p.id === lightboxPhoto!.id)
        if (idx > 0) setLightboxPhoto(photos[idx - 1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxPhoto, photos])

  const selectedCount = Object.keys(selected).length
  const bg = darkMode ? 'bg-[#1A1A1A] text-white' : 'bg-[#F5F0EB] text-gray-900'
  const subText = darkMode ? 'text-gray-400' : 'text-gray-500'
  const cardBg = darkMode ? 'bg-[#2A2A2A]' : 'bg-white'

  // ── 로딩 ────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg}`}>
        <p className={subText}>불러오는 중...</p>
      </div>
    )
  }

  // ── 에러 ────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg}`}>
        <div className="text-center">
          <div className="flex justify-center mb-3"><Link2 size={40} strokeWidth={1.5} /></div>
          <p className={subText}>{errorMsg}</p>
        </div>
      </div>
    )
  }

  // ── 비밀번호 ─────────────────────────────────────────────
  if (step === 'password') {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg} px-4`}>
        <div className={`w-full max-w-sm ${cardBg} rounded-2xl shadow p-8`}>
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3"><Lock size={40} strokeWidth={1.5} /></div>
            <h1 className="text-lg font-semibold">{info?.project_title || '납품 링크'}</h1>
            {info?.label && <p className={`text-sm ${subText} mt-1`}>{info.label}</p>}
          </div>
          <input
            type="password"
            className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-white text-gray-900'} focus:outline-none focus:ring-2 focus:ring-gray-400 mb-3`}
            placeholder="비밀번호 입력"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitPassword()}
          />
          {pwError && <p className="text-red-500 text-sm mb-3">{pwError}</p>}
          <button
            onClick={submitPassword}
            className="w-full py-3 bg-gray-900 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    )
  }

  // ── 메인 뷰 ─────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      <div className="max-w-5xl mx-auto p-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-wider">{info?.project_title}</h2>
            {info?.label && <p className={`text-sm ${subText} mt-1`}>{info.label}</p>}
          </div>
          <div className="flex items-center gap-3">
            {/* 다크모드 토글 */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full border ${darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-500'}`}
            >
              {darkMode ? <><Sun size={12} strokeWidth={1.5} /> 라이트</> : <><Moon size={12} strokeWidth={1.5} /> 다크</>}
            </button>
            {/* 선택 완료 버튼 */}
            <button
              onClick={submitSelections}
              disabled={saving || selectedCount === 0}
              className={`px-4 py-2 text-sm rounded-full font-medium transition-colors ${
                saved
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-900 hover:bg-gray-700 text-white disabled:opacity-40'
              }`}
            >
              {saving ? '저장 중...' : saved ? '✓ 전달됨' : `선택 완료 (${selectedCount})`}
            </button>
          </div>
        </div>

        {/* 안내 문구 */}
        <p className={`text-sm ${subText} mb-8`}>
          원하는 사진을 클릭해 선택하세요. 선택 후 "선택 완료"를 눌러주세요.
        </p>

        {/* 사진 그리드 */}
        {photos.length === 0 ? (
          <div className="text-center py-20">
            <p className={subText}>사진이 없습니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {photos.map(photo => {
              const isSelected = photo.id in selected
              const comment = selected[photo.id]
              return (
                <div
                  key={photo.id}
                  className={`relative group rounded overflow-hidden cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-gray-900 dark:ring-white' : ''
                  }`}
                >
                  {/* 사진 */}
                  <img
                    src={photo.image_url}
                    alt={photo.caption || ''}
                    className="w-full object-contain bg-gray-50 hover:opacity-90 transition-opacity"
                    onClick={() => setLightboxPhoto(photo)}
                  />

                  {/* 선택 체크 오버레이 */}
                  <div
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"
                    onClick={() => toggleSelect(photo.id)}
                  />

                  {/* 선택 체크 배지 */}
                  {isSelected && (
                    <div className="absolute top-2 left-2 w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center shadow pointer-events-none">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  {/* 확대 버튼 */}
                  <button
                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={e => { e.stopPropagation(); setLightboxPhoto(photo) }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>

                  {/* 코멘트 버튼 (선택된 경우만) */}
                  {isSelected && (
                    <button
                      className="absolute bottom-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      onClick={e => {
                        e.stopPropagation()
                        setCommentDraft(comment || '')
                        setEditingComment(photo.id)
                      }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </button>
                  )}

                  {/* 코멘트 표시 */}
                  {comment && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1.5 pointer-events-none">
                      <p className="text-white text-[11px] leading-tight line-clamp-2">{comment}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 코멘트 모달 */}
      {editingComment && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setEditingComment(null)}
        >
          <div
            className={`w-full max-w-sm ${cardBg} rounded-2xl p-6 shadow`}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold mb-3">코멘트 추가</h3>
            <textarea
              className={`w-full h-28 px-3 py-2 text-sm rounded-lg border ${
                darkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-white text-gray-900'
              } resize-none focus:outline-none focus:ring-1 focus:ring-gray-400`}
              placeholder="이 사진에 대한 메모나 요청사항을 입력하세요"
              value={commentDraft}
              onChange={e => setCommentDraft(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 justify-end mt-3">
              <button
                onClick={() => setEditingComment(null)}
                className={`px-4 py-2 text-sm rounded-lg border ${darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-600'}`}
              >
                취소
              </button>
              <button
                onClick={saveComment}
                className="px-4 py-2 text-sm rounded-lg bg-gray-900 hover:bg-gray-700 text-white font-medium"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 라이트박스 */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center"
          onClick={() => setLightboxPhoto(null)}
        >
          {/* 닫기 */}
          <button
            className="absolute top-6 right-6 text-white text-2xl hover:text-gray-300 z-10"
            onClick={() => setLightboxPhoto(null)}
          >
            ✕
          </button>

          {/* 이전 */}
          <button
            className="absolute left-6 text-white text-5xl hover:text-gray-300 z-10 select-none"
            onClick={e => {
              e.stopPropagation()
              const idx = photos.findIndex(p => p.id === lightboxPhoto.id)
              if (idx > 0) setLightboxPhoto(photos[idx - 1])
            }}
          >
            ‹
          </button>

          {/* 이미지 */}
          <div
            className="max-w-5xl max-h-screen p-12 flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={lightboxPhoto.image_url}
              alt={lightboxPhoto.caption || ''}
              className="max-w-full max-h-[80vh] object-contain"
            />
            {lightboxPhoto.caption && (
              <p className="text-white text-sm mt-4 text-center">{lightboxPhoto.caption}</p>
            )}
            <div className="flex items-center gap-4 mt-3">
              <p className="text-gray-500 text-xs">
                {photos.findIndex(p => p.id === lightboxPhoto.id) + 1} / {photos.length}
              </p>
              {/* 라이트박스에서도 선택 토글 */}
              <button
                onClick={() => toggleSelect(lightboxPhoto.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  lightboxPhoto.id in selected
                    ? 'bg-white text-black'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {lightboxPhoto.id in selected ? '✓ 선택됨' : '선택'}
              </button>
            </div>
          </div>

          {/* 다음 */}
          <button
            className="absolute right-6 text-white text-5xl hover:text-gray-300 z-10 select-none"
            onClick={e => {
              e.stopPropagation()
              const idx = photos.findIndex(p => p.id === lightboxPhoto.id)
              if (idx < photos.length - 1) setLightboxPhoto(photos[idx + 1])
            }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}