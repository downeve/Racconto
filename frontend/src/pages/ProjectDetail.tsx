import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

import ProjectStory from './ProjectStory'
import DeliveryManager from '../components/DeliveryManager'
import { useTranslation } from 'react-i18next'

const API = import.meta.env.VITE_API_URL
const DELIVERY_ENABLED = import.meta.env.VITE_ENABLE_DELIVERY === 'true'

interface Project {
  id: string
  title: string
  title_en: string
  description: string
  description_en: string
  status: string
  location: string
  is_public: string
  cover_image_url: string
}

interface Photo {
  id: string
  image_url: string
  caption: string
  caption_en: string
  folder: string | null
  order: number
  taken_at: string | null
  camera: string | null
  lens: string | null
  iso: string | null
  shutter_speed: string | null
  aperture: string | null
  focal_length: string | null
  gps_lat: string | null
  gps_lng: string | null
  rating: number | null
  color_label: string | null
  deleted_at?: string | null 
}

interface Note {
  id: string
  project_id: string
  content: string
  created_at: string
  updated_at: string
}

// ── 라이트박스 ─────────────────────────────────────────────
function Lightbox({
  photo, photos, colorLabels, chapterPhotoIds,
  onClose, onNavigate, onSetRating, onSetColorLabel, onSaveCaption,
}: {
  photo: Photo
  photos: Photo[]
  colorLabels: { value: string; color: string; label: string }[]
  chapterPhotoIds: Set<string>
  onClose: () => void
  onNavigate: (p: Photo) => void
  onSetRating: (p: Photo, r: number) => void
  onSetColorLabel: (p: Photo, l: string) => void
  onSaveCaption: (p: Photo, c: string) => void
}) {
  const idx = photos.findIndex(p => p.id === photo.id)
  const [editingCaption, setEditingCaption] = useState(false)
  const [captionDraft, setCaptionDraft] = useState(photo.caption || '')
  const { t } = useTranslation()

  useEffect(() => {
    setEditingCaption(false)
    setCaptionDraft(photo.caption || '')
  }, [photo.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && idx < photos.length - 1) onNavigate(photos[idx + 1])
      if (e.key === 'ArrowLeft' && idx > 0) onNavigate(photos[idx - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photo, photos])

  const inChapter = chapterPhotoIds.has(photo.id)

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col" onClick={onClose}>
      {/* 상단 */}
      <div className="flex items-center justify-between px-6 py-3 shrink-0" onClick={e => e.stopPropagation()}>
        <span className="text-white/50 text-sm">{idx + 1} / {photos.length}</span>
        <button onClick={onClose} className="text-white/70 hover:text-white text-2xl">✕</button>
      </div>

      {/* 이미지 + 화살표 */}
      <div className="flex-1 flex items-center justify-center relative min-h-0" onClick={onClose}>
        {idx > 0 && (
          <button className="absolute left-4 z-10 text-white/70 hover:text-white text-5xl select-none"
            onClick={e => { e.stopPropagation(); onNavigate(photos[idx - 1]) }}>‹</button>
        )}
        <img
          src={photo.image_url} alt={photo.caption || ''}
          className="max-w-[calc(100%-8rem)] max-h-full object-contain"
          onClick={e => e.stopPropagation()}
        />
        {idx < photos.length - 1 && (
          <button className="absolute right-4 z-10 text-white/70 hover:text-white text-5xl select-none"
            onClick={e => { e.stopPropagation(); onNavigate(photos[idx + 1]) }}>›</button>
        )}
      </div>

      {/* 하단 컨트롤 */}
      <div className="shrink-0 bg-black/80 border-t border-white/10 px-6 py-4" onClick={e => e.stopPropagation()}>
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="flex items-center gap-4 flex-wrap">
            {/* 별점 */}
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => onSetRating(photo, star)}
                  className={`text-xl transition-colors ${photo.rating && photo.rating >= star ? 'text-yellow-400' : 'text-white/20 hover:text-yellow-300'}`}>★</button>
              ))}
            </div>
            <div className="w-px h-5 bg-white/20" />
            {/* 컬러 레이블 */}
            <div className="flex gap-1.5">
              {colorLabels.map(label => (
                <button key={label.value} onClick={() => onSetColorLabel(photo, label.value)} title={label.label}
                  className={`w-5 h-5 rounded-full ${label.color} transition-all ${
                    photo.color_label === label.value
                      ? 'ring-2 ring-offset-2 ring-offset-black ring-white scale-110'
                      : 'opacity-40 hover:opacity-80'
                  }`} />
              ))}
            </div>
            <div className="w-px h-5 bg-white/20" />
            {/* 포트폴리오 */}
            {inChapter && (
              <span className="text-xs text-blue-400">📖 {t('story.chapterIncl')}</span>
            )}
            {/* EXIF */}
            {(photo.camera || photo.focal_length) && (
              <>
                <div className="w-px h-5 bg-white/20" />
                <span className="text-xs text-white/40">
                  {[photo.camera, photo.focal_length, photo.aperture, photo.shutter_speed, photo.iso].filter(Boolean).join(' · ')}
                </span>
              </>
            )}
          </div>
          {/* 캡션 */}
          {editingCaption ? (
            <div className="flex gap-2">
              <input
                className="flex-1 bg-white/10 text-white text-sm px-3 py-1.5 rounded border border-white/20 focus:outline-none focus:border-white/50"
                value={captionDraft}
                onChange={e => setCaptionDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { onSaveCaption(photo, captionDraft); setEditingCaption(false) }
                  if (e.key === 'Escape') setEditingCaption(false)
                }}
                autoFocus
              />
              <button onClick={() => { onSaveCaption(photo, captionDraft); setEditingCaption(false) }}
                className="text-xs px-3 py-1.5 bg-white text-black rounded hover:bg-gray-200">{t('common.save')}</button>
              <button onClick={() => setEditingCaption(false)}
                className="text-xs px-3 py-1.5 bg-white/10 text-white rounded hover:bg-white/20">{t('common.cancel')}</button>
            </div>
          ) : (
            <button onClick={() => { setEditingCaption(true); setCaptionDraft(photo.caption || '') }}
              className="text-left w-full text-sm text-white/60 hover:text-white/90 transition-colors">
              {photo.caption || <span className="italic text-white/30">{t('photo.addCaption')}</span>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── PhotoCard (기존 SortablePhoto) ──────────────────────────────────────────
function PhotoCard({
  photo, project, editingCaption, captionKo, setCaptionKo, setEditingCaption,
  onSetCover, onDelete, onSaveCaption, onSetRating, onSetColorLabel,
  onOpenLightbox, showExif, gridCols, colorLabels, chapterPhotoIds, chapters, onShowChapterMenu
}: {
  photo: Photo
  project: Project
  editingCaption: string | null
  captionKo: string
  setCaptionKo: (v: string) => void
  setEditingCaption: (v: string | null) => void
  onSetCover: (photo: Photo) => void
  onDelete: (id: string) => void
  onSaveCaption: (photo: Photo) => void
  onSetRating: (photo: Photo, rating: number) => void
  onSetColorLabel: (photo: Photo, label: string) => void
  onOpenLightbox: (photo: Photo) => void
  showExif: boolean
  gridCols: number
  colorLabels: { value: string; color: string; label: string }[]
  chapterPhotoIds: Set<string>
  chapters: { id: string; title: string }[]
  onShowChapterMenu: (photoId: string) => void
}) {
  const { t, i18n } = useTranslation()

  // 목록형
  if (gridCols === 1) {
    return (
      <div className="bg-white rounded overflow-hidden flex items-center gap-4 p-2 border-b">
        {/* 드래그 핸들(⠿) 삭제됨 */}
        <img src={photo.image_url} alt={photo.caption}
          className="w-16 h-16 object-cover rounded shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onOpenLightbox(photo)} />
        <div className="flex gap-0.5 shrink-0">
          {[1, 2, 3, 4, 5].map(star => (
            <button key={star} onClick={() => onSetRating(photo, star)}
              className={`text-xs ${photo.rating && photo.rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
          ))}
        </div>
        <div className="flex gap-0.5 shrink-0">
          {colorLabels.map(label => (
            <button key={label.value} onClick={() => onSetColorLabel(photo, label.value)} title={label.label}
              className={`w-3 h-3 rounded-full ${label.color} ${photo.color_label === label.value ? 'ring-2 ring-offset-1 ring-gray-400' : 'opacity-40'}`} />
          ))}
        </div>
        <div className="flex-1 min-w-0 cursor-pointer"
          onClick={() => { setEditingCaption(photo.id); setCaptionKo(photo.caption || '') }}>
          {editingCaption === photo.id ? (
            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
              <input className="border rounded px-2 py-0.5 text-xs flex-1" placeholder="캡션"
                value={captionKo} onChange={e => setCaptionKo(e.target.value)} />
              <button onClick={() => onSaveCaption(photo)} className="bg-black text-white px-2 py-0.5 text-xs rounded">저장</button>
              <button onClick={() => setEditingCaption(null)} className="border px-2 py-0.5 text-xs rounded">취소</button>
            </div>
          ) : (
            photo.caption
              ? <p className="text-sm text-gray-700 truncate">{photo.caption}</p>
              : <p className="text-sm text-gray-300">{t('photo.addCaption')}</p>
          )}
        </div>
        {showExif && editingCaption !== photo.id && (
          <div className="text-xs text-gray-400 shrink-0 text-right">
            {photo.camera && <p>{photo.camera}</p>}
            {photo.taken_at && (
              <p>
                {new Date(photo.taken_at).toLocaleDateString(
                  i18n.language?.startsWith('ko') ? 'ko-KR' : 'en-US'
                )}
              </p>
            )}
            {(photo.focal_length || photo.aperture || photo.shutter_speed || photo.iso) && (
              <p>{[photo.focal_length, photo.aperture, photo.shutter_speed, photo.iso].filter(Boolean).join(' · ')}</p>
            )}
          </div>
        )}
        {editingCaption !== photo.id && (
          <div className="flex gap-1 shrink-0">
            <button onClick={() => onSetCover(photo)}
              className={`px-2 py-1 text-xs rounded ${project?.cover_image_url === photo.image_url ? 'bg-yellow-400 text-black' : 'bg-gray-100 hover:bg-gray-200'}`}>
              {project?.cover_image_url === photo.image_url ? t('photo.isCover') : t('photo.setCover')}
            </button>
            {chapterPhotoIds.has(photo.id) && (
              <button className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-500 cursor-default">📖 챕터</button>
            )}
            <button onClick={() => onDelete(photo.id)} className="px-2 py-1 text-xs bg-red-100 text-red-500 rounded hover:bg-red-200">삭제</button>
          </div>
        )}
      </div>
    )
  }

  // 그리드
  return (
    <div className="rounded overflow-hidden bg-gray-100">
      <div className="relative group">
        {/* 드래그 핸들(⠿) 삭제됨 */}

        {/* 사진 */}
        <img
          src={photo.image_url} alt={photo.caption}
          className="w-full aspect-[3/2] object-contain cursor-pointer"
          onClick={() => onOpenLightbox(photo)}
        />

        {/* 호버 오버레이 */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute inset-0 bg-black/50" onClick={() => onOpenLightbox(photo)} />
          <div className="absolute bottom-2 right-2 flex gap-1 z-10">
            <button
              onClick={e => { e.stopPropagation(); onSetCover(photo) }}
              className={`${gridCols >= 4 ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-xs'} rounded ${project?.cover_image_url === photo.image_url ? 'bg-yellow-400 text-black' : 'bg-white text-black'}`}>
              {project?.cover_image_url === photo.image_url ? t('photo.isCover') : t('photo.setCover')}
            </button>
            {chapters.length > 0 && (
              chapterPhotoIds.has(photo.id) ? (
                <button
                  className={`${gridCols >= 4 ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-xs'} rounded bg-blue-500 text-white opacity-70 cursor-default`}
                  title="이미 챕터에 포함된 사진"
                >📖</button>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); onShowChapterMenu(photo.id) }}
                  className={`${gridCols >= 4 ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-xs'} rounded bg-white text-black`}
                  title="챕터에 추가"
                >📖</button>
              )
            )}
            <button
              onClick={e => { e.stopPropagation(); onDelete(photo.id) }}
              className="w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded-full text-xs font-bold">
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* 별점 & 컬러 레이블 등 생략 없이 기존과 동일 */}
      <div className="px-2 py-2 bg-white flex items-center justify-between">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(star => (
            <button key={star} onClick={() => onSetRating(photo, star)}
              className={`${gridCols >= 4 ? 'text-xs' : 'text-sm'} ${photo.rating && photo.rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
          ))}
        </div>
        <div className="flex gap-0.5">
          {colorLabels.map(label => (
            <button key={label.value} onClick={() => onSetColorLabel(photo, label.value)} title={label.label}
              className={`rounded-full ${label.color} ${gridCols >= 4 ? 'w-3 h-3' : 'w-4 h-4'} ${photo.color_label === label.value ? 'ring-2 ring-offset-1 ring-gray-400' : 'opacity-50'}`} />
          ))}
        </div>
      </div>

      {editingCaption === photo.id ? (
        <div className="p-2 bg-white">
          <input className="w-full border rounded px-2 py-1 text-xs mb-1" placeholder="캡션"
            value={captionKo} onChange={e => setCaptionKo(e.target.value)} />
          <div className="flex gap-1">
            <button onClick={() => onSaveCaption(photo)} className="bg-black text-white px-2 py-1 text-xs">저장</button>
            <button onClick={() => setEditingCaption(null)} className="border px-2 py-1 text-xs">취소</button>
          </div>
        </div>
      ) : (
        <div className="p-2 cursor-pointer hover:bg-gray-50"
          onClick={() => { setEditingCaption(photo.id); setCaptionKo(photo.caption || '') }}>
          {photo.caption
            ? <p className="text-xs text-gray-600">{photo.caption}</p>
            : <p className="text-xs text-gray-300">{t('photo.addCaption')}</p>}
        </div>
      )}

      {showExif && (photo.camera || photo.taken_at) && (
        <div className="px-2 pb-2 bg-white">
          <div className="border-t pt-2 mt-1">
            {photo.taken_at && <p className="text-xs text-gray-400">📅 {new Date(photo.taken_at).toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : 'en-US')}</p>}
            {photo.camera && <p className="text-xs text-gray-400">📷 {photo.camera}</p>}
            {photo.lens && <p className="text-xs text-gray-400">🔭 {photo.lens}</p>}
            {(photo.iso || photo.shutter_speed || photo.aperture || photo.focal_length) && (
              <p className="text-xs text-gray-400">
                {[photo.focal_length, photo.aperture, photo.shutter_speed, photo.iso].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── ProjectDetail ──────────────────────────────────────────
export default function ProjectDetail() {
  const { t, i18n } = useTranslation()

  const { id } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [uploading, setUploading] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  // 메인 탭
  const [activeTab, setActiveTab] = useState<'photos' | 'story' | 'notes' | 'delivery'>('photos')
  // 사진 탭의 서브탭 🆕
  const [photoSubTab, setPhotoSubTab] = useState<'all' | 'trash'>('all')
  // 휴지통 데이터 🆕
  const [trashedPhotos, setTrashedPhotos] = useState<Photo[]>([])
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [filterColor, setFilterColor] = useState<string | null>(null)
  const [filterFolder, setFilterFolder] = useState<string | null>(null)
  const [showExif, setShowExif] = useState(true)
  const [showFilter, setShowFilter] = useState(true)
  const [editingCaption, setEditingCaption] = useState<string | null>(null)
  const [captionKo, setCaptionKo] = useState('')
  const [chapterPhotoIds, setChapterPhotoIds] = useState<Set<string>>(new Set())
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null)
  const [chapterMenuPhoto, setChapterMenuPhoto] = useState<string | null>(null)
  const [chapters, setChapters] = useState<{ id: string; title: string }[]>([])

  const [sortBy, setSortBy] = useState<'default' | 'taken_at' | 'name'>('default')

  const fetchPhotos = async () => {
    if (!id) return
    const res = await axios.get(`${API}/photos/?project_id=${id}`)
    setPhotos(res.data)
  }

  const fetchTrash = async () => {
    const res = await axios.get(`${API}/photos/trash/${id}`)
    setTrashedPhotos(res.data)
  }

  const fetchChapterPhotoIds = async () => {
    if (!id) return
    const res = await axios.get(`${API}/chapters/?project_id=${id}`)
    setChapters(res.data.map((c: any) => ({ id: c.id, title: c.title }))) // 추가
    const ids = new Set<string>()
    for (const chapter of res.data) {
      const photoRes = await axios.get(`${API}/chapters/${chapter.id}/photos`)
      photoRes.data.forEach((cp: any) => ids.add(cp.photo_id))
    }
    setChapterPhotoIds(ids)
  }

  const fetchNotes = async () => {
    if (!id) return
    const res = await axios.get(`${API}/notes/?project_id=${id}`)
    setNotes(res.data)
  }

  const [gridCols, setGridCols] = useState(3)
  const [labelSettings, setLabelSettings] = useState<Record<string, string>>({
    color_label_red: t('colors.reject'), color_label_yellow: t('colors.hold'), color_label_green: t('colors.select'),
    color_label_blue: t('colors.clientShare'), color_label_purple: t('colors.finalSelect'),
  })

  useEffect(() => {
    axios.get(`${API}/settings/`).then(res => {
      setGridCols(parseInt(res.data['default_grid_cols'] || '3'))
      setShowExif(res.data['default_show_exif'] !== 'false')
      setLabelSettings({
        color_label_red: res.data['color_label_red'] || t('colors.reject'),
        color_label_yellow: res.data['color_label_yellow'] || t('colors.hold'),
        color_label_green: res.data['color_label_green'] || t('colors.select'),
        color_label_blue: res.data['color_label_blue'] || t('colors.clientShare'),
        color_label_purple: res.data['color_label_purple'] || t('colors.finalSelect'),
      })
    })
  }, [])

  useEffect(() => {
    if (!id) return
    axios.get(`${API}/projects/${id}`).then(res => setProject(res.data))
    fetchPhotos()
    fetchNotes()
  }, [id])

  useEffect(() => { if (id) fetchChapterPhotoIds() }, [id])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !id) return
    setUploading(true)
    for (const file of Array.from(e.target.files)) {
      const formData = new FormData()
      formData.append('file', file)
      const relativePath = (file as any).webkitRelativePath
      const folder = relativePath ? relativePath.split('/')[0] : null
      const url = folder
        ? `${API}/photos/upload?project_id=${id}&folder=${encodeURIComponent(folder)}`
        : `${API}/photos/upload?project_id=${id}`
      await axios.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    }
    await fetchPhotos()
    setUploading(false)
    e.target.value = ''
  }

  const handleSetCover = async (photo: Photo) => {
    const statusValue = typeof project!.status === 'object' ? (project!.status as any).value : project!.status
    await axios.put(`${API}/projects/${id}`, {
      title: project!.title, title_en: project!.title_en,
      description: project!.description, description_en: project!.description_en,
      location: project!.location, is_public: project!.is_public,
      status: statusValue, cover_image_url: photo.image_url
    })
    const res = await axios.get(`${API}/projects/${id}`)
    setProject(res.data)
  }

  const handleRemoveCover = async () => {
    const statusValue = typeof project!.status === 'object' ? (project!.status as any).value : project!.status
    await axios.put(`${API}/projects/${id}`, {
      title: project!.title, title_en: project!.title_en,
      description: project!.description, description_en: project!.description_en,
      location: project!.location, is_public: project!.is_public,
      status: statusValue, cover_image_url: null
    })
    const res = await axios.get(`${API}/projects/${id}`)
    setProject(res.data)
  }

  const handleDeletePhoto = async (photoId: string) => {
    await axios.delete(`${API}/photos/${photoId}`)
    if (lightboxPhoto?.id === photoId) setLightboxPhoto(null)
    
    // 삭제 후 두 정보를 모두 갱신하여 UI를 완벽히 동기화합니다.
    await fetchPhotos()
    await fetchChapterPhotoIds() 
  }

  const handleSetRating = async (photo: Photo, rating: number) => {
    const newRating = photo.rating === rating ? null : rating
    await axios.put(`${API}/photos/${photo.id}`, { ...photo, rating: newRating })
    if (lightboxPhoto?.id === photo.id) setLightboxPhoto(prev => prev ? { ...prev, rating: newRating } : null)
    fetchPhotos()
  }

  const handleSetColorLabel = async (photo: Photo, label: string) => {
    const newLabel = photo.color_label === label ? null : label
    await axios.put(`${API}/photos/${photo.id}`, { ...photo, color_label: newLabel })
    if (lightboxPhoto?.id === photo.id) setLightboxPhoto(prev => prev ? { ...prev, color_label: newLabel } : null)
    fetchPhotos()
  }

  const handleSaveCaptionLightbox = async (photo: Photo, caption: string) => {
    await axios.put(`${API}/photos/${photo.id}`, { ...photo, caption })
    if (lightboxPhoto?.id === photo.id) setLightboxPhoto(prev => prev ? { ...prev, caption } : null)
    fetchPhotos()
  }

  const handleClearRatings = async () => {
    if (!confirm(t('actions.resetRatingsConfirm'))) return
    for (const photo of photos) {
      if (photo.rating !== null) await axios.put(`${API}/photos/${photo.id}`, { ...photo, rating: null })
    }
    fetchPhotos()
  }

  const handleClearColorLabels = async () => {
    if (!confirm(t('actions.resetColorsConfirm'))) return
    for (const photo of photos) {
      if (photo.color_label !== null) await axios.put(`${API}/photos/${photo.id}`, { ...photo, color_label: null })
    }
    fetchPhotos()
  }

  const handleSaveCaption = async (photo: Photo) => {
    await axios.put(`${API}/photos/${photo.id}`, { ...photo, caption: captionKo })
    setEditingCaption(null)
    fetchPhotos()
  }

  const handleAddNote = async () => {
    if (!newNote.trim() || !id) return
    await axios.post(`${API}/notes/`, { project_id: id, content: newNote })
    setNewNote('')
    fetchNotes()
  }

  const handleUpdateNote = async (noteId: string) => {
    if (!editContent.trim()) return
    await axios.put(`${API}/notes/${noteId}`, { content: editContent })
    setEditingNote(null); setEditContent('')
    fetchNotes()
  }

  const handleDeleteNote = async (noteId: string) => {
    await axios.delete(`${API}/notes/${noteId}`)
    fetchNotes()
  }

  const handleAddToChapter = async (photoId: string, chapterId: string) => {
  try {
      await axios.post(`${API}/chapters/${chapterId}/photos`, { photo_id: photoId })
      fetchChapterPhotoIds()
    } catch {
      // 이미 추가됨
    }
    setChapterMenuPhoto(null)
  }

  const colorLabels = [
    { value: 'red',    color: 'bg-red-500',    label: labelSettings['color_label_red'] },
    { value: 'yellow', color: 'bg-yellow-400', label: labelSettings['color_label_yellow'] },
    { value: 'green',  color: 'bg-green-500',  label: labelSettings['color_label_green'] },
    { value: 'blue',   color: 'bg-blue-500',   label: labelSettings['color_label_blue'] },
    { value: 'purple', color: 'bg-purple-500', label: labelSettings['color_label_purple'] },
  ]

const filteredPhotos = photos.filter(photo => {
    //삭제된 사진 제외
    if (photo.deleted_at) return false

    if (filterRating !== null) {
      if (filterRating === 0) { if (photo.rating !== null) return false }
      else { if (photo.rating !== filterRating) return false }
    }
    if (filterColor !== null && photo.color_label !== filterColor) return false
    if (filterFolder !== null && photo.folder !== filterFolder) return false
    return true
  }).sort((a, b) => {
    // 👇 방금 추가한 상태에 따른 정렬 로직
    if (sortBy === 'taken_at') {
      if (!a.taken_at && !b.taken_at) return 0
      if (!a.taken_at) return 1 // 촬영 정보가 없으면 뒤로 보냄
      if (!b.taken_at) return -1
      return new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime() // 과거 -> 최신순
    }
    if (sortBy === 'name') {
      const nameA = a.image_url.split('/').pop() || ''
      const nameB = b.image_url.split('/').pop() || ''
      return nameA.localeCompare(nameB) // 파일 이름 A-Z 순
    }
    return 0 // default: 서버에서 받아온 기본 순서
  })

  if (!project) return <div className="p-6 text-gray-400">{t('common.loading')}</div>

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 라이트박스 */}
      {lightboxPhoto && (
        <Lightbox
          photo={lightboxPhoto}
          photos={filteredPhotos}
          colorLabels={colorLabels}
          chapterPhotoIds={chapterPhotoIds}
          onClose={() => setLightboxPhoto(null)}
          onNavigate={setLightboxPhoto}
          onSetRating={handleSetRating}
          onSetColorLabel={handleSetColorLabel}
          onSaveCaption={handleSaveCaptionLightbox}
        />
      )}

      <div className="mb-4">
        <a href="/projects" className="text-sm text-gray-400 hover:text-black">{t('nav.backToProjects')}</a>
      </div>

      <div className="mb-8 flex items-start justify-between gap-6">
        <div className="flex-1">
          <h2 className="text-3xl font-bold mb-1">{project.title}</h2>
          {project.location && <p className="text-sm text-gray-500 mb-4">📍 {project.location}</p>}
          {project.description && <p className="text-gray-700 mb-2">{project.description}</p>}
        </div>
        {project.cover_image_url && (
          <div className="shrink-0 flex flex-col items-center gap-2">
            <img src={project.cover_image_url} alt="커버" className="w-24 h-24 object-cover rounded" />
            <button onClick={handleRemoveCover} className="text-xs text-red-400 hover:text-red-600">{t('photo.removeCover')}</button>
          </div>
        )}
      </div>

      {/* 챕터 선택 모달 */}
      {chapterMenuPhoto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={() => setChapterMenuPhoto(null)}>
          <div className="bg-white rounded-xl p-5 shadow-2xl min-w-[240px]" onClick={e => { e.stopPropagation() }}>
            <h3 className="text-sm font-semibold mb-3">{t('story.selectChapter')}</h3>
            <div className="space-y-1">
            {chapters.map((chapter, idx) => (
              <button key={chapter.id}
                onClick={() => handleAddToChapter(chapterMenuPhoto, chapter.id)}
                className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 text-gray-700">
                <span className="text-gray-400 text-xs mr-2">Ch.{idx + 1}</span>
                {chapter.title}
              </button>
            ))}
            </div>
            <button onClick={() => setChapterMenuPhoto(null)}
              className="mt-3 w-full text-xs text-gray-400 hover:text-black">{t('common.close')}</button>
          </div>
        </div>
      )}

      {/* 탭 */}
      <div className="flex border-b mb-6">
        <button onClick={() => { 
            setActiveTab('photos'); 
            setPhotoSubTab('all'); // 💡 이 줄이 추가되었습니다! 무조건 'all' 탭으로 열리게 합니다.
            fetchPhotos(); 
            fetchChapterPhotoIds() 
          }}
          className={`px-6 py-2 text-sm tracking-wider ${activeTab === 'photos' ? 'border-b-2 border-black font-semibold' : 'text-gray-400'}`}>
          {t('photo.title')}
        </button>
        <button onClick={() => setActiveTab('story')}
          className={`px-6 py-2 text-sm tracking-wider ${activeTab === 'story' ? 'border-b-2 border-black font-semibold' : 'text-gray-400'}`}>
          {t('story.title')}
        </button>
        <button onClick={() => setActiveTab('notes')}
          className={`px-6 py-2 text-sm tracking-wider ${activeTab === 'notes' ? 'border-b-2 border-black font-semibold' : 'text-gray-400'}`}>
          {t('note.title')}
        </button>
        {DELIVERY_ENABLED && (
        <button onClick={() => setActiveTab('delivery')}
          className={`px-6 py-2 text-sm tracking-wider ${activeTab === 'delivery' ? 'border-b-2 border-black font-semibold' : 'text-gray-400'}`}>
          {t('delivery.title')}
        </button>
        )}
      </div>

      {/* 사진 탭 */}
      {activeTab === 'photos' && (
        <div>
          {/* 🆕 서브탭 헤더 */}
          <div className="flex items-center gap-4 mb-4 border-b">
            <button
              onClick={() => setPhotoSubTab('all')}
              className={`pb-2 px-4 text-sm ${
                photoSubTab === 'all'
                  ? 'border-b-2 border-black font-semibold'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t('photo.allPhotos')}
            </button>
            <button
              onClick={() => {
                setPhotoSubTab('trash')
                fetchTrash()
              }}
              className={`pb-2 px-4 text-sm ${
                photoSubTab === 'trash'
                  ? 'border-b-2 border-black font-semibold'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              🗑️ {t('photo.trash')}
            </button>
          </div>

          {/* 전체 사진 뷰 (기존 UI 그대로) */}
          {photoSubTab === 'all' && (
            <div className="flex gap-6">
              <div className={`${showFilter ? 'w-48' : 'w-6'} shrink-0 transition-all duration-200`}>
                <button onClick={() => setShowFilter(!showFilter)}
                  className="mb-2 text-gray-400 hover:text-black text-xs flex items-center gap-1">
                  {showFilter ? '◀ ' + t('filter.filter') : '▶'}
                </button>
                {showFilter && (
                  <div className="bg-white rounded-lg shadow p-4 overflow-y-auto max-h-[calc(100vh-2rem)] sticky top-4">
                    <div className="mb-4 flex flex-col gap-2">
                      <label className="cursor-pointer bg-black text-white px-3 py-2 text-xs tracking-wider hover:bg-gray-800 inline-block w-full text-center">
                        {uploading ? t('photo.uploading') : t('photo.uploadPhotos')}
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
                      </label>
                      <label className="cursor-pointer bg-gray-700 text-white px-3 py-2 text-xs tracking-wider hover:bg-gray-600 inline-block w-full text-center">
                        {uploading ? t('photo.uploading') : t('photo.uploadFolder')}
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} {...{ webkitdirectory: '' } as any} />
                      </label>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 mb-2">{t('filter.view')}</p>
                      <div className="flex gap-1 mb-2">
                        {[{ cols: 2, icon: '2' }, { cols: 3, icon: '3' }, { cols: 4, icon: '4' }, { cols: 1, icon: '≡' }].map(({ cols, icon }) => (
                          <button key={cols} onClick={() => setGridCols(cols)}
                            className={`flex-1 py-1 text-xs rounded ${gridCols === cols ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{icon}</button>
                        ))}
                      </div>
                      <button onClick={() => setShowExif(!showExif)}
                        className={`w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between ${showExif ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                        <span>{t('filter.exifOnOff')}</span><span>{showExif ? 'ON' : 'OFF'}</span>
                      </button>
                    </div>

                    {/* 👇 여기서부터 새로 추가되는 "정렬 기준" UI 입니다. */}
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 mb-2">정렬 기준</p>
                      <div className="flex flex-col gap-1">
                        <button onClick={() => setSortBy('default')}
                          className={`w-full text-left px-2 py-1 text-xs rounded ${sortBy === 'default' ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                          기본 (업로드순)
                        </button>
                        <button onClick={() => setSortBy('taken_at')}
                          className={`w-full text-left px-2 py-1 text-xs rounded ${sortBy === 'taken_at' ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                          촬영 시간순
                        </button>
                        <button onClick={() => setSortBy('name')}
                          className={`w-full text-left px-2 py-1 text-xs rounded ${sortBy === 'name' ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                          파일 이름순
                        </button>
                      </div>
                    </div>
                    {/* 👆 여기까지 */}

                    <button onClick={() => { setFilterRating(null); setFilterColor(null); setFilterFolder(null) }}
                      className={`w-full text-left px-2 py-1 text-xs rounded mb-3 ${!filterRating && !filterColor ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                      {t('filter.allPhotos')} ({photos.length})
                    </button>

                    {photos.some(p => p.folder) && (
                      <div className="mt-4 mb-4">
                        <p className="text-xs font-semibold text-gray-500 mb-2">{t('filter.folder')}</p>
                        <button onClick={() => setFilterFolder(null)}
                          className={`w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between mb-1 ${filterFolder === null ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                          <span>{t('filter.allFolders')}</span><span className="text-gray-400">{photos.length}</span>
                        </button>
                          {[...new Set(photos.filter(p => p.folder).map(p => p.folder))].map(folder => {
                          const count = photos.filter(p => p.folder === folder).length
                          return (
                            <button key={folder} onClick={() => setFilterFolder(filterFolder === folder ? null : folder!)}
                              title={folder!} // 마우스 올렸을 때 전체 이름 툴팁 표시
                              className={`w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between ${filterFolder === folder ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                              {/* 👇 min-w-0 을 넣어야 truncate가 작동합니다. */}
                              <span className="flex items-center gap-1 min-w-0">
                                <span className="shrink-0">📁</span>
                                <span className="truncate">{folder}</span>
                              </span>
                              {/* 👇 숫자가 찌그러지지 않게 shrink-0 추가 */}
                              <span className="text-gray-400 shrink-0 ml-2">{count}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-500">{t('filter.rating')}</p>
                        <button onClick={handleClearRatings} className="text-xs text-gray-400 hover:text-red-500">{t('common.reset')}</button>
                      </div>
                      {[5, 4, 3, 2, 1].map(star => {
                        const count = photos.filter(p => p.rating === star).length
                        return (
                          <button key={star} onClick={() => setFilterRating(filterRating === star ? null : star)}
                            className={`w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between ${filterRating === star ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                            <span>{'★'.repeat(star)}{'☆'.repeat(5 - star)}</span>
                            <span className="text-gray-400">{count}</span>
                          </button>
                        )
                      })}
                      <button onClick={() => setFilterRating(filterRating === 0 ? null : 0)}
                        className={`w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between ${filterRating === 0 ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                        <span className="text-gray-400">{t('filter.unrated')}</span>
                        <span className="text-gray-400">{photos.filter(p => !p.rating).length}</span>
                      </button>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-500">{t('filter.colors')}</p>
                        <button onClick={handleClearColorLabels} className="text-xs text-gray-400 hover:text-red-500">{t('common.reset')}</button>
                      </div>
                      {colorLabels.map(label => {
                        const count = photos.filter(p => p.color_label === label.value).length
                        return (
                          <button key={label.value} onClick={() => setFilterColor(filterColor === label.value ? null : label.value)}
                            className={`w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between ${filterColor === label.value ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                            <span className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full ${label.color}`} />{label.label}</span>
                            <span className="text-gray-400">{count}</span>
                          </button>
                        )
                      })}
                    </div>

                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className={`grid gap-4 ${
                  gridCols === 1 ? 'grid-cols-1' : gridCols === 2 ? 'grid-cols-2' :
                  gridCols === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                  {filteredPhotos.map(photo => (
                    <PhotoCard
                      key={photo.id} photo={photo} project={project}
                      editingCaption={editingCaption} captionKo={captionKo}
                      setCaptionKo={setCaptionKo} setEditingCaption={setEditingCaption}
                      onSetCover={handleSetCover} 
                      onDelete={handleDeletePhoto} onSaveCaption={handleSaveCaption}
                      onSetRating={handleSetRating} onSetColorLabel={handleSetColorLabel}
                      onOpenLightbox={setLightboxPhoto}
                      chapters={chapters}
                      onShowChapterMenu={setChapterMenuPhoto}
                      showExif={showExif} gridCols={gridCols}
                      colorLabels={colorLabels} chapterPhotoIds={chapterPhotoIds}
                    />
                  ))}
                </div>

                {filteredPhotos.length === 0 && !uploading && (
                  <div className="text-center py-20 text-gray-400">
                    {photos.length === 0
                      ? <><p className="text-lg mb-2">{t('photo.noPhotos')}</p></>
                      : <><p className="text-lg mb-2">{t('filter.noMatch')}</p></>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 🆕 휴지통 뷰 (그리드 스타일로 개편) */}
          {photoSubTab === 'trash' && (
            <div className="flex-1"> {/* 메인 그리드와 좌측 간격을 맞추기 위해 flex-1 적용 */}
              {trashedPhotos.length === 0 ? (
                <div className="text-center py-20 text-gray-400 border rounded-xl bg-gray-50">
                  <p className="text-lg mb-2">{t('photo.trashEmpty')}</p>
                  <p className="text-sm">삭제된 사진은 30일 동안 보관 후 영구 삭제됩니다.</p>
                </div>
              ) : (
                // 1. 3열 그리드, ProjectDetail 메인 그리드와 동일한 gap-4 적용
                <div className="grid grid-cols-5 gap-4">
                  {trashedPhotos.map(photo => {
                    const deletedDate = new Date(photo.deleted_at!)
                    const daysLeft = 30 - Math.floor((Date.now() - deletedDate.getTime()) / (1000 * 60 * 60 * 24))
                    
                    return (
                      <div key={photo.id} className="rounded overflow-hidden bg-transparent group relative shadow-sm">
                        {/* 이미지: 3:2 비율, object-contain (배경색 없이 깔끔하게) */}
                        <img 
                          src={photo.image_url} 
                          alt={photo.caption || ''} 
                          className="w-full aspect-[3/2] object-contain"
                        />

                        {/* 2. 호버 오버레이 (복구/삭제 버튼만 존재) */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 flex flex-col items-center justify-center gap-2 px-4 z-10">
                          <button
                            onClick={async () => {
                              await axios.post(`${API}/photos/${photo.id}/restore`)
                              // 💡 완벽한 동기화를 위해 fetch 추가 (앞선 대화 내용 반영)
                              await fetchTrash()
                              await fetchPhotos()
                              await fetchChapterPhotoIds()
                            }}
                            className="w-full text-center px-4 py-1.5 text-xs bg-white text-black rounded hover:bg-gray-200 font-medium shadow-lg"
                          >
                             ↺ {t('trash.restore')}
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(t('photo.confirmPermanentDelete'))) return
                              await axios.delete(`${API}/photos/${photo.id}/permanent`)
                              fetchTrash()
                            }}
                            className="w-full text-center px-4 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 font-medium shadow-lg"
                          >
                            ✕ {t('trash.permanentDelete')}
                          </button>
                        </div>

                        {/* 3. 하단 정보 영역 (캡션 등 불필요한 정보 제거, 메인 뷰와 높이만 통일) */}
                        <div className="p-2 bg-transparent flex items-center justify-center h-10">
                          <p className="text-xs text-red-400 font-medium">
                            {t('photo.autoDeleteIn', { days: daysLeft })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'story' && (
        // 변경 후 (onPhotoUpdate 추가)
        <ProjectStory 
          projectId={id!} 
          // 💡 휴지통에 있는 사진(deleted_at이 있는 사진)은 빼고 넘겨줍니다.
          allPhotos={photos.filter(p => !p.deleted_at)} 
          onChapterChange={() => fetchChapterPhotoIds()} 
          onPhotoUpdate={fetchPhotos} 
        />
      )}

      {DELIVERY_ENABLED && activeTab === 'delivery' && <DeliveryManager projectId={id!} />}

      {activeTab === 'notes' && (
        <div>
          <div className="mb-6">
            <textarea className="w-full border rounded px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-black"
              placeholder={t('note.placeholder')}
              rows={4} value={newNote} onChange={e => setNewNote(e.target.value)} />
            <button onClick={handleAddNote} className="bg-black text-white px-4 py-2 text-sm tracking-wider hover:bg-gray-800">
              {t('note.addNote')}
            </button>
          </div>
          <div className="space-y-4">
            {notes.map(note => (
              <div key={note.id} className="bg-white rounded-lg shadow p-4">
                {editingNote === note.id ? (
                  <div>
                    <textarea className="w-full border rounded px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-black"
                      rows={4} value={editContent} onChange={e => setEditContent(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateNote(note.id)} className="bg-black text-white px-3 py-1 text-xs hover:bg-gray-800">저장</button>
                      <button onClick={() => setEditingNote(null)} className="border px-3 py-1 text-xs hover:bg-gray-50">취소</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{note.content}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                      {new Date(note.updated_at).toLocaleString(
                        i18n.language?.startsWith('ko') ? 'ko-KR' : 'en-US', 
                        { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                      )}
                      </span>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingNote(note.id); setEditContent(note.content) }} className="text-xs text-gray-400 hover:text-black">{t('common.edit')}</button>
                        <button onClick={() => handleDeleteNote(note.id)} className="text-xs text-red-400 hover:text-red-600">{t('common.delete')}</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {notes.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg mb-2">{t('note.noNotes')}</p>
              <p className="text-sm">{t('note.noNotes2')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}