import { useEffect, useState, useRef, useMemo, memo } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import { useTranslation } from 'react-i18next'
import { useElectronSidebar } from '../context/ElectronSidebarContext'
import ConfirmModal from '../components/ConfirmModal'
import { Pencil, Eye, Pin } from 'lucide-react'

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
      className={`bg-card rounded-card shadow p-4 ${note.is_pinned ? 'ring-1 ring-faint' : ''}`}
    >
      {editingNote === note.id ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-1.5 flex-wrap">
              {NOTE_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => setEditType(type.value)}
                  className={`px-2.5 py-1 text-menu rounded-card transition-colors ${
                    editType === type.value
                      ? type.color + ' ring-1 ring-current'
                      : 'bg-gray-100 text-faint hover:hair'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setEditPreviewMode(!editPreviewMode)}
              className="ml-auto text-menu text-faint hover:text-ink inline-flex items-center gap-1"
            >
              {editPreviewMode
                ? <><Pencil size={13} strokeWidth={1.5} />{t('note.editNote')}</>
                : <><Eye size={13} strokeWidth={1.5} />{t('note.preview')}</>}
            </button>
          </div>
          {editPreviewMode ? (
            <div className="min-h-[100px] px-3 py-1.5 text-body text-ink-2 prose prose-sm max-w-none border rounded-card bg-gray-50">
              <ReactMarkdown>{editContent}</ReactMarkdown>
            </div>
          ) : (
            <textarea
              className="w-full border rounded px-3 py-1.5 text-body mb-2 focus:outline-none focus:ring-1 focus:ring-ink resize-none"
              rows={4}
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
            />
          )}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => handleUpdate(note.id)}
              className="text-small btn-primary tracking-wider transition-colors"
            >
              {t('note.saveNote')}
            </button>
            <button
              onClick={() => { setEditingNote(null); setEditPreviewMode(false) }}
              className="text-small btn-secondary-on-card tracking-wider transition-colors"
            >
              {t('note.cancelNote')}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2.5 py-1 text-menu font-semibold rounded-card ${typeInfo.color}`}>
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
            {note.is_pinned && <span className="text-menu text-faint inline-flex items-center gap-1"><Pin size={12} strokeWidth={1.5} />{t('note.pinned')}</span>}
            <div className="ml-auto flex items-center gap-3">
              <span className="text-menu text-faint">
                {new Date(note.updated_at).toLocaleString(
                  i18n.language?.startsWith('ko') ? 'ko-KR' : 'en-US',
                  { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                )}
              </span>
              <button
                onClick={() => handleTogglePin(note.id)}
                className={`text-caption hover:text-ink transition-colors ${note.is_pinned ? 'text-muted' : 'text-gray-300 hover:text-muted'}`}
                title={note.is_pinned ? `${t('note.pinRemove')}` : `${t('note.pin')}`}
              >
                <Pin size={14} strokeWidth={1.5} />
              </button>
              <button onClick={() => startEdit(note)} className="text-menu text-faint hover:text-ink">
                {t('note.editNote')}
              </button>
              <button onClick={() => handleDelete(note.id)} className="text-menu text-red-400 hover:text-red-600">
                {t('note.deleteNote')}
              </button>
            </div>
          </div>
          <div className="prose prose-sm max-w-none text-ink-2">
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
        <p className="text-menu font-semibold text-muted mb-2">{t('note.filter')}</p>
        <button onClick={() => { setFilterType(null); setFilterPinned(false) }}
          className={`w-full text-left px-2 py-1.5 text-menu rounded-card flex items-center justify-between mb-1 ${!filterType && !filterPinned ? 'bg-ink text-card' : 'hover:bg-hair text-ink-2'}`}>
          <span>{t('note.filterAll')}</span>
          <span className={!filterType && !filterPinned ? 'text-faint' : 'text-muted'}>{notes.length}</span>
        </button>
        <button onClick={() => { setFilterPinned(!filterPinned); setFilterType(null) }}
          className={`w-full text-left px-2 py-1.5 text-caption rounded flex items-center justify-between mb-3 ${filterPinned ? 'bg-ink text-card' : 'hover:bg-hair text-ink-2'}`}>
          <span className="flex items-center gap-1"><Pin size={12} strokeWidth={1.5} />{t('note.pinned')}</span>
          <span className={filterPinned ? 'text-faint' : 'text-muted'}>{notes.filter(n => n.is_pinned).length}</span>
        </button>
        <div className="border-t border-hair/90 my-2" />
        <div className="space-y-1">
          {NOTE_TYPES.map(type => (
            <button key={type.value}
              onClick={() => { setFilterType(filterType === type.value ? null : type.value); setFilterPinned(false) }}
              className={`w-full text-left px-2 py-1.5 text-menu rounded flex items-center justify-between ${filterType === type.value ? 'bg-ink text-card' : 'hover:bg-hair text-ink-2'}`}>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  type.value === 'memo' ? 'bg-stone-400' :
                  type.value === 'concept' ? 'bg-blue-400' :
                  type.value === 'research' ? 'bg-green-400' : 'bg-amber-400'
                }`} />
                {type.label}
              </span>
              <span className={filterType === type.value ? 'text-faint' : 'text-muted'}>{notes.filter(n => n.note_type === type.value).length}</span>
            </button>
          ))}
        </div>
        {notes.filter(n => n.is_pinned).length > 0 && (
          <>
            <div className="border-t border-hair/90 my-3" />
            <p className="text-menu font-semibold text-muted mb-2 flex items-center gap-1"><Pin size={12} strokeWidth={1.5} />{t('note.pinned2')}</p>
            <div className="space-y-1">
              {notes.filter(n => n.is_pinned).map(note => (
                <button key={note.id} onClick={() => scrollToNote(note.id)}
                  className="w-full text-left px-2 py-1.5 text-menu rounded hover:bg-hair text-muted hover:text-ink truncate">
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
        <div className="bg-card rounded-card shadow p-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <p className="text-menu font-semibold text-muted mb-2">{t('note.filter')}</p>

          {/* 전체 */}
          <button
            onClick={() => { setFilterType(null); setFilterPinned(false) }}
            className={`w-full text-left px-2 py-1.5 text-menu rounded-card flex items-center justify-between mb-1 ${
              !filterType && !filterPinned ? 'bg-ink text-card' : 'hover:bg-hair text-ink-2'
            }`}
          >
            <span>{t('note.filterAll')}</span>
            <span className={!filterType && !filterPinned ? 'text-faint' : 'text-muted'}>{notes.length}</span>
          </button>

          {/* 핀 고정 */}
          <button
            onClick={() => { setFilterPinned(!filterPinned); setFilterType(null) }}
            className={`w-full text-left px-2 py-1.5 text-caption rounded flex items-center justify-between mb-3 ${
              filterPinned ? 'bg-ink text-card' : 'hover:bg-hair text-ink-2'
            }`}
          >
            <span className="flex items-center gap-1"><Pin size={12} strokeWidth={1.5} />{t('note.pinned')}</span>
            <span className={filterPinned ? 'text-faint' : 'text-muted'}>{notes.filter(n => n.is_pinned).length}</span>
          </button>

          <div className="border-t border-hair/90 my-2" />

          {/* 타입 필터 */}
          <div className="space-y-1">
            {NOTE_TYPES.map(type => {
              const count = notes.filter(n => n.note_type === type.value).length
              return (
                <button
                  key={type.value}
                  onClick={() => { setFilterType(filterType === type.value ? null : type.value); setFilterPinned(false) }}
                  className={`w-full text-left px-2 py-1.5 text-menu rounded flex items-center justify-between ${
                    filterType === type.value ? 'bg-ink text-card' : 'hover:bg-hair text-ink-2'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full text-menu ${
                      type.value === 'memo' ? 'bg-stone-400' :
                      type.value === 'concept' ? 'bg-blue-400' :
                      type.value === 'research' ? 'bg-green-400' : 'bg-amber-400'
                    }`} />
                    {type.label}
                  </span>
                  <span className={filterType === type.value ? 'text-faint' : 'text-muted'}>{count}</span>
                </button>
              )
            })}
          </div>

          <div className="border-t border-hair/90 my-2" />

          {/* 핀 고정 노트 목록 */}
          {notes.filter(n => n.is_pinned).length > 0 && (
            <>
              <div className="my-3" />
              <p className="text-menu font-semibold text-muted mb-2 flex items-center gap-1"><Pin size={12} strokeWidth={1.5} />{t('note.pinned2')}</p>
              <div className="space-y-1">
                {notes.filter(n => n.is_pinned).map(note => (
                  <button
                    key={note.id}
                    onClick={() => scrollToNote(note.id)}
                    className="w-full text-left px-2 py-1.5 text-menu rounded hover:bg-hair text-muted hover:text-ink truncate"
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
        <div className="bg-card rounded-card shadow p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-1.5 flex-wrap">
              {NOTE_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => setNewType(type.value)}
                  className={`px-2.5 py-1 text-menu rounded-btn transition-colors ${
                    newType === type.value
                      ? type.color + ' font-semibold ring-1 ring-current'
                      : 'bg-gray-100 text-muted hover:bg-hair'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="ml-auto text-menu text-faint hover:text-ink inline-flex items-center gap-1"
            >
              {previewMode
                ? <><Pencil size={13} strokeWidth={1.5} />{t('note.editNote')}</>
                : <><Eye size={13} strokeWidth={1.5} />{t('note.preview')}</>}
            </button>
          </div>

          {previewMode ? (
            <div className="min-h-[100px] px-3 py-1.5 text-body text-ink-2 prose prose-sm max-w-none border rounded-card bg-gray-50">
              {newContent
                ? <ReactMarkdown>{newContent}</ReactMarkdown>
                : <p className="text-faint">{t('note.previewInfo')}</p>
              }
            </div>
          ) : (
            <textarea
              className="w-full border rounded px-3 py-1.5 text-body mb-2 focus:outline-none focus:ring-1 focus:ring-ink-2 resize-none"
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
              className="text-small btn-primary tracking-wider transition-colors disabled:opacity-40"
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
            <div className="text-center py-20 text-faint">
              {filterType || filterPinned
                ? <p className="text-h3 mb-2">{t('filter.noMatch')}</p>
                : <>
                    <p className="text-h3 mb-2">{t('note.noNotes')}</p>
                    <p className="text-h3">{t('note.noNotes2')}</p>
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