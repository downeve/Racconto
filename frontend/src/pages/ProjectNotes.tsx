import { useEffect, useState, useRef, useMemo, memo } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import MarkdownRenderer from '../components/MarkdownRenderer'
import { useTranslation } from 'react-i18next'
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

interface NotesSidebarContentProps {
  notes: Note[]
  filterType: string | null
  filterPinned: boolean
  setFilterType: (v: string | null) => void
  setFilterPinned: (v: boolean) => void
  scrollToNote: (noteId: string) => void
}

function NotesSidebarContent({ notes, filterType, filterPinned, setFilterType, setFilterPinned, scrollToNote }: NotesSidebarContentProps) {
  const { t } = useTranslation()

  const NOTE_TYPES = [
    { value: 'memo',     label: t('note.labelWork'),     dot: 'bg-edit-faint' },
    { value: 'concept',  label: t('note.labelConcept'),  dot: 'bg-edit-accent' },
    { value: 'research', label: t('note.labelResearch'), dot: 'bg-label-green' },
    { value: 'client',   label: t('note.labelClient'),   dot: 'bg-label-yellow' },
  ]

  const si = (active: boolean) =>
    `relative w-full text-left px-2 py-1 rounded-[1px] flex items-center justify-between text-[0.8125rem] font-sans font-medium transition-colors duration-150 ${
      active
        ? 'bg-edit-ink/[0.06] text-edit-ink before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[2px] before:bg-edit-ink'
        : 'text-edit-muted hover:bg-edit-paper hover:text-edit-ink'
    }`

  const ti = (active: boolean) =>
    `w-full text-left px-2 py-1 rounded-[1px] flex items-center justify-between text-[0.875rem] font-sans font-medium transition-colors duration-150 ${
      active
        ? 'border border-edit-ink bg-edit-ink/[0.06] text-edit-ink'
        : 'border border-edit-line text-edit-muted hover:border-edit-line-strong hover:text-edit-ink'
    }`

  return (
    <div className="p-4">
      <button onClick={() => { setFilterType(null); setFilterPinned(false) }}
        className={si(!filterType && !filterPinned)}>
        <span>{t('note.filterAll')}</span>
        <span>{notes.length}</span>
      </button>
      <button onClick={() => { setFilterPinned(!filterPinned); setFilterType(null) }}
        className={`${si(filterPinned)} mt-0.5 mb-3`}>
        <span className="flex items-center gap-1"><Pin size={12} strokeWidth={1.5} />{t('note.pinned')}</span>
        <span>{notes.filter(n => n.is_pinned).length}</span>
      </button>
      <div className="border-t border-edit-line my-2" />
      <div className="space-y-1">
        {NOTE_TYPES.map(type => (
          <button key={type.value}
            onClick={() => { setFilterType(filterType === type.value ? null : type.value); setFilterPinned(false) }}
            className={ti(filterType === type.value)}>
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${type.dot}`} />
              {type.label}
            </span>
            <span>{notes.filter(n => n.note_type === type.value).length}</span>
          </button>
        ))}
      </div>
      {notes.filter(n => n.is_pinned).length > 0 && (
        <>
          <div className="border-t border-edit-line my-3" />
          <p className="t-caption text-edit-muted mb-2 flex items-center gap-1">
            <Pin size={11} strokeWidth={1.5} />{t('note.pinned2')}
          </p>
          <div className="space-y-0.5">
            {notes.filter(n => n.is_pinned).map(note => (
              <button key={note.id} onClick={() => scrollToNote(note.id)}
                className="w-full text-left px-2 py-1.5 text-[0.8125rem] font-sans rounded-[1px] hover:bg-edit-paper text-edit-muted hover:text-edit-ink truncate">
                {note.content.slice(0, 30)}{note.content.length > 30 ? '...' : ''}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface NoteItemProps {
  note: Note
  photos: { id: string; image_url: string; caption: string | null }[]
  editingNote: string | null
  editContent: string
  editType: string
  editPreviewMode: boolean
  NOTE_TYPES: { value: string; label: string; dot: string }[]
  getNoteType: (value: string) => { value: string; label: string; dot: string }
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

  const formatted = new Date(note.updated_at).toLocaleString(
    i18n.language?.startsWith('ko') ? 'ko-KR' : i18n.language?.startsWith('ja') ? 'ja-JP' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  )

  return (
    <div
      ref={noteRef}
      className={`group/note relative px-5 py-5 border-b border-edit-line transition-colors duration-150 ${
        note.is_pinned
          ? 'border-l-2 border-l-edit-ink pl-[18px] bg-edit-paper/40'
          : 'border-l-2 border-l-transparent hover:bg-edit-paper/30'
      }`}
    >
      {editingNote === note.id ? (
        <div>
          {/* 편집 헤더 */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-1.5 flex-wrap">
              {NOTE_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => setEditType(type.value)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 t-caption rounded-[1px] transition-colors duration-150 ${
                    editType === type.value
                      ? 'bg-edit-ink text-edit-paper'
                      : 'text-edit-muted hover:text-edit-ink hover:bg-edit-paper-2'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${type.dot}`} />
                  {type.label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setEditPreviewMode(false)}
                className={`p-1.5 rounded-[1px] ${!editPreviewMode ? 'bg-edit-ink text-edit-paper' : 'text-edit-muted hover:text-edit-ink'}`}
              >
                <Pencil size={12} strokeWidth={1.5} />
              </button>
              <button
                onClick={() => setEditPreviewMode(true)}
                className={`p-1.5 rounded-[1px] ${editPreviewMode ? 'bg-edit-ink text-edit-paper' : 'text-edit-muted hover:text-edit-ink'}`}
              >
                <Eye size={12} strokeWidth={1.5} />
              </button>
            </div>
          </div>
          {editPreviewMode ? (
            <div className="min-h-[100px] py-2 border-b border-edit-line">
              <MarkdownRenderer content={editContent} className="font-serif text-[0.9375rem] leading-[1.7] text-edit-ink" />
            </div>
          ) : (
            <textarea
              className="w-full font-serif text-[0.9375rem] leading-[1.7] bg-transparent border-0 border-b border-edit-line focus:border-edit-ink focus:outline-none resize-none py-2 transition-colors duration-150 placeholder:text-edit-faint"
              rows={4}
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
            />
          )}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => handleUpdate(note.id)}
              className="t-caption px-4 py-1.5 bg-edit-ink text-edit-paper rounded-[1px] hover:bg-edit-ink/85 transition-colors"
            >
              {t('note.saveNote')}
            </button>
            <button
              onClick={() => { setEditingNote(null); setEditPreviewMode(false) }}
              className="t-caption px-4 py-1.5 text-edit-muted hover:text-edit-ink transition-colors"
            >
              {t('note.cancelNote')}
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* 헤더 */}
          <div className="flex items-center gap-3 mb-3">
            <span className="t-caption text-edit-muted inline-flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${typeInfo.dot}`} />
              {typeInfo.label}
            </span>
            {note.photo_id && (() => {
              const photo = photos.find(p => p.id === note.photo_id)
              return photo ? (
                <div className="flex items-center gap-2">
                  <img src={photo.image_url} alt="" className="w-7 h-7 object-cover rounded-[1px] border border-edit-line" />
                  {photo.caption && <span className="t-caption text-edit-faint italic">{photo.caption}</span>}
                </div>
              ) : null
            })()}
            {note.is_pinned && (
              <span className="t-caption text-edit-muted inline-flex items-center gap-1">
                <Pin size={11} strokeWidth={1.5} />{t('note.pinned')}
              </span>
            )}
            <div className="ml-auto flex items-center gap-4">
              <time className="t-caption text-edit-faint">{formatted}</time>
              <div className="opacity-0 group-hover/note:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-3">
                <button
                  onClick={() => handleTogglePin(note.id)}
                  title={note.is_pinned ? t('note.pinRemove') : t('note.pin')}
                  className="text-edit-muted hover:text-edit-ink transition-colors"
                >
                  <Pin size={13} strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => startEdit(note)}
                  className="t-caption text-edit-muted hover:text-edit-ink transition-colors"
                >
                  {t('note.editNote')}
                </button>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="t-caption text-edit-danger hover:text-edit-danger/70 transition-colors"
                >
                  {t('note.deleteNote')}
                </button>
              </div>
            </div>
          </div>
          {/* 본문 */}
          <MarkdownRenderer content={note.content} className="text-edit-ink/85 font-serif leading-[1.7]" />
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

  const scrollToNote = (noteId: string) => {
    const el = noteRefs.current[noteId]
    if (!el) return
    const container = el.closest('[data-notes-scroll]') as HTMLElement | null
    if (container) {
      container.scrollTo({ top: el.offsetTop - 16, behavior: 'smooth' })
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const filteredNotes = useMemo(() => notes.filter(note => {
    if (filterPinned && !note.is_pinned) return false
    if (filterType && note.note_type !== filterType) return false
    return true
  }), [notes, filterPinned, filterType])

  const NOTE_TYPES = [
    { value: 'memo',     label: t('note.labelWork'),     dot: 'bg-edit-faint' },
    { value: 'concept',  label: t('note.labelConcept'),  dot: 'bg-edit-accent' },
    { value: 'research', label: t('note.labelResearch'), dot: 'bg-label-green' },
    { value: 'client',   label: t('note.labelClient'),   dot: 'bg-label-yellow' },
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


  const sidebarSlot = document.getElementById('sidebar-content-slot')

  return (
    <>
      {sidebarSlot && activeTab === 'notes' && createPortal(
        <NotesSidebarContent
          notes={notes}
          filterType={filterType}
          filterPinned={filterPinned}
          setFilterType={setFilterType}
          setFilterPinned={setFilterPinned}
          scrollToNote={scrollToNote}
        />,
        sidebarSlot
      )}
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          dangerous
        />
      )}

      <div className="max-w-3xl" data-notes-scroll>
        {/* 새 노트 작성 — 종이 단락 */}
        <div className="px-5 py-5 border-b border-edit-line">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-1.5 flex-wrap">
              {NOTE_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => setNewType(type.value)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 t-caption rounded-[1px] transition-colors duration-150 ${
                    newType === type.value
                      ? 'bg-edit-ink text-edit-paper'
                      : 'text-edit-muted hover:text-edit-ink hover:bg-edit-paper-2'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${type.dot}`} />
                  {type.label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setPreviewMode(false)}
                className={`p-1.5 rounded-[1px] ${!previewMode ? 'bg-edit-ink text-edit-paper' : 'text-edit-muted hover:text-edit-ink'}`}
              >
                <Pencil size={12} strokeWidth={1.5} />
              </button>
              <button
                onClick={() => setPreviewMode(true)}
                className={`p-1.5 rounded-[1px] ${previewMode ? 'bg-edit-ink text-edit-paper' : 'text-edit-muted hover:text-edit-ink'}`}
              >
                <Eye size={12} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {previewMode ? (
            <div className="min-h-[100px] py-2 border-b border-edit-line">
              {newContent
                ? <MarkdownRenderer content={newContent} className="font-serif text-[0.9375rem] leading-[1.7] text-edit-ink" />
                : <p className="text-edit-faint">{t('note.previewInfo')}</p>
              }
            </div>
          ) : (
            <textarea
              className="w-full font-serif text-[0.9375rem] leading-[1.7] bg-transparent border-0 border-b border-edit-line focus:border-edit-ink focus:outline-none resize-none py-2 transition-colors duration-150 placeholder:text-edit-faint"
              placeholder={t('note.editMdDescription')}
              rows={4}
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
            />
          )}

          <div className="flex justify-end mt-3">
            <button
              onClick={handleAdd}
              disabled={!newContent.trim()}
              className="t-caption px-4 py-1.5 bg-edit-ink text-edit-paper rounded-[1px] hover:bg-edit-ink/85 transition-colors disabled:opacity-40"
            >
              {t('note.addNote')}
            </button>
          </div>
        </div>

        {/* 노트 목록 */}
        <div>
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
            filterType || filterPinned
              ? <div className="py-16 text-center">
                  <p className="t-caption text-edit-faint">{t('filter.noMatch')}</p>
                </div>
              : <div className="text-center py-24 max-w-sm mx-auto">
                  <p className="t-caption text-edit-faint mb-3">{t('note.empty')}</p>
                  <p className="font-serif text-h3 text-edit-ink/80 mb-2 font-normal">{t('note.noNotes')}</p>
                  <p className="text-body text-edit-muted">{t('note.noNotes2')}</p>
                </div>
          )}
        </div>
      </div>
    </>
  )
}

export default memo(ProjectNotes)
