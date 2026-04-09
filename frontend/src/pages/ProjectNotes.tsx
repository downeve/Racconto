import { useEffect, useState } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import { useTranslation } from 'react-i18next'

const API = import.meta.env.VITE_API_URL

interface Note {
  id: string
  project_id: string
  content: string
  note_type: string
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export default function ProjectNotes({ projectId }: { projectId: string }) {
  const { t, i18n } = useTranslation()
  const [notes, setNotes] = useState<Note[]>([])
  const [newContent, setNewContent] = useState('')
  const [newType, setNewType] = useState('memo')
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editType, setEditType] = useState('memo')
  const [previewMode, setPreviewMode] = useState(false)
  const [editPreviewMode, setEditPreviewMode] = useState(false)


  const NOTE_TYPES = [
    { value: 'memo',     label: t('note.labelWork'), color: 'bg-stone-100 text-stone-600' },
    { value: 'concept',  label: t('note.labelConcept'),     color: 'bg-blue-50 text-blue-600' },
    { value: 'research', label: t('note.labelResearch'),   color: 'bg-green-50 text-green-600' },
    { value: 'client',   label: t('note.labelClient'), color: 'bg-amber-50 text-amber-600' },
  ]

  const getNoteType = (value: string) => {
    return NOTE_TYPES.find(t => t.value === value) || NOTE_TYPES[0]
  }

  const fetchNotes = async () => {
    const res = await axios.get(`${API}/notes/?project_id=${projectId}`)
    setNotes(res.data)
  }

  useEffect(() => {
    fetchNotes()
  }, [projectId])

  const handleAdd = async () => {
    if (!newContent.trim()) return
    await axios.post(`${API}/notes/`, {
      project_id: projectId,
      content: newContent,
      note_type: newType,
    })
    setNewContent('')
    setNewType('memo')
    setPreviewMode(false)
    fetchNotes()
  }

  const handleUpdate = async (noteId: string) => {
    if (!editContent.trim()) return
    await axios.put(`${API}/notes/${noteId}`, {
      content: editContent,
      note_type: editType,
    })
    setEditingNote(null)
    setEditPreviewMode(false)
    fetchNotes()
  }

  const handleTogglePin = async (noteId: string) => {
    await axios.patch(`${API}/notes/${noteId}/pin`)
    fetchNotes()
  }

  const handleDelete = async (noteId: string) => {
    if (!confirm(t('note.deleteConfirm'))) return
    await axios.delete(`${API}/notes/${noteId}`)
    fetchNotes()
  }

  const startEdit = (note: Note) => {
    setEditingNote(note.id)
    setEditContent(note.content)
    setEditType(note.note_type)
    setEditPreviewMode(false)
  }

  return (
    <div>
      {/* 새 노트 작성 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          {/* 노트 타입 선택 */}
          <div className="flex gap-1.5 flex-wrap">
            {NOTE_TYPES.map(type => (
              <button
                key={type.value}
                onClick={() => setNewType(type.value)}
                className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                  newType === type.value
                    ? type.color + ' font-semibold ring-1 ring-current'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
          {/* 프리뷰 토글 */}
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="ml-auto text-xs text-gray-400 hover:text-black"
          >
            {previewMode ? `✏️ ${t('note.editNote')}`: `👁 ${t('note.preview')}`}
          </button>
        </div>

        {previewMode ? (
          <div className="min-h-[100px] px-3 py-2 text-sm text-gray-700 prose prose-sm max-w-none border rounded bg-gray-50">
            {newContent
              ? <ReactMarkdown>{newContent}</ReactMarkdown>
              : <p className="text-gray-300 italic">{t('note.previewInfo')}</p>
            }
          </div>
        ) : (
          <textarea
            className="w-full border rounded px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-black resize-none"
            placeholder={t('note.editMdDescription')}
            rows={4}
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
          />
        )}

        <div className="flex justify-end mt-2">
          <button
            onClick={handleAdd}
            disabled={!newContent.trim()}
            className="bg-stone-600 text-white px-4 py-2 text-sm tracking-wider hover:bg-stone-700 transition-colors rounded disabled:opacity-40"
          >
            {t('note.addNote')}
          </button>
        </div>
      </div>

      {/* 노트 목록 */}
      <div className="space-y-4">
        {notes.map(note => {
          const typeInfo = getNoteType(note.note_type)
          return (
            <div
              key={note.id}
              className={`bg-white rounded-lg shadow p-4 ${note.is_pinned ? 'ring-1 ring-stone-300' : ''}`}
            >
              {editingNote === note.id ? (
                // 편집 모드
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {NOTE_TYPES.map(type => (
                        <button
                          key={type.value}
                          onClick={() => setEditType(type.value)}
                          className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                            editType === type.value
                              ? type.color + ' font-semibold ring-1 ring-current'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setEditPreviewMode(!editPreviewMode)}
                      className="ml-auto text-xs text-gray-400 hover:text-black"
                    >
                      {editPreviewMode ? `✏️ ${t('note.editNote')}`: `👁 ${t('note.preview')}`}
                    </button>
                  </div>

                  {editPreviewMode ? (
                    <div className="min-h-[100px] px-3 py-2 text-sm text-gray-700 prose prose-sm max-w-none border rounded bg-gray-50">
                      <ReactMarkdown>{editContent}</ReactMarkdown>
                    </div>
                  ) : (
                    <textarea
                      className="w-full border rounded px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-black resize-none"
                      rows={4}
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                    />
                  )}

                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleUpdate(note.id)}
                      className="bg-stone-600 text-white px-3 py-1 text-xs tracking-wider hover:bg-stone-700 transition-colors rounded"
                    >
                      {t('note.saveNote')}
                    </button>
                    <button
                      onClick={() => { setEditingNote(null); setEditPreviewMode(false) }}
                      className="border px-3 py-1 text-xs hover:bg-gray-50 rounded"
                    >
                      {t('note.cancelNote')}
                    </button>
                  </div>
                </div>
              ) : (
                // 보기 모드
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 text-xs rounded-full ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    {note.is_pinned && (
                      <span className="text-xs text-stone-400">📌 {t('note.pinned')}</span>
                    )}
                    <div className="ml-auto flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        {new Date(note.updated_at).toLocaleString(
                          i18n.language?.startsWith('ko') ? 'ko-KR' : 'en-US',
                          { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                        )}
                      </span>
                      <button
                        onClick={() => handleTogglePin(note.id)}
                        className={`text-xs hover:text-black transition-colors ${note.is_pinned ? 'text-stone-500' : 'text-gray-300 hover:text-stone-400'}`}
                        title={note.is_pinned ? `${t('note.pinRemove')}` : `${t('note.pin')}`}
                      >
                        📌
                      </button>
                      <button
                        onClick={() => startEdit(note)}
                        className="text-xs text-gray-400 hover:text-black"
                      >
                        {t('note.editNote')}
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        {t('note.deleteNote')}
                      </button>
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <ReactMarkdown>{note.content}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {notes.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-2">{t('note.noNotes')}</p>
            <p className="text-sm">{t('note.noNotes2')}</p>
          </div>
        )}
      </div>
    </div>
  )
}