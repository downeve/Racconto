// components/DeliveryManager.tsx

import { useState, useEffect } from 'react'
import axios from 'axios'
import { Lock, Camera } from 'lucide-react'

const API = import.meta.env.VITE_API_URL

const COLOR_DEFAULTS = [
  { value: 'red',    bg: 'bg-red-500',    defaultLabel: '거절' },
  { value: 'yellow', bg: 'bg-yellow-400', defaultLabel: '보류' },
  { value: 'green',  bg: 'bg-green-500',  defaultLabel: '선택' },
  { value: 'blue',   bg: 'bg-blue-500',   defaultLabel: '클라이언트 공유' },
  { value: 'purple', bg: 'bg-purple-500', defaultLabel: '최종 선택' },
]

interface ColorOption {
  value: string
  bg: string
  label: string
}

interface DeliveryLink {
  id: string
  project_id: string
  label: string | null
  has_password: boolean
  expires_at: string | null
  created_at: string
  selection_count: number
  filter_rating: number | null
  filter_color: string | null
}

interface SelectionResult {
  photo_id: string
  image_url: string
  caption: string | null
  comment: string | null
  selected_at: string
  order: number
}

interface Props {
  projectId: string
}

export default function DeliveryManager({ projectId }: Props) {
  const [colorOptions, setColorOptions] = useState<ColorOption[]>(
    COLOR_DEFAULTS.map(c => ({ value: c.value, bg: c.bg, label: c.defaultLabel }))
  )

  const [links, setLinks] = useState<DeliveryLink[]>([])
  const [showForm, setShowForm] = useState(false)

  const [label, setLabel] = useState('')
  const [password, setPassword] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [filterColor, setFilterColor] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [viewingSelections, setViewingSelections] = useState<string | null>(null)
  const [selections, setSelections] = useState<SelectionResult[]>([])
  const [loadingSelections, setLoadingSelections] = useState(false)
  const [appliedCaptions, setAppliedCaptions] = useState<Record<string, string>>({})
  const [applyingCaption, setApplyingCaption] = useState<string | null>(null)

  useEffect(() => {
    // 설정에서 커스텀 컬러 레이블 이름 불러오기
    axios.get(`${API}/settings/`).then(res => {
      setColorOptions(COLOR_DEFAULTS.map(c => ({
        value: c.value,
        bg: c.bg,
        label: res.data[`color_label_${c.value}`] || c.defaultLabel,
      })))
    })
    fetchLinks()
  }, [projectId])

  async function fetchLinks() {
    const res = await axios.get(`${API}/api/delivery/project/${projectId}`)
    setLinks(res.data)
  }

  async function createLink() {
    setCreating(true)
    const body: Record<string, unknown> = { project_id: projectId }
    if (label.trim()) body.label = label.trim()
    if (password.trim()) body.password = password.trim()
    if (expiresAt) body.expires_at = new Date(`${expiresAt}T23:59:59`).toISOString()
    if (filterRating !== null) body.filter_rating = filterRating
    if (filterColor !== null) body.filter_color = filterColor
    await axios.post(`${API}/api/delivery`, body)
    setCreating(false)
    setShowForm(false)
    resetForm()
    fetchLinks()
  }

  function resetForm() {
    setLabel(''); setPassword(''); setExpiresAt('')
    setFilterRating(null); setFilterColor(null)
  }

  async function deleteLink(id: string) {
    if (!confirm('링크를 삭제할까요? 클라이언트 선택 결과도 사라집니다.')) return
    await axios.delete(`${API}/api/delivery/${id}`)
    if (viewingSelections === id) setViewingSelections(null)
    fetchLinks()
  }

  async function viewSelections(linkId: string) {
    if (viewingSelections === linkId) { setViewingSelections(null); return }
    setViewingSelections(linkId)
    setAppliedCaptions({})
    setLoadingSelections(true)
    const res = await axios.get(`${API}/api/delivery/${linkId}/selections`)
    setSelections(res.data)
    setLoadingSelections(false)
  }

  async function applyCommentAsCaption(photoId: string, comment: string) {
    setApplyingCaption(photoId)
    const res = await axios.get(`${API}/photos/${photoId}`)
    await axios.put(`${API}/photos/${photoId}`, { ...res.data, caption: comment })
    setApplyingCaption(null)
    setAppliedCaptions(prev => ({ ...prev, [photoId]: comment }))
  }

  function copyLink(id: string) {
    navigator.clipboard.writeText(`${window.location.origin}/delivery/${id}`)
    alert('링크 복사됨!')
  }

  function formatDate(iso: string | null) {
    if (!iso) return '영구'
    return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  function filterLabel(link: DeliveryLink) {
    const parts = []
    if (link.filter_rating) parts.push(`★${link.filter_rating} 이상`)
    if (link.filter_color) {
      const c = colorOptions.find(o => o.value === link.filter_color)
      if (c) parts.push(c.label)
    }
    return parts.length > 0 ? parts.join(' + ') : '전체 사진'
  }

  return (
    <div className="mt-6 border-t pt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">납품 링크</h3>
        <button
          onClick={() => { setShowForm(v => !v); if (showForm) resetForm() }}
          className="text-xs px-3 py-1.5 bg-black hover:bg-gray-800 text-white rounded tracking-wider"
        >
          + 링크 생성
        </button>
      </div>

      {/* 생성 폼 */}
      {showForm && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">메모 (클라이언트명 등)</label>
            <input
              className="w-full text-sm px-3 py-2 rounded border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-black"
              placeholder="예: 김철수 님"
              value={label} onChange={e => setLabel(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">공개할 사진 기준</label>
            <div className="mb-2">
              <p className="text-xs text-gray-500 mb-1">별점 이상</p>
              <div className="flex gap-1">
                <button onClick={() => setFilterRating(null)}
                  className={`px-2 py-1 text-xs rounded border ${filterRating === null ? 'bg-black text-white border-black' : 'border-gray-300 hover:bg-gray-100'}`}>전체</button>
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => setFilterRating(filterRating === star ? null : star)}
                    className={`px-2 py-1 text-xs rounded border ${filterRating === star ? 'bg-black text-white border-black' : 'border-gray-300 hover:bg-gray-100'}`}>
                    {'★'.repeat(star)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">컬러 레이블</p>
              <div className="flex gap-1 flex-wrap">
                <button onClick={() => setFilterColor(null)}
                  className={`px-2 py-1 text-xs rounded border ${filterColor === null ? 'bg-black text-white border-black' : 'border-gray-300 hover:bg-gray-100'}`}>전체</button>
                {colorOptions.map(opt => (
                  <button key={opt.value} onClick={() => setFilterColor(filterColor === opt.value ? null : opt.value)}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded border ${filterColor === opt.value ? 'bg-black text-white border-black' : 'border-gray-300 hover:bg-gray-100'}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${opt.bg}`} />{opt.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              → {filterRating || filterColor
                ? `${filterRating ? `★${filterRating} 이상` : ''}${filterRating && filterColor ? ' + ' : ''}${filterColor ? colorOptions.find(o => o.value === filterColor)?.label + ' 레이블' : ''} 사진 공개`
                : '전체 사진 공개 (필터 없음)'}
            </p>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">비밀번호 (선택)</label>
              <input type="password"
                className="w-full text-sm px-3 py-2 rounded border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-black"
                placeholder="없으면 공개" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">만료일 (선택)</label>
              <input type="date"
                className="w-full text-sm px-3 py-2 rounded border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-black"
                value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); resetForm() }}
              className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100">취소</button>
            <button onClick={createLink} disabled={creating}
              className="text-xs px-4 py-1.5 bg-black hover:bg-gray-800 disabled:opacity-50 text-white rounded tracking-wider">
              {creating ? '생성 중...' : '생성'}
            </button>
          </div>
        </div>
      )}

      {/* 링크 목록 */}
      {links.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">납품 링크가 없습니다</p>
      ) : (
        <div className="space-y-2">
          {links.map(link => (
            <div key={link.id} className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-white">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800 truncate">{link.label || '무제 링크'}</span>
                    {link.has_password && (
                      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded"><Lock size={10} strokeWidth={1.5} /> 비번</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 flex gap-2 flex-wrap">
                    <span className="flex items-center gap-1"><Camera size={12} strokeWidth={1.5} />{filterLabel(link)}</span>
                    <span>·</span>
                    <span>선택 {link.selection_count}장</span>
                    <span>·</span>
                    <span>만료: {formatDate(link.expires_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => copyLink(link.id)} title="링크 복사"
                    className="p-1.5 text-gray-400 hover:text-black transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button onClick={() => viewSelections(link.id)} title="선택 결과 보기"
                    className={`p-1.5 transition-colors ${viewingSelections === link.id ? 'text-black' : 'text-gray-400 hover:text-black'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </button>
                  <button onClick={() => deleteLink(link.id)} title="삭제"
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 선택 결과 패널 */}
              {viewingSelections === link.id && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                  {loadingSelections ? (
                    <p className="text-xs text-gray-400">불러오는 중...</p>
                  ) : selections.length === 0 ? (
                    <p className="text-xs text-gray-400">아직 선택된 사진이 없습니다</p>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-3">선택된 사진 {selections.length}장</p>
                      <div className="grid grid-cols-3 gap-3">
                        {selections.map(s => {
                          const isApplied = s.photo_id in appliedCaptions
                          const appliedCaption = appliedCaptions[s.photo_id]
                          const displayCaption = isApplied ? appliedCaption : s.caption
                          return (
                            <div key={s.photo_id} className="bg-white rounded-lg overflow-hidden border border-gray-100">
                              <div className="bg-gray-100 flex items-center justify-center">
                                <img
                                  src={s.image_url}
                                  alt={displayCaption || ''}
                                  className="w-full object-contain max-h-48"
                                />
                              </div>
                              <div className="p-2 space-y-1.5">
                                {displayCaption && (
                                  <p className="text-xs text-gray-500 leading-tight">{displayCaption}</p>
                                )}
                                {s.comment && (
                                  <div className="bg-blue-50 border border-blue-100 rounded px-2 py-1.5">
                                    <p className="text-xs text-blue-700 font-medium mb-0.5">고객 코멘트</p>
                                    <p className="text-xs text-blue-600 leading-tight">{s.comment}</p>
                                  </div>
                                )}
                                {s.comment && (
                                  <button
                                    onClick={() => applyCommentAsCaption(s.photo_id, s.comment!)}
                                    disabled={applyingCaption === s.photo_id || isApplied}
                                    className={`w-full text-xs px-2 py-1 rounded border transition-colors ${
                                      isApplied
                                        ? 'border-green-300 bg-green-50 text-green-600 cursor-default'
                                        : applyingCaption === s.photo_id
                                          ? 'border-gray-200 text-gray-400 cursor-wait'
                                          : 'border-gray-300 hover:bg-gray-100 text-gray-500'
                                    }`}
                                  >
                                    {applyingCaption === s.photo_id ? '반영 중...'
                                      : isApplied ? '✓ 반영됨'
                                      : '캡션으로 반영'}
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}