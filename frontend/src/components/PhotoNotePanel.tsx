import { useEffect, useState } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import { useTranslation } from 'react-i18next'

const API = import.meta.env.VITE_API_URL

interface Note {
  id: string
  content: string
  note_type: string
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export default function PhotoNotePanel({
  photoId,
  projectId,
  onClose,
}: {
  photoId: string
  projectId: string
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const [notes, setNotes] = useState<Note[]>([])
  const [newContent, setNewContent] = useState('')
  const [newType, setNewType] = useState('memo')
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editType, setEditType] = useState('memo')

  const NOTE_TYPES = [
    { value: 'memo',     label: t('note.labelWork'), color: 'bg-stone-100 text-stone-600' },
    { value: 'concept',  label: t('note.labelConcept'), color: 'bg-blue-50 text-blue-600' },
    { value: 'research', label: t('note.labelResearch'), color: 'bg-green-50 text-green-600' },
    { value: 'client',   label: t('note.labelClient'), color: 'bg-amber-50 text-amber-600' },
  ]

  const getNoteType = (value: string) => {
    return NOTE_TYPES.find(t => t.value === value) || NOTE_TYPES[0]
  }

  const fetchNotes = async () => {
    const res = await axios.get(`${API}/notes/?project_id=${projectId}`)
    // 해당 사진에 연결된 노트만 필터링
    setNotes(res.data.filter((n: any) => n.photo_id === photoId))
  }

  useEffect(() => {
    fetchNotes()
  }, [photoId])

  const handleAdd = async () => {
    if (!newContent.trim()) return
    await axios.post(`${API}/notes/`, {
      project_id: projectId,
      content: newContent,
      note_type: newType,
      photo_id: photoId,
    })
    setNewContent('')
    setNewType('memo')
    fetchNotes()
  }

  const handleUpdate = async (noteId: string) => {
    if (!editContent.trim()) return
    await axios.put(`${API}/notes/${noteId}`, {
      content: editContent,
      note_type: editType,
      photo_id: photoId,
    })
    setEditingNote(null)
    fetchNotes()
  }

  const handleDelete = async (noteId: string) => {
    if (!confirm(t('note.deleteConfirm'))) return
    await axios.delete(`${API}/notes/${noteId}`)
    fetchNotes()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-sm font-semibold text-stone-800">📝 {t('note.title')}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-black text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* 노트 목록 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {notes.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">
              {t('note.noPhotoNote')}
            </p>
          ) : (
            notes.map(note => {
              const typeInfo = getNoteType(note.note_type)
              return (
                <div key={note.id} className="bg-stone-50 rounded-lg p-3">
                  {editingNote === note.id ? (
                    <div>
                      <div className="flex gap-1.5 flex-wrap mb-2">
                        {NOTE_TYPES.map(type => (
                          <button
                            key={type.value}
                            onClick={() => setEditType(type.value)}
                            className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                              editType === type.value
                                ? type.color + ' font-semibold ring-1 ring-current'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                      <textarea
                        className="w-full border rounded px-2 py-1.5 text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-black resize-none"
                        rows={3}
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(note.id)}
                          className="px-3 py-1 text-xs bg-stone-700 text-white rounded hover:bg-stone-800"
                        >
                          {t('common.save')}
                        </button>
                        <button
                          onClick={() => setEditingNote(null)}
                          className="px-3 py-1 text-xs border rounded hover:bg-gray-50"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-300">
                            {new Date(note.updated_at).toLocaleDateString(
                              i18n.language?.startsWith('ko') ? 'ko-KR' : 'en-US'
                            )}
                          </span>
                          <button
                            onClick={() => { setEditingNote(note.id); setEditContent(note.content); setEditType(note.note_type) }}
                            className="text-xs text-gray-400 hover:text-black"
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="text-xs text-red-400 hover:text-red-600"
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      </div>
                      <div className="prose prose-xs max-w-none text-gray-700">
                        <ReactMarkdown>{note.content}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* 새 노트 작성 */}
        <div className="border-t px-5 py-4">
          <div className="flex gap-1.5 flex-wrap mb-2">
            {NOTE_TYPES.map(type => (
              <button
                key={type.value}
                onClick={() => setNewType(type.value)}
                className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                  newType === type.value
                    ? type.color + ' font-semibold ring-1 ring-current'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
          <textarea
            className="w-full border rounded px-3 py-2 text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-black resize-none"
            placeholder={t('note.editMdDescription2')}
            rows={3}
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
          />
          <div className="flex justify-end">
            <button
              onClick={handleAdd}
              disabled={!newContent.trim()}
              className="px-4 py-1.5 text-xs bg-stone-700 text-white rounded hover:bg-stone-800 disabled:opacity-40"
            >
              {t('note.addNote')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}