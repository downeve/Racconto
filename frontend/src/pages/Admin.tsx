import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

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
      <div className="bg-white rounded-lg shadow p-5 max-w-xl">
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
            ) : '🔍 고아 이미지 검사'}
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
              ) : `🗑 고아 이미지 일괄 삭제 (${result.count}개)`}
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

const ExternalStatsSection = () => {
    const [data, setData] = useState<ExternalStatsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
          try {
              // 💡 1. 로컬호스트 하드코딩 제거하고 API 환경변수 사용
              // 💡 2. 관리자 인증을 위해 Authorization 헤더에 토큰 추가
              const token = localStorage.getItem('token');
              const res = await axios.get(`${API}/admin/external-stats`, {
                  headers: { Authorization: `Bearer ${token}` }
              });
              setData(res.data);
            } catch (err) {
                console.error("통계 조회 실패", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="p-4 animate-pulse text-gray-400">외부 통계 데이터를 불러오는 중...</div>;
    if (!data) return <div className="p-4 border">데이터가 비어있음: {JSON.stringify(data)}</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
            {/* Cloudflare Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase">Cloudflare Images</h3>
                    <span className="bg-orange-100 text-orange-600 text-xs px-2 py-1 rounded">Images v1</span>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-gray-600">현재 이미지 수</span>
                        <span className="font-bold">{data.cloudflare?.current?.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div 
                            className="bg-orange-400 h-full" 
                            style={{ width: `${(data.cloudflare?.current ?? 0 / (data.cloudflare?.limit || 1)) * 100}%` }}
                        />
                    </div>
                    <p className="text-xs text-right text-gray-400">한도: {data.cloudflare?.limit?.toLocaleString()}</p>
                </div>
            </div>

            {/* Linode Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
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
                    {/* [수정 2] 새롭게 추가된 CPU / Network 통계 UI */}
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
    );
};

export default function Admin() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<User>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchEmail, setSearchEmail] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [stats, setStats] = useState<Stats | null>(null)
  const [showNotify, setShowNotify] = useState(false)
  const [notifySubject, setNotifySubject] = useState('')
  const [notifyContent, setNotifyContent] = useState('')
  const [notifyVerifiedOnly, setNotifyVerifiedOnly] = useState(true)
  const [notifying, setNotifying] = useState(false)
  const [notifyResult, setNotifyResult] = useState<string | null>(null)

  const navigate = useNavigate()

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/admin/users`)
      setUsers(res.data)
    } catch (e: any) {
      if (e.response?.status === 403) {
        navigate('/projects')
      }
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

  const handleEdit = (user: User) => {
    setEditingId(user.id)
    setEditValues({
      project_limit: user.project_limit,
      photo_limit: user.photo_limit,
      is_verified: user.is_verified,
    })
  }

  const handleSave = async (userId: string) => {
    try {
      await axios.put(`${API}/admin/users/${userId}`, editValues)
      setEditingId(null)
      fetchUsers()
    } catch {
      alert('Failed to update user.')
    }
  }

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Delete ${email}? This cannot be undone.`)) return
    setDeletingId(userId)
    try {
      await axios.delete(`${API}/admin/users/${userId}`)
      fetchUsers()
    } catch {
      alert('Failed to delete user.')
    } finally {
      setDeletingId(null)
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

  if (loading) return <div className="p-8 text-sm text-gray-500">Loading...</div>
  if (error) return <div className="p-8 text-sm text-red-500">{error}</div>

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold tracking-widest mb-6">Admin — Users</h1>
      {/* 회원 사용량 통계 UI */}
      {stats && (
        <div className="grid grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Users', value: stats.total_users },
            { label: 'Verified', value: stats.verified_users },
            { label: 'Projects', value: stats.total_projects },
            { label: 'Photos (DB)', value: stats.total_photos },
            { label: 'Notes', value: stats.total_notes },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-stone-800">{stat.value.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* 외부 사용량 통계 UI*/}
      <ExternalStatsSection />

      {/* 고아 이미지 관리 */}
      <OrphanSection />

      {/* 인프라 비용 현황 */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-3">Infrastructure Costs</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                {
                  service: 'Linode',
                  plan: 'Nanode 1GB',
                  cost: '$5.50 / mo',
                  note: '유저 확대 시 플랜 업그레이드 예정',
                },
                {
                  service: 'Cloudflare Images',
                  plan: 'Images Basic',
                  cost: '$5.50 / mo',
                  note: '유저 확대 시 플랜 업그레이드 예정',
                },
                {
                  service: 'Brevo',
                  plan: 'Free',
                  cost: '—',
                  note: '서비스 확대 시 AWS SES 이전 검토 예정',
                },
                {
                  service: 'racconto.app',
                  plan: 'Domain',
                  cost: '$14.20 / yr',
                  note: `≈ $${(14.20 / 12).toFixed(2)} / mo`,
                },
                                {
                  service: 'Claude AI 구독',
                  plan: 'Pro 요금제',
                  cost: '$22 / mo',
                  note: `향후 클로드 코드 사용 검토 / 연간 구독 검토 ($19/mo)`,
                },
              ].map((row, i, arr) => (
                <tr key={row.service} className={i < arr.length - 1 ? 'border-b' : ''}>
                  <td className="px-4 py-3 font-medium text-stone-800">{row.service}</td>
                  <td className="px-4 py-3 text-gray-500">{row.plan}</td>
                  <td className="px-4 py-3 font-mono text-stone-700">{row.cost}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{row.note}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 border-t">
                <td className="px-4 py-2.5 text-xs font-semibold text-gray-500" colSpan={2}>
                  Monthly Total (approx.)
                </td>
                <td className="px-4 py-2.5 font-mono text-sm font-bold text-stone-800">
                  ${(5.50 + 5.50 + 14.20 / 12 + 22).toFixed(2)} / mo
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-400">도메인 월할 포함</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 전체 공지 발송 UI */}
      <div className="mb-8">
        {!showNotify ? (
          <button
            onClick={() => setShowNotify(true)}
            className="text-xs px-3 py-1.5 border rounded hover:bg-gray-50"
          >
            📢 Send Notice
          </button>
        ) : (
          <div className="bg-white rounded-lg shadow p-5 max-w-xl">
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
      
      {/*회원 관리 UI*/}
      <div className="overflow-x-auto">
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
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Verified</th>
              <th className="py-2 pr-4">Projects</th>
              <th className="py-2 pr-4">Project Limit</th>
              <th className="py-2 pr-4">Photos</th>
              <th className="py-2 pr-4">Photo Limit</th>
              <th className="py-2 pr-4">Joined</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="py-3 pr-4 font-medium">{user.email}</td>
                <td className="py-3 pr-4">
                  {editingId === user.id ? (
                    <input
                      type="checkbox"
                      checked={editValues.is_verified}
                      onChange={e => setEditValues({ ...editValues, is_verified: e.target.checked })}
                    />
                  ) : (
                    <span className={user.is_verified ? 'text-green-600' : 'text-red-500'}>
                      {user.is_verified ? '✓' : '✗'}
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4 text-gray-500">{user.project_count}</td>
                <td className="py-3 pr-4">
                  {editingId === user.id ? (
                    <input
                      type="number"
                      className="w-16 border rounded px-2 py-1 text-sm"
                      value={editValues.project_limit}
                      onChange={e => setEditValues({ ...editValues, project_limit: Number(e.target.value) })}
                    />
                  ) : (
                    user.project_limit
                  )}
                </td>
                <td className="py-3 pr-4 text-gray-500">{user.photo_count}</td>
                <td className="py-3 pr-4">
                  {editingId === user.id ? (
                    <input
                      type="number"
                      className="w-20 border rounded px-2 py-1 text-sm"
                      value={editValues.photo_limit}
                      onChange={e => setEditValues({ ...editValues, photo_limit: Number(e.target.value) })}
                    />
                  ) : (
                    user.photo_limit
                  )}
                </td>
                <td className="py-3 pr-4 text-gray-400 text-xs">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="py-3">
                  <div className="flex gap-2">
                    {editingId === user.id ? (
                      <>
                        <button
                          onClick={() => handleSave(user.id)}
                          className="text-xs px-2 py-1 bg-black text-white rounded hover:bg-gray-800"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user.id, user.email)}
                          disabled={deletingId === user.id}
                          className="text-xs px-2 py-1 border border-red-300 text-red-500 rounded hover:bg-red-50 disabled:opacity-40 flex items-center gap-1"
                        >
                          {deletingId === user.id ? (
                            <>
                              <svg className="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                              </svg>
                              Deleting
                            </>
                          ) : 'Delete'}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
