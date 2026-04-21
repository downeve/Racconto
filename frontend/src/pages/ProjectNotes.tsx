import { useEffect, useState, useRef, useMemo, memo } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import { useTranslation } from 'react-i18next'
import { useElectronSidebar } from '../context/ElectronSidebarContext'
import ConfirmModal from '../components/ConfirmModal'

const API = import.meta.env.VITE_API_URL

interface Note {
  id: string
  project_id: string
  content: string
  note_type: string
  is_pinned: boolean
  photo_id: string | null
  created_at: string
  updated_at: string
}

interface NoteItemProps {
  note: Note
  photos: { id: string; image_url: string; caption: string | null }[]
  editingNote: string | null
  editContent: string
  editType: string
  editPreviewMode: boolean
  NOTE_TYPES: { value: string; label: string; color: string }[]
  getNoteType: (value: string) => { value: string; label: string; color: string }
  setEditType: (v: string) => void
  setEditPreviewMode: (v: boolean) => void
  setEditContent: (v: string) => void
  setEditingNote: (v: string | null) => void
  handleUpdate: (id: string) => void
  handleTogglePin: (id: string) => void
  handleDelete: (id: string) => void
  startEdit: (note: Note) => void
  noteRef: (el: HTMLDivElement | null) => void
}

const NoteItem = memo(function NoteItem({
  note, photos, editingNote, editContent, editType, editPreviewMode,
  NOTE_TYPES, getNoteType, setEditType, setEditPreviewMode, setEditContent,
  setEditingNote, handleUpdate, handleTogglePin, handleDelete, startEdit, noteRef,
}: NoteItemProps) {
  const { t, i18n } = useTranslation()
  const typeInfo = getNoteType(note.note_type)
  return (
    <div
      ref={noteRef}
      className={`bg-white rounded-lg shadow p-4 ${note.is_pinned ? 'ring-1 ring-stone-300' : ''}`}
    >
      {editingNote === note.id ? (
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
              {editPreviewMode ? `✏️ ${t('note.editNote')}` : `👁 ${t('note.preview')}`}
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
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2.5 py-0.5 text-xs rounded-full ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
            {note.photo_id && (() => {
              const photo = photos.find(p => p.id === note.photo_id)
              return photo ? (
                <div className="flex items-center gap-2">
                  <img src={photo.image_url} alt="" className="w-8 h-8 object-cover rounded border border-gray-200" />
                  {photo.caption && <span className="text-xs text-gray-400 italic">{photo.caption}</span>}
                </div>
              ) : null
            })()}
            {note.is_pinned && <span className="text-xs text-stone-400">📌 {t('note.pinned')}</span>}
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
              <button onClick={() => startEdit(note)} className="text-xs text-gray-400 hover:text-black">
                {t('note.editNote')}
              </button>
              <button onClick={() => handleDelete(note.id)} className="text-xs text-red-400 hover:text-red-600">
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
})

function ProjectNotes({
    projectId,
    activeTab,
    notesVersion,
    photos,
  }: {
    projectId: string
    activeTab: string
    notesVersion: number
    photos: { id: string; image_url: string; caption: string | null }[]
  }) {
  const { t } = useTranslation()
  const [notes, setNotes] = useState<Note[]>([])
  const [newContent, setNewContent] = useState('')
  const fetchedAtVersion = useRef(-1)
  const [newType, setNewType] = useState('memo')
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editType, setEditType] = useState('memo')
  const [previewMode, setPreviewMode] = useState(false)
  const [editPreviewMode, setEditPreviewMode] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  const [filterType, setFilterType] = useState<string | null>(null)
  const [filterPinned, setFilterPinned] = useState(false)
  const noteRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const isElectron = !!window.racconto
  const { setSidebarContent } = useElectronSidebar()

  const scrollToNote = (noteId: string) => {
    noteRefs.current[noteId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const filteredNotes = useMemo(() => notes.filter(note => {
    if (filterPinned && !note.is_pinned) return false
    if (filterType && note.note_type !== filterType) return false
    return true
  }), [notes, filterPinned, filterType])

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
    try {
      const res = await axios.get(`${API}/notes/?project_id=${projectId}`)
      setNotes(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (activeTab !== 'notes') return
    if (fetchedAtVersion.current === notesVersion) return
    fetchedAtVersion.current = notesVersion
    fetchNotes()
  }, [activeTab, notesVersion, projectId])

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
    const targetNote = notes.find(n => n.id === noteId)
    await axios.put(`${API}/notes/${noteId}`, {
      content: editContent,
      note_type: editType,
      is_pinned: targetNote?.is_pinned ?? false,
      photo_id: targetNote?.photo_id ?? null,
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
    setConfirmModal({
      message: t('note.deleteConfirm'),
      onConfirm: async () => {
        setConfirmModal(null)
        await axios.delete(`${API}/notes/${noteId}`)
        fetchNotes()
      }
    })
  }

  const startEdit = (note: Note) => {
    setEditingNote(note.id)
    setEditContent(note.content)
    setEditType(note.note_type)
    setEditPreviewMode(false)
  }

  useEffect(() => {
    if (!isElectron) return
    if (activeTab !== 'notes') return
    setSidebarContent(
      <div className="p-4">
        <p className="text-xs font-semibold text-gray-500 mb-3">{t('note.filter')}</p>
        <button onClick={() => { setFilterType(null); setFilterPinned(false) }}
          className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center justify-between mb-1 ${!filterType && !filterPinned ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
          <span>{t('note.filterAll')}</span>
          <span className={!filterType && !filterPinned ? 'text-gray-300' : 'text-gray-400'}>{notes.length}</span>
        </button>
        <button onClick={() => { setFilterPinned(!filterPinned); setFilterType(null) }}
          className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center justify-between mb-3 ${filterPinned ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
          <span>📌 {t('note.pinned')}</span>
          <span className={filterPinned ? 'text-gray-300' : 'text-gray-400'}>{notes.filter(n => n.is_pinned).length}</span>
        </button>
        <div className="border-t border-gray-100 my-2" />
        <div className="space-y-1">
          {NOTE_TYPES.map(type => (
            <button key={type.value}
              onClick={() => { setFilterType(filterType === type.value ? null : type.value); setFilterPinned(false) }}
              className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center justify-between ${filterType === type.value ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  type.value === 'memo' ? 'bg-stone-400' :
                  type.value === 'concept' ? 'bg-blue-400' :
                  type.value === 'research' ? 'bg-green-400' : 'bg-amber-400'
                }`} />
                {type.label}
              </span>
              <span className={filterType === type.value ? 'text-gray-300' : 'text-gray-400'}>{notes.filter(n => n.note_type === type.value).length}</span>
            </button>
          ))}
        </div>
        {notes.filter(n => n.is_pinned).length > 0 && (
          <>
            <div className="border-t border-gray-100 my-3" />
            <p className="text-xs font-semibold text-gray-500 mb-2">📌 {t('note.pinned')}</p>
            <div className="space-y-1">
              {notes.filter(n => n.is_pinned).map(note => (
                <button key={note.id} onClick={() => scrollToNote(note.id)}
                  className="w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-50 text-gray-600 hover:text-black truncate">
                  {note.content.slice(0, 30)}{note.content.length > 30 ? '...' : ''}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }, [isElectron, activeTab, notes, filterType, filterPinned, t])

  return (
    <div className="flex gap-6">

    {confirmModal && (
      <ConfirmModal
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(null)}
        dangerous
      />
    )}

      {/* 사이드바 */}
      <div className={`${isElectron ? 'hidden' : ''} w-48 shrink-0 sticky top-24 self-start`}>
        <div className="bg-white rounded-lg shadow p-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <p className="text-xs font-semibold text-gray-500 mb-3">{t('note.filter')}</p>

          {/* 전체 */}
          <button
            onClick={() => { setFilterType(null); setFilterPinned(false) }}
            className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center justify-between mb-1 ${
              !filterType && !filterPinned ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <span>{t('note.filterAll')}</span>
            <span className={!filterType && !filterPinned ? 'text-gray-300' : 'text-gray-400'}>{notes.length}</span>
          </button>

          {/* 핀 고정 */}
          <button
            onClick={() => { setFilterPinned(!filterPinned); setFilterType(null) }}
            className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center justify-between mb-3 ${
              filterPinned ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <span>📌 {t('note.pinned')}</span>
            <span className={filterPinned ? 'text-gray-300' : 'text-gray-400'}>{notes.filter(n => n.is_pinned).length}</span>
          </button>

          <div className="border-t border-gray-100 my-2" />

          {/* 타입 필터 */}
          <div className="space-y-1">
            {NOTE_TYPES.map(type => {
              const count = notes.filter(n => n.note_type === type.value).length
              return (
                <button
                  key={type.value}
                  onClick={() => { setFilterType(filterType === type.value ? null : type.value); setFilterPinned(false) }}
                  className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center justify-between ${
                    filterType === type.value ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      type.value === 'memo' ? 'bg-stone-400' :
                      type.value === 'concept' ? 'bg-blue-400' :
                      type.value === 'research' ? 'bg-green-400' : 'bg-amber-400'
                    }`} />
                    {type.label}
                  </span>
                  <span className={filterType === type.value ? 'text-gray-300' : 'text-gray-400'}>{count}</span>
                </button>
              )
            })}
          </div>

          {/* 핀 고정 노트 목록 */}
          {notes.filter(n => n.is_pinned).length > 0 && (
            <>
              <div className="border-t border-gray-100 my-3" />
              <p className="text-xs font-semibold text-gray-500 mb-2">📌 {t('note.pinned')}</p>
              <div className="space-y-1">
                {notes.filter(n => n.is_pinned).map(note => (
                  <button
                    key={note.id}
                    onClick={() => scrollToNote(note.id)}
                    className="w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-50 text-gray-600 hover:text-black truncate"
                  >
                    {note.content.slice(0, 30)}{note.content.length > 30 ? '...' : ''}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 min-w-0">
        {/* 새 노트 작성 */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
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
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="ml-auto text-xs text-gray-400 hover:text-black"
            >
              {previewMode ? `✏️ ${t('note.editNote')}` : `👁 ${t('note.preview')}`}
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
          {filteredNotes.map(note => (
            <NoteItem
              key={note.id}
              note={note}
              photos={photos}
              editingNote={editingNote}
              editContent={editContent}
              editType={editType}
              editPreviewMode={editPreviewMode}
              NOTE_TYPES={NOTE_TYPES}
              getNoteType={getNoteType}
              setEditType={setEditType}
              setEditPreviewMode={setEditPreviewMode}
              setEditContent={setEditContent}
              setEditingNote={setEditingNote}
              handleUpdate={handleUpdate}
              handleTogglePin={handleTogglePin}
              handleDelete={handleDelete}
              startEdit={startEdit}
              noteRef={el => { noteRefs.current[note.id] = el }}
            />
          ))}

          {filteredNotes.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              {filterType || filterPinned
                ? <p className="text-lg mb-2">{t('filter.noMatch')}</p>
                : <>
                    <p className="text-lg mb-2">{t('note.noNotes')}</p>
                    <p className="text-sm">{t('note.noNotes2')}</p>
                  </>
              }
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(ProjectNotes)