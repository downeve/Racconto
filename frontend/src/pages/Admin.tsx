import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Search, Trash2, X, Pencil } from 'lucide-react'

const API = import.meta.env.VITE_API_URL

interface User {
  id: string
  email: string
  is_verified: boolean
  project_limit: number
  photo_limit: number
  created_at: string
  project_count: number
  photo_count: number
}

interface Stats {
  total_users: number
  verified_users: number
  total_projects: number
  total_photos: number
  total_notes: number
}

interface ExternalStatsData {
  cloudflare?: { current: number; limit: number }
  linode?: {
    status: string
    label: string
    ipv4: string
    specs?: { disk: number; memory: number }
    cpu_usage: number
    net_out: number
  }
}

interface OrphanResult {
  orphan_ids: string[]
  count: number
  scanned_cf: number
  scanned_db: number
}

interface PanelValues {
  photo_limit: number
  project_limit: number
  is_verified: boolean
}

const PRESETS = [
  { label: 'Open Beta',     photo_limit: 1000,   project_limit: 3  },
  { label: 'Basic', photo_limit: 5000,  project_limit: 15 },
  { label: 'Pro',      photo_limit: 20000, project_limit: 50 },
]

// ─── OrphanSection (unchanged) ───────────────────────────────────────────────
const OrphanSection = () => {
  const [result, setResult] = useState<OrphanResult | null>(null)
  const [scanLoading, setScanLoading] = useState(false)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null)

  const showToast = (message: string, ok: boolean) => {
    setToast({ message, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const handleScan = async () => {
    setScanLoading(true)
    setResult(null)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${API}/admin/orphan-images/scan`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setResult(res.data)
    } catch {
      showToast('Scan failed.', false)
    } finally {
      setScanLoading(false)
    }
  }

  const handleCleanup = async () => {
    if (!result || result.count === 0) return
    if (!confirm(`Delete ${result.count} orphan image(s) from Cloudflare? This cannot be undone.`)) return
    setCleanupLoading(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${API}/admin/orphan-images/cleanup`,
        { image_ids: result.orphan_ids },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      showToast(`Queued deletion of ${result.count} orphan image(s).`, true)
      setResult(null)
    } catch {
      showToast('Cleanup failed.', false)
    } finally {
      setCleanupLoading(false)
    }
  }

  return (
    <div className="mb-8">
      <h2 className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-3">Orphan Images</h2>
      <div className="bg-white rounded-card shadow p-5 max-w-xl">
        <p className="text-xs text-gray-500 mb-4">
          CF에 존재하지만 DB에 없는 이미지(업로드 24시간 경과)를 검사하고 삭제합니다.
        </p>
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleScan}
            disabled={scanLoading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs bg-black text-white rounded hover:bg-gray-800 disabled:opacity-40"
          >
            {scanLoading ? (
              <>
                <svg className="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Scanning...
              </>
            ) : <><Search size={14} strokeWidth={1.5} /> 고아 이미지 검사</>}
          </button>
          {result && result.count > 0 && (
            <button
              onClick={handleCleanup}
              disabled={cleanupLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-40"
            >
              {cleanupLoading ? (
                <>
                  <svg className="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Deleting...
                </>
              ) : <><Trash2 size={14} strokeWidth={1.5} /> 고아 이미지 일괄 삭제 ({result.count}개)</>}
            </button>
          )}
        </div>
        {result && (
          <div className="text-xs text-gray-600 space-y-1 border-t pt-3">
            <p>CF 전체: <span className="font-mono font-medium">{result.scanned_cf}</span>장 &nbsp;|&nbsp; DB 등록: <span className="font-mono font-medium">{result.scanned_db}</span>장</p>
            <p>
              고아 이미지:{' '}
              <span className={`font-mono font-bold ${result.count > 0 ? 'text-red-500' : 'text-green-600'}`}>
                {result.count}개
              </span>
              {result.count === 0 && ' — 정상'}
            </p>
          </div>
        )}
        {toast && (
          <p className={`text-xs mt-3 ${toast.ok ? 'text-green-600' : 'text-red-500'}`}>
            {toast.ok ? '✓' : '✗'} {toast.message}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── ExternalStatsSection (unchanged) ────────────────────────────────────────
const ExternalStatsSection = () => {
  const [data, setData] = useState<ExternalStatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get(`${API}/admin/external-stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setData(res.data)
      } catch (err) {
        console.error('통계 조회 실패', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) return <div className="p-4 animate-pulse text-gray-400">외부 통계 데이터를 불러오는 중...</div>
  if (!data) return <div className="p-4 border">데이터가 비어있음: {JSON.stringify(data)}</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
      <div className="bg-white p-6 rounded-card shadow border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase">Cloudflare Images</h3>
          <span className="bg-orange-100 text-orange-600 text-xs px-2 py-1 rounded">Images v1</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">현재 이미지 수</span>
            <span className="font-bold">{data.cloudflare?.current?.toLocaleString()}</span>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-card overflow-hidden">
            <div
              className="bg-orange-400 h-full"
              style={{ width: `${(data.cloudflare?.current ?? 0 / (data.cloudflare?.limit || 1)) * 100}%` }}
            />
          </div>
          <p className="text-xs text-right text-gray-400">한도: {data.cloudflare?.limit?.toLocaleString()}</p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-card shadow border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase">Linode Server</h3>
          <span className={`text-xs px-2 py-1 rounded ${data.linode?.status === 'running' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
            {data.linode?.status?.toUpperCase()}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400">서버명</p>
            <p className="font-medium text-gray-700">{data.linode?.label}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">IP 주소</p>
            <p className="font-medium text-gray-700">{data.linode?.ipv4}</p>
          </div>
          <div className="col-span-2 pt-2 border-t">
            <p className="text-xs text-gray-400">사양 (Storage / RAM)</p>
            <p className="font-medium text-gray-700">
              {data.linode?.specs?.disk ?? 0 / 1024}GB / {data.linode?.specs?.memory ?? 0 / 1024}GB
            </p>
          </div>
          <div className="col-span-2 pt-2 border-t mt-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">CPU 사용량</p>
                <p className="font-medium text-blue-600">{data.linode?.cpu_usage}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">네트워크 Out</p>
                <p className="font-medium text-blue-600">{data.linode?.net_out} Mbps</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── UsageBar ─────────────────────────────────────────────────────────────────
function UsageBar({ value, limit }: { value: number; limit: number }) {
  const pct = limit > 0 ? Math.min((value / limit) * 100, 100) : 0
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-400' : 'bg-stone-300'
  return (
    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-1">
      <div className={`h-full ${color} transition-all duration-200`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ─── UserEditPanel ────────────────────────────────────────────────────────────
interface UserEditPanelProps {
  user: User | null
  values: PanelValues
  onChange: (v: PanelValues) => void
  saving: boolean
  deleting: boolean
  showDeleteConfirm: boolean
  onShowDeleteConfirm: (v: boolean) => void
  onSave: () => void
  onDelete: () => void
  onClose: () => void
  panelRef: React.RefObject<HTMLDivElement | null>
}

function UserEditPanel({
  user, values, onChange, saving, deleting,
  showDeleteConfirm, onShowDeleteConfirm, onSave, onDelete, onClose, panelRef,
}: UserEditPanelProps) {
  const activePreset = PRESETS.find(
    p => p.photo_limit === values.photo_limit && p.project_limit === values.project_limit
  )
  const photoPct  = values.photo_limit   > 0 ? Math.round((user?.photo_count   ?? 0) / values.photo_limit   * 100) : 0
  const projectPct = values.project_limit > 0 ? Math.round((user?.project_count ?? 0) / values.project_limit * 100) : 0

  return (
    <div
      ref={panelRef}
      className={`fixed right-0 top-0 bottom-0 w-80 bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col transition-transform duration-200 ${user ? 'translate-x-0' : 'translate-x-full'}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-medium text-stone-800 truncate">{user?.email}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            가입일: {user ? new Date(user.created_at).toLocaleDateString('ko-KR') : ''}
          </p>
        </div>
        <button onClick={onClose} className="ml-3 shrink-0 text-gray-400 hover:text-black transition-colors">
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Presets */}
        <div>
          <p className="text-xs text-gray-400 mb-2">프리셋</p>
          <div className="flex gap-2">
            {PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => onChange({ ...values, photo_limit: preset.photo_limit, project_limit: preset.project_limit })}
                className={`flex-1 text-xs py-1.5 rounded border transition-colors ${
                  activePreset?.label === preset.label
                    ? 'bg-stone-800 text-white border-stone-800'
                    : 'border-gray-200 hover:border-stone-400 text-stone-600'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t" />

        {/* Photo Limit */}
        <div>
          <p className="text-xs font-medium text-stone-700 mb-2">Photo Limit</p>
          <div className="flex items-center gap-2 mb-1.5">
            <input
              type="range"
              min={0} max={2000} step={50}
              value={values.photo_limit}
              onChange={e => onChange({ ...values, photo_limit: Number(e.target.value) })}
              className="flex-1 accent-stone-700"
            />
            <input
              type="number"
              min={0} max={2000}
              value={values.photo_limit}
              onChange={e => onChange({ ...values, photo_limit: Number(e.target.value) })}
              className="w-16 border rounded px-2 py-1 text-xs text-right outline-none focus:border-stone-400"
            />
          </div>
          <p className="text-xs text-gray-500">현재 사용량: {user?.photo_count ?? 0}장 ({photoPct}%)</p>
          <UsageBar value={user?.photo_count ?? 0} limit={values.photo_limit} />
        </div>

        <div className="border-t" />

        {/* Project Limit */}
        <div>
          <p className="text-xs font-medium text-stone-700 mb-2">Project Limit</p>
          <div className="flex items-center gap-2 mb-1.5">
            <input
              type="range"
              min={0} max={50} step={1}
              value={values.project_limit}
              onChange={e => onChange({ ...values, project_limit: Number(e.target.value) })}
              className="flex-1 accent-stone-700"
            />
            <input
              type="number"
              min={0} max={50}
              value={values.project_limit}
              onChange={e => onChange({ ...values, project_limit: Number(e.target.value) })}
              className="w-16 border rounded px-2 py-1 text-xs text-right outline-none focus:border-stone-400"
            />
          </div>
          <p className="text-xs text-gray-500">현재 사용량: {user?.project_count ?? 0}개 ({projectPct}%)</p>
          <UsageBar value={user?.project_count ?? 0} limit={values.project_limit} />
        </div>

        <div className="border-t" />

        {/* Verified */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={values.is_verified}
            onChange={e => onChange({ ...values, is_verified: e.target.checked })}
            className="w-4 h-4 accent-stone-700"
          />
          <span className="text-sm text-stone-700">Verified</span>
        </label>

        <div className="border-t" />

        {/* Save */}
        <button
          onClick={onSave}
          disabled={saving}
          className="w-full py-2 text-sm bg-stone-800 text-white rounded hover:bg-stone-900 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        <div className="border-t" />

        {/* Delete */}
        {!showDeleteConfirm ? (
          <button
            onClick={() => onShowDeleteConfirm(true)}
            className="w-full py-2 text-sm text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors"
          >
            Delete Account...
          </button>
        ) : (
          <div className="border border-red-200 rounded p-4 space-y-3">
            <p className="text-sm font-medium text-stone-800">정말 삭제할까요?</p>
            <p className="text-xs text-gray-500">이 작업은 되돌릴 수 없습니다.</p>
            <div className="flex gap-2">
              <button
                onClick={() => onShowDeleteConfirm(false)}
                className="flex-1 py-1.5 text-xs border rounded hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={onDelete}
                disabled={deleting}
                className="flex-1 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-40 transition-colors"
              >
                {deleting ? '삭제 중...' : '삭제 확인'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Admin ────────────────────────────────────────────────────────────────────
export default function Admin() {
  const [users, setUsers]           = useState<User[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [searchEmail, setSearchEmail] = useState('')
  const [sortOrder, setSortOrder]   = useState<'asc' | 'desc'>('asc')
  const [stats, setStats]           = useState<Stats | null>(null)
  const [showNotify, setShowNotify] = useState(false)
  const [notifySubject, setNotifySubject]       = useState('')
  const [notifyContent, setNotifyContent]       = useState('')
  const [notifyVerifiedOnly, setNotifyVerifiedOnly] = useState(true)
  const [notifying, setNotifying]   = useState(false)
  const [notifyResult, setNotifyResult] = useState<string | null>(null)

  // Panel
  const [selectedUser, setSelectedUser]         = useState<User | null>(null)
  const [panelValues, setPanelValues]           = useState<PanelValues>({ photo_limit: 0, project_limit: 0, is_verified: false })
  const [panelSaving, setPanelSaving]           = useState(false)
  const [panelDeleting, setPanelDeleting]       = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Bulk
  const [selectedIds, setSelectedIds]           = useState<Set<string>>(new Set())
  const [bulkPhotoLimit, setBulkPhotoLimit]     = useState('')
  const [bulkProjectLimit, setBulkProjectLimit] = useState('')
  const [bulkApplying, setBulkApplying]         = useState(false)

  const panelRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Close panel on outside click (skip if clicking an edit button)
  useEffect(() => {
    if (!selectedUser) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-edit-btn]')) return
      if (panelRef.current && !panelRef.current.contains(target)) {
        setSelectedUser(null)
        setShowDeleteConfirm(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [selectedUser])

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/admin/users`)
      setUsers(res.data)
    } catch (e: any) {
      if (e.response?.status === 403) navigate('/projects')
      setError('Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    const res = await axios.get(`${API}/admin/stats`)
    setStats(res.data)
  }

  useEffect(() => {
    fetchUsers()
    fetchStats()
  }, [])

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setPanelValues({ photo_limit: user.photo_limit, project_limit: user.project_limit, is_verified: user.is_verified })
    setShowDeleteConfirm(false)
  }

  const handlePanelSave = async () => {
    if (!selectedUser) return
    setPanelSaving(true)
    try {
      await axios.put(`${API}/admin/users/${selectedUser.id}`, panelValues)
      await fetchUsers()
      setSelectedUser(null)
    } finally {
      setPanelSaving(false)
    }
  }

  const handlePanelDelete = async () => {
    if (!selectedUser) return
    setPanelDeleting(true)
    try {
      await axios.delete(`${API}/admin/users/${selectedUser.id}`)
      await fetchUsers()
      setSelectedUser(null)
      setShowDeleteConfirm(false)
    } finally {
      setPanelDeleting(false)
    }
  }

  const handleBulkApply = async (overrideValues?: { photo_limit?: number; project_limit?: number }) => {
    const payload: Record<string, number> = {}
    if (overrideValues) {
      if (overrideValues.photo_limit   !== undefined) payload.photo_limit   = overrideValues.photo_limit
      if (overrideValues.project_limit !== undefined) payload.project_limit = overrideValues.project_limit
    } else {
      if (bulkPhotoLimit   !== '') payload.photo_limit   = Number(bulkPhotoLimit)
      if (bulkProjectLimit !== '') payload.project_limit = Number(bulkProjectLimit)
    }
    if (Object.keys(payload).length === 0) return
    setBulkApplying(true)
    try {
      await Promise.all([...selectedIds].map(id => axios.put(`${API}/admin/users/${id}`, payload)))
      await fetchUsers()
      setSelectedIds(new Set())
      setBulkPhotoLimit('')
      setBulkProjectLimit('')
    } finally {
      setBulkApplying(false)
    }
  }

  const handleNotify = async () => {
    if (!notifySubject.trim() || !notifyContent.trim()) return
    const recipientCount = notifyVerifiedOnly
      ? users.filter(u => u.is_verified).length
      : users.length
    if (!confirm(`Send to ${recipientCount} users?`)) return
    setNotifying(true)
    setNotifyResult(null)
    try {
      const res = await axios.post(`${API}/admin/notify`, {
        subject: notifySubject,
        content: notifyContent,
        verified_only: notifyVerifiedOnly,
      })
      setNotifyResult(`✓ Queued for ${res.data.recipients} recipients`)
      setNotifySubject('')
      setNotifyContent('')
    } catch {
      setNotifyResult('✗ Failed to send notice')
    } finally {
      setNotifying(false)
    }
  }

  const filteredUsers = users
    .filter(u => u.email.toLowerCase().includes(searchEmail.toLowerCase()))
    .sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return sortOrder === 'asc' ? diff : -diff
    })

  const allSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.has(u.id))

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredUsers.map(u => u.id)))
    }
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (loading) return <div className="p-8 text-sm text-gray-500">Loading...</div>
  if (error)   return <div className="p-8 text-sm text-red-500">{error}</div>

  return (
    <div
      className="max-w-5xl mx-auto px-6 py-8 transition-[padding] duration-200"
      style={{ paddingRight: selectedUser ? '344px' : '24px' }}
    >
      <h1 className="text-xl font-bold tracking-widest mb-6">Admin — Users</h1>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Users', value: stats.total_users },
            { label: 'Verified',    value: stats.verified_users },
            { label: 'Projects',    value: stats.total_projects },
            { label: 'Photos (DB)', value: stats.total_photos },
            { label: 'Notes',       value: stats.total_notes },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-card shadow p-4 text-center">
              <p className="text-2xl font-bold text-stone-800">{stat.value.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      <ExternalStatsSection />
      <OrphanSection />

      {/* Infrastructure Costs */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-3">Infrastructure Costs</h2>
        <div className="bg-white rounded-card shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-400 text-xs">
                <th className="px-4 py-2.5 font-medium">Service</th>
                <th className="px-4 py-2.5 font-medium">Plan</th>
                <th className="px-4 py-2.5 font-medium">Cost</th>
                <th className="px-4 py-2.5 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {[
                { service: 'Linode',            plan: 'Nanode 1GB',  cost: '$5.50 / mo',   note: '유저 확대 시 플랜 업그레이드 예정' },
                { service: 'Cloudflare Images', plan: 'Images Basic', cost: '$5.50 / mo',  note: '유저 확대 시 플랜 업그레이드 예정' },
                { service: 'Brevo',             plan: 'Free',         cost: '—',            note: '서비스 확대 시 AWS SES 이전 검토 예정' },
                { service: 'racconto.app',       plan: 'Domain',       cost: '$14.20 / yr', note: `≈ $${(14.20 / 12).toFixed(2)} / mo` },
                { service: 'Claude AI 구독',    plan: 'Pro 요금제',   cost: '$22 / mo',    note: '향후 클로드 코드 사용 검토 / 연간 구독 검토 ($19/mo)' },
              ].map((row, i, arr) => (
                <tr key={row.service} className={i < arr.length - 1 ? 'border-b' : ''}>
                  <td className="px-4 py-3 font-medium text-stone-800">{row.service}</td>
                  <td className="px-4 py-3 text-gray-500">{row.plan}</td>
                  <td className="px-4 py-3 font-mono text-stone-700">{row.cost}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{row.note}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 border-t">
                <td className="px-4 py-2.5 text-xs font-semibold text-gray-500" colSpan={2}>Monthly Total (approx.)</td>
                <td className="px-4 py-2.5 font-mono text-sm font-bold text-stone-800">
                  ${(5.50 + 5.50 + 14.20 / 12 + 22).toFixed(2)} / mo
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-400">도메인 월할 포함</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Send Notice */}
      <div className="mb-8">
        {!showNotify ? (
          <button
            onClick={() => setShowNotify(true)}
            className="text-xs px-3 py-1.5 border rounded hover:bg-gray-50"
          >
            📢 Send Notice
          </button>
        ) : (
          <div className="bg-white rounded-card shadow p-5 max-w-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">📢 Send Notice to Users</h2>
              <button
                onClick={() => { setShowNotify(false); setNotifyResult(null) }}
                className="text-gray-400 hover:text-black text-lg"
              >✕</button>
            </div>
            <input
              type="text"
              placeholder="Subject"
              value={notifySubject}
              onChange={e => setNotifySubject(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm mb-3 outline-none focus:border-black"
            />
            <textarea
              placeholder="Content (line breaks supported)"
              value={notifyContent}
              onChange={e => setNotifyContent(e.target.value)}
              rows={5}
              className="w-full border rounded px-3 py-2 text-sm mb-3 outline-none focus:border-black resize-none"
            />
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="verifiedOnly"
                checked={notifyVerifiedOnly}
                onChange={e => setNotifyVerifiedOnly(e.target.checked)}
              />
              <label htmlFor="verifiedOnly" className="text-xs text-gray-600">
                Verified users only ({users.filter(u => u.is_verified).length} users)
              </label>
            </div>
            {notifyResult && (
              <p className={`text-xs mb-3 ${notifyResult.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                {notifyResult}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleNotify}
                disabled={notifying || !notifySubject.trim() || !notifyContent.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs bg-black text-white rounded hover:bg-gray-800 disabled:opacity-40"
              >
                {notifying ? (
                  <>
                    <svg className="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Sending...
                  </>
                ) : 'Send'}
              </button>
              <button
                onClick={() => { setShowNotify(false); setNotifyResult(null) }}
                className="px-4 py-2 text-xs border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 회원 관리 ── */}
      <div>
        {/* Bulk bar */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-4 px-4 py-3 bg-stone-100 rounded-lg text-xs">
            <span className="font-medium text-stone-700">{selectedIds.size}명 선택됨</span>
            <span className="text-gray-300">|</span>

            {/* Preset 즉시 적용 */}
            <div className="flex gap-1">
              {PRESETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => handleBulkApply({ photo_limit: preset.photo_limit, project_limit: preset.project_limit })}
                  disabled={bulkApplying}
                  className="px-2.5 py-1 rounded border border-gray-300 hover:border-stone-500 hover:bg-white text-stone-600 disabled:opacity-40 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <span className="text-gray-300">|</span>
            <span className="text-gray-500">직접 입력:</span>

            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Photo</span>
              <input
                type="number"
                placeholder="—"
                value={bulkPhotoLimit}
                onChange={e => setBulkPhotoLimit(e.target.value)}
                className="w-16 border rounded px-2 py-1 text-xs outline-none focus:border-stone-400"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Project</span>
              <input
                type="number"
                placeholder="—"
                value={bulkProjectLimit}
                onChange={e => setBulkProjectLimit(e.target.value)}
                className="w-16 border rounded px-2 py-1 text-xs outline-none focus:border-stone-400"
              />
            </div>
            <button
              onClick={() => handleBulkApply()}
              disabled={bulkApplying || (bulkPhotoLimit === '' && bulkProjectLimit === '')}
              className="px-3 py-1 bg-stone-800 text-white rounded hover:bg-stone-900 disabled:opacity-40 transition-colors"
            >
              {bulkApplying ? '적용 중...' : '적용'}
            </button>

            <span className="text-gray-300">|</span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-gray-500 hover:text-stone-800 transition-colors"
            >
              선택 해제
            </button>
          </div>
        )}

        {/* Search + Sort */}
        <div className="flex items-center gap-4 mb-4">
          <input
            type="text"
            placeholder="Search by email..."
            value={searchEmail}
            onChange={e => setSearchEmail(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm outline-none focus:border-black w-64"
          />
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1 text-xs border rounded px-3 py-1.5 hover:bg-gray-50"
          >
            Joined {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
          <span className="text-xs text-gray-400 ml-auto">{filteredUsers.length} users</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-3 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="accent-stone-700"
                  />
                </th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Verified</th>
                <th className="py-2 pr-4">Usage</th>
                <th className="py-2 pr-4">Joined</th>
                <th className="py-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr
                  key={user.id}
                  className={`border-b hover:bg-gray-50 ${selectedUser?.id === user.id ? 'bg-stone-50' : ''}`}
                >
                  <td className="py-3 pr-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(user.id)}
                      onChange={() => toggleSelectOne(user.id)}
                      className="accent-stone-700"
                    />
                  </td>
                  <td className="py-3 pr-4 font-medium">{user.email}</td>
                  <td className="py-3 pr-4">
                    <span className={user.is_verified ? 'text-green-600' : 'text-red-400'}>
                      {user.is_verified ? '✓' : '✗'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-xs text-gray-500 whitespace-nowrap">
                    프로젝트 {user.project_count} / {user.project_limit}
                    &nbsp;·&nbsp;
                    사진 {user.photo_count} / {user.photo_limit}
                  </td>
                  <td className="py-3 pr-4 text-xs text-gray-400">
                    {new Date(user.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="py-3">
                    <button
                      data-edit-btn
                      onClick={() => handleEditUser(user)}
                      className="p-1.5 rounded hover:bg-stone-200 text-gray-400 hover:text-stone-700 transition-colors"
                    >
                      <Pencil size={13} strokeWidth={1.5} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Panel */}
      <UserEditPanel
        user={selectedUser}
        values={panelValues}
        onChange={setPanelValues}
        saving={panelSaving}
        deleting={panelDeleting}
        showDeleteConfirm={showDeleteConfirm}
        onShowDeleteConfirm={setShowDeleteConfirm}
        onSave={handlePanelSave}
        onDelete={handlePanelDelete}
        onClose={() => { setSelectedUser(null); setShowDeleteConfirm(false) }}
        panelRef={panelRef}
      />
    </div>
  )
}
