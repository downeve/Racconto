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

export default function Admin() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<User>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)
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

  useEffect(() => {
    fetchUsers()
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

  if (loading) return <div className="p-8 text-sm text-gray-500">Loading...</div>
  if (error) return <div className="p-8 text-sm text-red-500">{error}</div>

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold tracking-widest mb-6">Admin — Users</h1>
      <div className="overflow-x-auto">
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
            {users.map(user => (
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
