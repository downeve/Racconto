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
    try {
      await axios.delete(`${API}/admin/users/${userId}`)
      fetchUsers()
    } catch {
      alert('Failed to delete user.')
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
            { label: 'Photos (CF)', value: stats.total_photos },
            { label: 'Notes', value: stats.total_notes },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-stone-800">{stat.value.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
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
