import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import exifr from 'exifr'

import ProjectStory from './ProjectStory'
import DeliveryManager from '../components/DeliveryManager'
import { useTranslation } from 'react-i18next'
import Heading from '../components/Heading' //
import ProjectNotes from './ProjectNotes'
import PhotoNotePanel from '../components/PhotoNotePanel'
import { useElectronSidebar } from '../context/ElectronSidebarContext'
import ConfirmModal from '../components/ConfirmModal'
import ToastNotification from '../components/ToastNotification'

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

interface ChapterResponse {
  id: string
  title: string
  parent_id: string | null
  order_num: number
}

interface ChapterPhotoResponse {
  photo_id: string
}

interface NoteResponse {
  id: string
  photo_id: string | null
}

interface Photo {
  id: string
  image_url: string
  caption: string
  caption_en: string
  folder: string | null
  original_filename?: string | null
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
  local_missing?: boolean
  deleted_at?: string | null 
}

// ── 라이트박스 ─────────────────────────────────────────────
function Lightbox({
  photo, photos, colorLabels, chapterPhotoIds,
  onClose, onNavigate, onSetRating, onSetColorLabel, onSaveCaption,
  showExif, chapters, onAddToChapter, projectId,
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
  showExif: boolean
  chapters: { id: string; title: string; parent_id?: string | null; order_num?: number }[]
  onAddToChapter: (photoId: string, chapterId: string) => void
  projectId: string
}) {
  const idx = photos.findIndex(p => p.id === photo.id)
  const [editingCaption, setEditingCaption] = useState(false)
  const [showChapterMenu, setShowChapterMenu] = useState(false)
  const [captionDraft, setCaptionDraft] = useState(photo.caption || '')
  const [showNotePanel, setShowNotePanel] = useState(false)
  const { t, i18n } = useTranslation()

  const [hoverRating, setHoverRating] = useState<{ id: string, star: number } | null>(null);

  useEffect(() => {
    setEditingCaption(false)
    setCaptionDraft(photo.caption || '')
    setShowNotePanel(false)
    setShowChapterMenu(false)
  }, [photo.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
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
      <div className="flex items-center justify-between px-6 py-3 shrink-0" style={{ paddingTop: window.racconto ? '2rem' : undefined }} onClick={e => e.stopPropagation()}>
        <span className="text-white/50 text-sm">{idx + 1} / {photos.length}</span>
        {photo.local_missing && (
          <span className="text-yellow-400 text-xs font-bold px-2 py-0.5 bg-yellow-400/20 rounded-full">
            ⚠️ {t('project.noLocalFile')}
          </span>
        )}
        <button onClick={onClose} className="text-white/70 hover:text-white text-2xl p-3">✕</button>
      </div>

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

      <div className="shrink-0 bg-black/80 border-t border-white/10 px-6 py-4" onClick={e => e.stopPropagation()}>
        <div className="max-w-[calc(100%-8rem)] mx-auto space-y-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div 
              className="flex gap-1"
              onMouseLeave={() => setHoverRating(null)} // 마우스가 별점 영역을 벗어나면 초기화
            >
              {[1, 2, 3, 4, 5].map(star => {
                // 1. 현재 마우스가 올라간 사진인지 확인
                const isHoveringThis = hoverRating?.id === photo.id;
                // 2. 현재 마우스가 위치한 별(star)보다 작거나 같은 번호인지 확인
                const isHoveredStar = isHoveringThis && hoverRating.star >= star;
                // 3. 기존에 확정된 평점인지 확인
                const isRatedStar = photo.rating && photo.rating >= star;

                // 색상 결정 로직
                let colorClass = 'text-white/20'; // 기본 회색 (비활성)
                if (isHoveredStar) {
                  colorClass = 'text-yellow-300'; // 마우스 오버 시 채워지는 색상
                } else if (!isHoveringThis && isRatedStar) {
                  colorClass = 'text-yellow-400'; // 기존 저장된 평점 색상 (마우스 오버 중이 아닐 때만 표시)
                }

                return (
                  <button 
                    key={star} 
                    onMouseEnter={() => setHoverRating({ id: photo.id, star })}
                    onClick={() => onSetRating(photo, star)}
                    className={`text-xl transition-colors ${colorClass}`}
                  >
                    ★
                  </button>
                )
              })}
            </div>
            <div className="w-px h-5 bg-white/20" />
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
              {/* 💡 부모 div에 flex items-center를 주어 수직 중앙 정렬 기반 마련 */}
              <div className="relative flex items-center">
                {inChapter ? (
                  /* 💡 버튼과 동일한 패딩(px-2 py-1)과 투명 보더(border-transparent)를 주어 박스 크기를 똑같이 맞춥니다 */
                  <span className="flex items-center text-xs text-blue-400 px-2 py-1 border border-transparent">
                    📖 {t('story.chapterIncl')}
                  </span>
                ) : (
                  /* 💡 버튼에도 flex items-center를 주어 이모지와 텍스트의 중심을 완벽히 맞춥니다 */
                  <button
                    onClick={() => setShowChapterMenu(v => !v)}
                    className="flex items-center text-xs px-2 py-1 border border-white/20 text-white/60 hover:text-white hover:border-white/50 rounded transition-colors"
                  >
                    📖 {t('story.addToChapter')}
                  </button>
                )}
                {showChapterMenu && !inChapter && (
                  <div className="absolute bottom-8 left-0 bg-white rounded shadow-lg z-50 min-w-[180px] py-1">
                    {chapters.length === 0 ? (
                      <p className="text-xs text-gray-400 px-3 py-2">{t('story.noChapters')}</p>
                    ) : (
                      chapters
                        .filter(c => !c.parent_id)
                        .map((parent, parentIdx) => (
                          <>
                            <button
                              key={parent.id}
                              onClick={() => {
                                onAddToChapter(photo.id, parent.id)
                                setShowChapterMenu(false)
                              }}
                              className="w-full text-left text-xs px-3 py-2 hover:bg-gray-100 text-gray-700 font-medium"
                            >
                              {t('story.chapter')} {parentIdx + 1}. {parent.title}
                            </button>
                            {chapters
                              .filter(c => c.parent_id === parent.id)
                              .map((child, childIdx) => (
                                <button
                                  key={child.id}
                                  onClick={() => {
                                    onAddToChapter(photo.id, child.id)
                                    setShowChapterMenu(false)
                                  }}
                                  className="w-full text-left text-xs px-3 py-2 hover:bg-gray-100 text-gray-500 pl-6"
                                >
                                  ↳ {t('story.chapter')} {parentIdx + 1}.{childIdx + 1}. {child.title}
                                </button>
                              ))
                            }
                          </>
                        ))
                    )}
                  </div>
                )}
              </div>
              <div className="w-px h-5 bg-white/20" />
              <button
                onClick={() => setShowNotePanel(v => !v)}
                className={`text-xs px-2 py-1 border rounded transition-colors ${
                  showNotePanel
                    ? 'border-white/50 text-white'
                    : 'border-white/20 text-white/60 hover:text-white hover:border-white/50'
                }`}
              >
                📝 {t('note.title')}
              </button>
            {showExif && (photo.camera || photo.focal_length || photo.taken_at) && (
              <>
                <div className="w-px h-5 bg-white/20" />
                <span className="text-xs text-white/40">
                  {[
                    photo.taken_at ? new Date(photo.taken_at).toLocaleDateString(
                      i18n.language === 'ko' ? 'ko-KR' : 'en-US'
                    ) : null,
                    photo.camera,
                    photo.lens,
                    photo.focal_length,
                    photo.aperture,
                    photo.shutter_speed,
                    photo.iso,
                  ].filter(Boolean).join(' · ')}
                </span>
              </>
            )}
          </div>
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
      {showNotePanel && (
        <PhotoNotePanel
          photoId={photo.id}
          projectId={projectId}
          onClose={() => setShowNotePanel(false)}
        />
      )}
    </div>
  )
}

// ── PhotoCard (💡 여기에 챕터 버튼이 100% 안전하게 들어있습니다!) ──────────────────────────────────────────
function PhotoCard({
  photo, project, editingCaption, captionKo, setCaptionKo, setEditingCaption,
  onSetCover, onDelete, onSaveCaption, onSetRating, onSetColorLabel,
  onOpenLightbox, showExif, gridCols, colorLabels, chapterPhotoIds, onShowChapterMenu
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
  onShowChapterMenu: (photoId: string) => void
}) {
  const { t, i18n } = useTranslation()

  return (
    <div className="rounded overflow-hidden bg-gray-100">
      <div className="relative group">
        <img
          src={photo.image_url} alt={photo.caption}
          className="w-full aspect-[3/2] object-contain cursor-pointer"
          onClick={() => onOpenLightbox(photo)}
        />

        {photo.local_missing && (
          <div className="absolute top-2 left-2 z-10 bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            ⚠️ {t('project.noLocalFile')}
          </div>
        )}

        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute inset-0 bg-black/50" onClick={() => onOpenLightbox(photo)} />
          <div className="absolute bottom-2 right-2 flex gap-1 z-10">
            <button
              onClick={e => { e.stopPropagation(); onSetCover(photo) }}
              className={`${gridCols >= 4 ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-xs'} rounded ${project?.cover_image_url === photo.image_url ? 'bg-yellow-400 text-black' : 'bg-white text-black'}`}>
              {project?.cover_image_url === photo.image_url ? t('photo.isCover') : t('photo.setCover')}
            </button>
            {/* 💡 chapters.length > 0 조건을 지워서 항상 아이콘이 나오게 수정! */}
            {chapterPhotoIds.has(photo.id) ? (
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
            )}
            <button
              onClick={e => { e.stopPropagation(); onDelete(photo.id) }}
              className="w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded-full text-xs font-bold">
              ✕
            </button>
          </div>
        </div>
      </div>

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
          <input className="w-full border rounded px-2 py-1 text-xs mb-1" placeholder={t('photo.addCaption')}
            value={captionKo} onChange={e => setCaptionKo(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { onSaveCaption(photo); setEditingCaption(null) }
              if (e.key === 'Escape') setEditingCaption(null)
            }} />
          <div className="flex gap-1">
            <button onClick={() => onSaveCaption(photo)} className="bg-black text-white px-2 py-1 text-xs">{t('common.save')}</button>
            <button onClick={() => setEditingCaption(null)} className="border px-2 py-1 text-xs">{t('common.cancel')}</button>
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
          <div className="border-t pt-1.5 mt-1 space-y-0.5">
            {photo.taken_at && (
              <p className="text-xs text-gray-400">
                {new Date(photo.taken_at).toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : 'en-US')}
                {photo.camera && <span className="text-gray-300"> · </span>}
                {photo.camera && <span>{photo.camera}</span>}
              </p>
            )}
            {!photo.taken_at && photo.camera && (
              <p className="text-xs text-gray-400">{photo.camera}</p>
            )}
            {photo.lens && (
              <p className="text-xs text-gray-400">{photo.lens}</p>
            )}
            {(photo.focal_length || photo.aperture || photo.shutter_speed || photo.iso) && (
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
export default function ProjectDetail({
    electronTab,
  }: {
    electronTab?: 'photos' | 'story' | 'notes'
  }) {
  const { t } = useTranslation()

  const { id } = useParams()
  const [numericId, setNumericId] = useState<string | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const { setSidebarContent, triggerRefresh, uploadInProgress: uploading, setUploadInProgress: setUploading } = useElectronSidebar()

  const [activeTab, setActiveTab] = useState<'photos' | 'story' | 'notes' | 'delivery'>('photos')

  const isElectron = !!window.racconto

  const [photoSubTab, setPhotoSubTab] = useState<'all' | 'folder' | 'trash'>('all')
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
  const [chapters, setChapters] = useState<{ id: string; title: string; parent_id?: string | null; order_num?: number }[]>([])
  const [sortBy, setSortBy] = useState<'default' | 'taken_at' | 'name'>('default')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [deletingMissing, setDeletingMissing] = useState(false)
  const [deletingTrash, setDeletingTrash] = useState(false)
  const [photoNoteIds, setPhotoNoteIds] = useState<Set<string>>(new Set())
  const [filterHasNote, setFilterHasNote] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, type })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  const fetchPhotos = async () => {
    if (!numericId) return
    const res = await axios.get(`${API}/photos/?project_id=${numericId}`)
    setPhotos(res.data)
  }

  const fetchTrash = async () => {
    if (!numericId) return
    const res = await axios.get(`${API}/photos/trash/${numericId}`)
    setTrashedPhotos(res.data)
  }

  const fetchChapterPhotoIds = async () => {
    if (!numericId) return
    const res = await axios.get(`${API}/chapters/?project_id=${numericId}`)
    const chapters: ChapterResponse[] = res.data
    setChapters(
      chapters
        .sort((a, b) => a.order_num - b.order_num)
        .map(c => ({ id: c.id, title: c.title, parent_id: c.parent_id, order_num: c.order_num }))
    )
    const photoResults = await Promise.all(
      chapters.map(c => axios.get<ChapterPhotoResponse[]>(`${API}/chapters/${c.id}/photos`))
    )
    const ids = new Set<string>()
    photoResults.forEach(r => r.data.forEach(cp => ids.add(cp.photo_id)))
    setChapterPhotoIds(ids)
  }

  const fetchPhotoNoteIds = async () => {
    if (!numericId) return
    const res = await axios.get(`${API}/notes/?project_id=${numericId}`)
    const ids = new Set<string>(
      (res.data as NoteResponse[])
        .filter(n => n.photo_id)
        .map(n => n.photo_id as string)
    )
    setPhotoNoteIds(ids)
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

      // 💡 설정에서 지정한 기본 정렬 기준 불러오기!
      if (res.data['default_sort_by']) {
        setSortBy(res.data['default_sort_by'])
      }

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
    setNumericId(null)
    axios.get(`${API}/projects/${id}`).then(res => {
      setProject(res.data)
      setNumericId(String(res.data.id))
    })
  }, [id])

  useEffect(() => {
    if (!numericId) return
    fetchPhotos()
    fetchTrash()
    fetchPhotoNoteIds()
  }, [numericId])

  useEffect(() => { if (numericId) fetchChapterPhotoIds() }, [numericId])

  useEffect(() => {
    if (!window.racconto) return
    window.racconto.onDeletedFile((filePath: string) => {
      const filename = filePath.split('/').pop()
      setPhotos(prev => prev.map(p =>
        p.original_filename === filename ? { ...p, local_missing: true } : p
      ))
    })
    return () => window.racconto?.offDeletedFile?.()
  }, [])

  // Electron일 때 사이드바 탭과 동기화
  useEffect(() => {
    if (isElectron && electronTab) {
      setActiveTab(electronTab)
      if (electronTab === 'photos') {
        setPhotoSubTab('all')
        setFilterFolder(null)
      }
    }
  }, [electronTab])

  const resizeImage = (file: File): Promise<Blob> => {
    const MAX_SIZE = 2400
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const { width, height } = img
        let newW = width, newH = height
        if (Math.max(width, height) > MAX_SIZE) {
          if (width >= height) {
            newW = MAX_SIZE
            newH = Math.round(height * MAX_SIZE / width)
          } else {
            newH = MAX_SIZE
            newW = Math.round(width * MAX_SIZE / height)
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = newW
        canvas.height = newH
        canvas.getContext('2d')!.drawImage(img, 0, 0, newW, newH)
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error('toBlob failed')),
          'image/jpeg',
          0.88
        )
      }
      img.onerror = reject
      img.src = url
    })
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !id) return
    setUploading(true)

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    const validFiles = Array.from(e.target.files).filter(file => allowedTypes.includes(file.type))

    if (validFiles.length !== e.target.files.length) {
      console.warn(t('photo.upload.ExlcudeWarning', { count: e.target.files.length - validFiles.length }))
    }

    let failedCount = 0
    let successCount = 0
    let limitExceeded = false
    for (const file of validFiles) {
      try {
        // 1. EXIF 추출 (리사이즈 전 원본에서)
        const exifData: Record<string, string> = {}
        try {
          const parsed = await exifr.parse(file, {
            pick: ['DateTimeOriginal', 'Make', 'Model', 'LensModel',
                   'ISO', 'ExposureTime', 'FNumber', 'FocalLength',
                   'GPSLatitude', 'GPSLongitude']
          })
          if (parsed) {
            if (parsed.DateTimeOriginal) exifData.taken_at = new Date(parsed.DateTimeOriginal).toISOString()
            if (parsed.Make || parsed.Model) exifData.camera = `${parsed.Make || ''} ${parsed.Model || ''}`.trim()
            if (parsed.LensModel) exifData.lens = parsed.LensModel
            if (parsed.ISO) exifData.iso = `ISO ${parsed.ISO}`
            if (parsed.ExposureTime) exifData.shutter_speed = parsed.ExposureTime < 1
              ? `1/${Math.round(1 / parsed.ExposureTime)}s`
              : `${parsed.ExposureTime.toFixed(1)}s`
            if (parsed.FNumber) exifData.aperture = `f/${parsed.FNumber.toFixed(1)}`
            if (parsed.FocalLength) exifData.focal_length = `${Math.round(parsed.FocalLength)}mm`
            if (parsed.GPSLatitude) exifData.gps_lat = String(parsed.GPSLatitude)
            if (parsed.GPSLongitude) exifData.gps_lng = String(parsed.GPSLongitude)
          }
        } catch {
          // EXIF 추출 실패 무시
        }

        // 2. Canvas 리사이즈 (장변 2400px, JPEG q88)
        const resizedBlob = await resizeImage(file)

        // 3. CF 업로드 URL 발급 (photo_limit 체크 포함)
        const { data: urlData } = await axios.get(`${API}/photos/cf-upload-url`)
        const { uploadURL } = urlData

        // 4. CF에 직접 업로드
        const formData = new FormData()
        formData.append('file', resizedBlob, file.name)
        const cfRes = await fetch(uploadURL, { method: 'POST', body: formData })
        const cfData = await cfRes.json()
        if (!cfData.success) throw new Error('CF upload failed')
        const imageUrl = cfData.result.variants[0]

        // 5. 메타데이터 저장
        const relativePath = (file as any).webkitRelativePath
        const folder = relativePath ? relativePath.split('/')[0] : null
        await axios.post(`${API}/photos/`, {
          project_id: numericId,
          image_url: imageUrl,
          folder,
          original_filename: file.name,
          source: 'web',
          ...exifData,
        })
        successCount++

      } catch (error) {
        console.error(`❌ ${file.name} ${t('photo.uploadFail')}:`, error)

        const status = (error as any)?.response?.status
        const detail = (error as any)?.response?.data?.detail
        const code = typeof detail === 'object' ? detail.code : detail

        if (status === 401) {
          break
        } else if (code === 'PHOTO_LIMIT_EXCEEDED') {
          limitExceeded = true
          break
        } else {
          failedCount++
        }
      }
    }

    if (limitExceeded) {
      if (successCount > 0) {
        showToast(t('photo.upload.limitExceededPartial', { success: successCount }), 'warning')
      } else {
        showToast(t('photo.upload.limitExceeded'), 'warning')
      }
    } else if (failedCount > 0) {
      showToast(t('photo.upload.fail', { count: failedCount }), 'error')
    } else if (successCount > 0) {
      showToast(t('photo.upload.success', { count: successCount }), 'success')
    }

    try {
      await fetchPhotos()
    } catch {
      // 로그아웃 등으로 fetchPhotos 실패해도 uploading은 반드시 해제
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // ProjectDetail.tsx 내부의 handleSetCover 수정
  const handleSetCover = async (photo: Photo) => {
    // 1. project 데이터와 numericId(UUID)가 모두 있을 때만 실행
    if (!project || !numericId) return

    const statusValue = typeof project.status === 'object' 
      ? (project.status as { value: string }).value 
      : project.status

    try {
      // 2. 수정 API 호출 시 id(슬러그) 대신 numericId(UUID) 사용
      await axios.put(`${API}/projects/${numericId}`, {
        title: project.title, 
        title_en: project.title_en,
        description: project.description, 
        description_en: project.description_en,
        location: project.location, 
        is_public: project.is_public,
        status: statusValue, 
        cover_image_url: photo.image_url
      })

      // 3. 정보 갱신을 위한 GET 요청에서도 numericId 사용
      const res = await axios.get(`${API}/projects/${numericId}`)
      setProject(res.data)
      
      // 4. 화면 리프레시 트리거
      triggerRefresh()
    } catch (error) {
      console.error('Failed to set cover image:', error)
      // 필요 시 alert(t('photo.error.SaveFailedAlert')) 추가
    }
  }

  const handleRemoveCover = async () => {
    if (!project) return
    const statusValue = typeof project.status === 'object' ? (project.status as { value: string }).value : project.status
    await axios.put(`${API}/projects/${numericId}`, {
      title: project.title, title_en: project.title_en,
      description: project.description, description_en: project.description_en,
      location: project.location, is_public: project.is_public,
      status: statusValue, cover_image_url: null
    })
    const res = await axios.get(`${API}/projects/${numericId}`)
    setProject(res.data)
    triggerRefresh()
  }

  const handleDeletePhoto = async (photoId: string) => {
    // 1. 에러 시 롤백을 위한 상태 백업
    const prevPhotos = [...photos];
    const prevTrash = [...trashedPhotos];
    const photoToDelete = photos.find(p => p.id === photoId);

    // 2. ⚡️ 낙관적 업데이트: 서버 대기 없이 화면부터 즉시 변경 (딜레이 제로)
    if (lightboxPhoto?.id === photoId) setLightboxPhoto(null);
    
    setPhotos(prev => prev.filter(p => p.id !== photoId));
    
    if (photoToDelete) {
      setTrashedPhotos(prev => [
        ...prev, 
        { ...photoToDelete, deleted_at: new Date().toISOString() }
      ]);
    }
    
    try {
      // 3. 서버에 삭제 요청 
      await axios.delete(`${API}/photos/${photoId}`);

      // 4. 백그라운드 데이터 동기화 (UI를 멈추지 않음)
      // 화면은 이미 바뀌었으므로, 사진 수 등 부수적인 데이터만 조용히 최신화합니다.
      // 여러 API를 순서대로 기다리지 않고 Promise.all로 한 번에 병렬 처리합니다.
      Promise.all([
        axios.get(`${API}/projects/${numericId}`).then(res => setProject(res.data)),
        fetchChapterPhotoIds(),
        fetchPhotoNoteIds()
      ]);
      
      // 🔥 주의: fetchPhotos()와 fetchTrash()는 2번에서 UI를 이미 변경했으므로 제거했습니다. 
      // 이렇게 하면 서버 부하도 줄고 훨씬 빠릅니다.

    } catch (error) {
      console.error("사진 삭제 실패:", error);
      
      // 5. 서버 에러 시 화면을 원래대로 복구 (롤백)
      setPhotos(prevPhotos);
      setTrashedPhotos(prevTrash);
      // (선택) showToast(t('common.error'), 'error'); 
    }
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

  const handleClearRatings = () => {
    setConfirmModal({
      message: t('actions.resetRatingsConfirm'),
      onConfirm: async () => {
        setConfirmModal(null)
        await Promise.all(
          photos.filter(p => p.rating !== null).map(p => axios.put(`${API}/photos/${p.id}`, { ...p, rating: null }))
        )
        fetchPhotos()
      },
    })
  }

  const handleClearColorLabels = () => {
    setConfirmModal({
      message: t('actions.resetColorsConfirm'),
      onConfirm: async () => {
        setConfirmModal(null)
        await Promise.all(
          photos.filter(p => p.color_label !== null).map(p => axios.put(`${API}/photos/${p.id}`, { ...p, color_label: null }))
        )
        fetchPhotos()
      },
    })
  }

  const handleDeleteAllMissing = () => {
    const missingPhotos = photos.filter(p => p.local_missing && !p.deleted_at)
    if (missingPhotos.length === 0) return
    setConfirmModal({
      message: t('photo.local.deleteMissingConfirm', { count: missingPhotos.length }),
      onConfirm: async () => {
        setConfirmModal(null)
        setDeletingMissing(true)
        try {
          await axios.delete(`${API}/photos/bulk-delete`, {
            data: { photo_ids: missingPhotos.map(p => p.id) }
          })
          await fetchPhotos()
          await fetchTrash()
          await fetchChapterPhotoIds()
          await fetchPhotoNoteIds()
          await axios.get(`${API}/projects/${numericId}`).then(res => setProject(res.data))
        } finally {
          setDeletingMissing(false)
        }
      },
    })
  }

  const handleDeleteAllTrash = () => {
    if (trashedPhotos.length === 0) return
    setConfirmModal({
      message: t('photo.trashComment.DeleteAllConfirm', { count: trashedPhotos.length }),
      onConfirm: async () => {
        setConfirmModal(null)
        setDeletingTrash(true)
        try {
          await axios.delete(`${API}/photos/bulk-permanent`, {
            data: { photo_ids: trashedPhotos.map(p => p.id) }
          })
          await fetchTrash()
        } catch (error) {
          console.error(error)
        } finally {
          setDeletingTrash(false)
        }
      },
    })
  }

  const handleSaveCaption = async (photo: Photo) => {
    await axios.put(`${API}/photos/${photo.id}`, { ...photo, caption: captionKo })
    setEditingCaption(null)
    fetchPhotos()
  }

  const handleDeleteFolder = (folder: string) => {
    const folderPhotos = photos.filter(p => p.folder === folder && !p.deleted_at)
    setConfirmModal({
      message: t('filter.deleteFolderConfirm', { folder, count: folderPhotos.length }),
      onConfirm: async () => {
        setConfirmModal(null)
        await axios.delete(`${API}/photos/bulk-delete`, {
          data: { photo_ids: folderPhotos.map(p => p.id) }
        })
        if (filterFolder === folder) setFilterFolder(null)
        await fetchPhotos()
        await fetchTrash()
        await fetchChapterPhotoIds()
        await fetchPhotoNoteIds()
        await axios.get(`${API}/projects/${numericId}`).then(res => setProject(res.data))
      },
    })
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

  // 변경 후
  const colorLabels = useMemo(() => [
    { value: 'red',    color: 'bg-red-500',    label: labelSettings['color_label_red'] },
    { value: 'yellow', color: 'bg-yellow-400', label: labelSettings['color_label_yellow'] },
    { value: 'green',  color: 'bg-green-500',  label: labelSettings['color_label_green'] },
    { value: 'blue',   color: 'bg-blue-500',   label: labelSettings['color_label_blue'] },
    { value: 'purple', color: 'bg-purple-500', label: labelSettings['color_label_purple'] },
  ], [labelSettings])

  const filteredPhotos = photos.filter(photo => {
    if (photo.deleted_at) return false

    if (filterRating !== null) {
      if (filterRating === 0) { if (photo.rating !== null) return false }
      else { if (photo.rating !== filterRating) return false }
    }
    if (filterColor !== null && photo.color_label !== filterColor) return false
    if (filterFolder !== null && photo.folder !== filterFolder) return false
    if (filterHasNote && !photoNoteIds.has(photo.id)) return false
    return true
  }).sort((a, b) => {
    let result = 0
    if (sortBy === 'taken_at') {
      if (!a.taken_at && !b.taken_at) result = 0
      else if (!a.taken_at) result = 1
      else if (!b.taken_at) result = -1
      else result = new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime()
    } else if (sortBy === 'name') {
      const nameA = a.original_filename || ''
      const nameB = b.original_filename || ''
      result = nameA.localeCompare(nameB)
    } else {
      result = (a.order ?? 0) - (b.order ?? 0)
    }
    return sortOrder === 'desc' ? -result : result
  })

  const missingCount = photos.filter(p => p.local_missing && !p.deleted_at).length;

  useEffect(() => {
    if (!isElectron) return
    if (activeTab !== 'photos') return

    setSidebarContent(
      <div className="p-4">
        {/* 업로드 버튼 */}
        <div className="mb-3 flex gap-2">
          <label className={`flex-1 cursor-pointer bg-black text-white px-1.5 py-1.5 text-xs tracking-wider hover:bg-gray-800 inline-flex items-center justify-center gap-1 rounded ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}>
            {uploading ? (
              <>
                <svg className="animate-spin w-3 h-3 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                {t('photo.uploading')}
              </>
            ) : t('photo.uploadPhotos')}
            <input type="file" accept="image/jpeg, image/png, image/webp" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
          <label className={`flex-1 cursor-pointer bg-gray-700 text-white px-1.5 py-1.5 text-xs tracking-wider hover:bg-gray-600 inline-flex items-center justify-center gap-1 rounded ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}>
            {uploading ? (
              <>
                <svg className="animate-spin w-3 h-3 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                {t('photo.uploading')}
              </>
            ) : t('photo.uploadFolder')}
            <input type="file" accept="image/jpeg, image/png, image/webp" multiple className="hidden" onChange={handleUpload} disabled={uploading} {...{ webkitdirectory: '' } as any} />
          </label>
        </div>

        {/* 라이브러리 */}
        <div className="mb-2">
          <p className="text-xs font-semibold text-gray-500 mb-2">{t('photo.library')}</p>
          <div className="flex flex-col gap-1">
            {/* 전체 사진 */}
            <button onClick={() => { setPhotoSubTab('all'); setFilterFolder(null); }}
              className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center justify-between ${photoSubTab === 'all' ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
              <span>{t('photo.allPhotos')}</span>
              <span className={photoSubTab === 'all' ? 'text-gray-300' : 'text-gray-400'}>{photos.filter(p => !p.deleted_at).length}</span>
            </button>
              {/* 서브 폴더 리스트 */}
              {photos.some(p => p.folder) && (
              <div>
                  {[...new Set(photos.filter(p => p.folder).map(p => p.folder))].map(folder => (
                  <div key={folder} className={`flex items-center rounded ${filterFolder === folder ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                    <button onClick={() => {
                      setFilterFolder(filterFolder === folder ? null : folder!);
                      setPhotoSubTab(filterFolder === folder ? 'all' : 'folder');
                    }}
                      className="flex-1 text-left px-2 py-1 text-xs flex items-center justify-between min-w-0">
                      <span className="flex items-center gap-1 min-w-0"><span className="shrink-0">📁</span><span className="truncate">{folder}</span></span>
                      <span className={`shrink-0 ml-2 ${filterFolder === folder ? 'text-gray-300' : 'text-gray-400'}`}>{photos.filter(p => p.folder === folder && !p.deleted_at).length}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteFolder(folder!)}
                      className={`shrink-0 px-1.5 py-1 text-xs ${filterFolder === folder ? 'text-gray-400 hover:text-white' : 'text-gray-300 hover:text-red-500'}`}
                      title={t('photo.trash')}
                    >🗑</button>
                  </div>
                ))}
              </div>
              )}
            {/* 지운 사진 */}
            <button onClick={() => { setPhotoSubTab('trash'); fetchTrash() }}
              className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center justify-between ${photoSubTab === 'trash' ? 'bg-red-600 text-white' : 'hover:bg-red-50 text-gray-700'}`}>
              <span>{t('photo.trash')}</span>
              <span className={photoSubTab === 'trash' ? 'text-red-200' : 'text-gray-400'}>{trashedPhotos.length}</span>
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100 my-2" />

        {/* 뷰 설정 */}
        <div className="mt-2 mb-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 mr-3 shrink-0">{t('filter.view')}</p>
            <div className="flex gap-1 flex-1">
              {[{ cols: 2, icon: '2' }, { cols: 3, icon: '3' }, { cols: 4, icon: '4' }].map(({ cols, icon }) => (
                <button key={cols} onClick={() => setGridCols(cols)}
                  className={`flex-1 py-1 text-xs rounded ${gridCols === cols ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{icon}</button>
              ))}
            </div>
          </div>
        </div>

        {/* 정렬 */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500">{t('photo.listOrder')}</p>
            <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="text-xs text-gray-500 hover:text-black">{sortOrder === 'asc' ? '↑' : '↓'}</button>
          </div>
          <div className="flex gap-1">
            {[['default', t('photo.orderUpload')], ['taken_at', t('photo.orderTaken')], ['name', t('photo.orderName')]].map(([key, label]) => (
              <button key={key} onClick={() => setSortBy(key as any)}
                className={`flex-1 text-center py-1 text-[11px] rounded ${sortBy === key ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{label}</button>
            ))}
          </div>
        </div>

        {/* EXIF */}
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 mr-3 shrink-0">{t('filter.exifOnOff')}</p>
          <div className="flex gap-1 flex-1">
            <button onClick={() => setShowExif(true)}
              className={`flex-1 py-1 text-xs rounded ${showExif ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>On</button>
            <button onClick={() => setShowExif(false)}
              className={`flex-1 py-1 text-xs rounded ${!showExif ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>Off</button>
          </div>
        </div>

        <div className="border-t border-gray-100 my-2" />

        {/* 노트 필터 */}
        <button onClick={() => setFilterHasNote(!filterHasNote)}
          className={`w-full text-left px-2 py-3 text-xs rounded flex items-center justify-between ${filterHasNote ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
          <span>📝 {t('photo.hasNote')}</span>
          <span className={filterHasNote ? 'text-gray-300' : 'text-gray-400'}>{photos.filter(p => !p.deleted_at && photoNoteIds.has(p.id)).length}</span>
        </button>

        {/* 별점 필터 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500">{t('filter.rating')}</p>
            <button onClick={handleClearRatings} className="text-xs text-gray-400 hover:text-red-500">{t('common.reset')}</button>
          </div>
          {[5, 4, 3, 2, 1].map(star => (
            <button key={star} onClick={() => setFilterRating(filterRating === star ? null : star)}
              className={`w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between ${filterRating === star ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
              <span>{'★'.repeat(star)}{'☆'.repeat(5 - star)}</span>
              <span className="text-gray-400">{photos.filter(p => p.rating === star).length}</span>
            </button>
          ))}
          <button onClick={() => setFilterRating(filterRating === 0 ? null : 0)}
            className={`w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between ${filterRating === 0 ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
            <span className="text-gray-400">{t('filter.unrated')}</span>
            <span className="text-gray-400">{photos.filter(p => !p.rating).length}</span>
          </button>
        </div>

        {/* 컬러 레이블 필터 */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500">{t('filter.colors')}</p>
            <button onClick={handleClearColorLabels} className="text-xs text-gray-400 hover:text-red-500">{t('common.reset')}</button>
          </div>
          {colorLabels.map(label => (
            <button key={label.value} onClick={() => setFilterColor(filterColor === label.value ? null : label.value)}
              className={`w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between ${filterColor === label.value ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
              <span className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full ${label.color}`} />{label.label}</span>
              <span className="text-gray-400">{photos.filter(p => p.color_label === label.value).length}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }, [isElectron, activeTab, photoSubTab, photos, trashedPhotos, uploading, gridCols, sortBy, sortOrder, showExif, filterRating, filterColor, filterFolder, filterHasNote, photoNoteIds, colorLabels, t])


  if (!project) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className={`${isElectron ? 'w-full' : 'max-w-7xl mx-auto'} p-6`}>
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          dangerous
        />
      )}
      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
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
          showExif={showExif}
          chapters={chapters}
          projectId={numericId!}
          onAddToChapter={async (photoId, chapterId) => {
            await axios.post(`${API}/chapters/${chapterId}/photos`, { photo_id: photoId })
            await fetchChapterPhotoIds()
          }}
        />
      )}

      {!isElectron && (
        <Link to="/projects" className="text-sm text-gray-400 hover:text-black">
          {t('nav.backToProjects')}
        </Link>
      )}

      <div className="mb-4 flex items-start justify-between gap-6">
        <div className="flex-1">
          <Heading level={2} className="mb-2">
            {project.title}
          </Heading>
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

      {chapterMenuPhoto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={() => setChapterMenuPhoto(null)}>
          <div className="bg-white rounded-xl p-5 shadow-2xl min-w-[320px]" onClick={e => { e.stopPropagation() }}>
            <h3 className="text-sm font-semibold mb-3">{t('story.selectChapter')}</h3>
            <div className="space-y-1">
            {chapters.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs">
                <p>{t('story.noChapter')}</p>
                <p className="mt-1">{t('story.noChapter2')}</p>
              </div>
            ) : (
              // 1. 부모 챕터(parent_id가 없는 것)만 먼저 골라서 순회합니다.
              chapters.filter(c => !c.parent_id).map((parent, idx) => (
                <div key={parent.id} className="flex flex-col mb-1">
                  
                  {/* 부모 챕터 UI */}
                  <button
                    onClick={() => handleAddToChapter(chapterMenuPhoto!, parent.id)}
                    className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 text-gray-800 font-medium flex items-center">
                    <span className="text-gray-400 text-xs mr-2 shrink-0">{t('story.chapter')}. {idx + 1}</span>
                    <span className="truncate">{parent.title}</span>
                  </button>
                  
                  {/* 2. 현재 부모 챕터에 속한 서브챕터들만 골라서 들여쓰기(↳) 렌더링 */}
                  {chapters.filter(child => child.parent_id === parent.id).map((child, subIdx) => (
                    <button key={child.id}
                      onClick={() => handleAddToChapter(chapterMenuPhoto!, child.id)}
                      className="w-full text-left pl-11 pr-3 py-1.5 text-sm rounded hover:bg-gray-100 text-gray-600 flex items-center">
                      <span className="text-gray-300 mr-2 text-xs shrink-0">↳ {t('story.chapter')}. {idx + 1}.{subIdx + 1}</span>
                      <span className="truncate">{child.title}</span>
                    </button>
                  ))}
                  
                </div>
              ))
            )}
            </div>
            <button onClick={() => setChapterMenuPhoto(null)}
              className="mt-3 w-full text-xs text-gray-400 hover:text-black">{t('common.close')}</button>
          </div>
        </div>
      )}

      <div className={`flex border-b mb-6 sticky top-14 z-30 bg-[#F7F4F0] ${isElectron ? 'hidden' : ''}`}>
        <button onClick={() => { 
            setActiveTab('photos'); 
            setPhotoSubTab('all');
            setFilterFolder(null);
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
      <div style={{ display: activeTab === 'photos' ? 'block' : 'none' }}>
        <div className="flex gap-6 items-start">
          
          {/* 👈 좌측 사이드바 (필터 & 라이브러리 통합) */}
          <div className={`${isElectron ? 'hidden' : ''} ${showFilter ? 'w-48' : 'w-6'} shrink-0 transition-all duration-200`}>
            <button onClick={() => setShowFilter(!showFilter)}
              className="mb-2 text-gray-400 hover:text-black text-xs flex items-center gap-1">
              {showFilter ? '◀ ' + t('filter.filter') : '▶'}
            </button>

            {showFilter && (
              <div className="bg-white rounded-lg shadow p-4 overflow-y-auto max-h-[calc(100vh-2rem)] min-h-[calc(100vh-8rem)] sticky top-4">
                
                {/* 💡 flex-col을 지워서 가로 배치(flex-row 기본값)로 변경했습니다 */}
                <div className="mb-3 flex gap-2">
                  <label className={`flex-1 cursor-pointer bg-black text-white px-1.5 py-1.5 text-xs tracking-wider hover:bg-gray-800 inline-flex items-center justify-center gap-1 rounded ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    {uploading ? (
                      <>
                        <svg className="animate-spin w-3 h-3 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        {t('photo.uploading')}
                      </>
                    ) : t('photo.uploadPhotos')}
                    <input type="file" accept="image/jpeg, image/png, image/webp" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
                  </label>
                  <label className={`flex-1 cursor-pointer bg-gray-700 text-white px-1.5 py-1.5 text-xs tracking-wider hover:bg-gray-600 inline-flex items-center justify-center gap-1 rounded ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    {uploading ? (
                      <>
                        <svg className="animate-spin w-3 h-3 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        {t('photo.uploading')}
                      </>
                    ) : t('photo.uploadFolder')}
                    <input type="file" accept="image/jpeg, image/png, image/webp" multiple className="hidden" onChange={handleUpload} disabled={uploading} {...{ webkitdirectory: '' } as any} />
                  </label>
                </div>

                {/* 📂 새로 추가된 라이브러리 (기존 상단 가로 탭을 이쪽으로 이동) */}
                <div className="mb-2">
                  <p className="text-xs font-semibold text-gray-500 mb-2">{t('photo.library')}</p>
                  <div className="flex flex-col gap-1">
                    {/* 전체 사진 */}
                    <button 
                      onClick={() => { setPhotoSubTab('all'); setFilterFolder(null); }}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center justify-between ${photoSubTab === 'all' ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                      <span>{t('photo.allPhotos')}</span>
                      <span className={`${photoSubTab === 'all' ? 'text-gray-300' : 'text-gray-400'}`}>
                        {photos.filter(p => !p.deleted_at).length}
                      </span>
                    </button>
                    {/* 서브 폴더 리스트 */}
                    {photos.some(p => p.folder) && (
                    <div>
                        {[...new Set(photos.filter(p => p.folder).map(p => p.folder))].map(folder => (
                        <div key={folder} className={`flex items-center rounded ${filterFolder === folder ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                          <button onClick={() => {
                            setFilterFolder(filterFolder === folder ? null : folder!);
                            setPhotoSubTab(filterFolder === folder ? 'all' : 'folder');
                          }}
                            className="flex-1 text-left px-2 py-1 text-xs flex items-center justify-between min-w-0">
                            <span className="flex items-center gap-1 min-w-0"><span className="shrink-0">📁</span><span className="truncate">{folder}</span></span>
                            <span className={`shrink-0 ml-2 ${filterFolder === folder ? 'text-gray-300' : 'text-gray-400'}`}>{photos.filter(p => p.folder === folder && !p.deleted_at).length}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteFolder(folder!)}
                            className={`shrink-0 px-1.5 py-1 text-xs ${filterFolder === folder ? 'text-gray-400 hover:text-white' : 'text-gray-300 hover:text-red-500'}`}
                            title={t('photo.trash')}
                          >🗑</button>
                        </div>
                      ))}
                    </div>
                    )}
                    {/* 지운 사진 */}
                    <button 
                      onClick={() => { setPhotoSubTab('trash'); fetchTrash(); }}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center justify-between ${photoSubTab === 'trash' ? 'bg-red-600 text-white font-medium shadow-md' : 'hover:bg-red-50 text-gray-700'}`}
                    >
                      <span>{t('photo.trash')}</span>
                      <span className={`${photoSubTab === 'trash' ? 'text-red-200' : 'text-gray-400'}`}>
                        {trashedPhotos.length}
                      </span>
                    </button>
                  </div>
                </div>
                
                <div className="border-t border-gray-100 my-2"></div>

                <div className="mt-2 mb-2">
                  {/* 💡 flex를 사용해 라벨과 버튼 그룹을 한 줄로 만들었습니다! */}
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-500 mr-3 shrink-0">{t('filter.view')}</p>
                    <div className="flex gap-1 flex-1">
                      {/* 💡 cols: 1 (목록형) 옵션을 삭제했습니다! */}
                      {[{ cols: 2, icon: '2' }, { cols: 3, icon: '3' }, { cols: 4, icon: '4' }].map(({ cols, icon }) => (
                        <button key={cols} onClick={() => setGridCols(cols)}
                          className={`flex-1 py-1 text-xs rounded ${gridCols === cols ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{icon}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-500">{t('photo.listOrder')}</p>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="text-xs text-gray-500 hover:text-black flex items-center gap-0.5"
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setSortBy('default')}
                      className={`flex-1 text-center py-1 text-[11px] rounded tracking-tight ${sortBy === 'default' ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                      {t('photo.orderUpload')}
                    </button>
                    <button onClick={() => setSortBy('taken_at')}
                      className={`flex-1 text-center py-1 text-[11px] rounded tracking-tight ${sortBy === 'taken_at' ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                      {t('photo.orderTaken')}
                    </button>
                    <button onClick={() => setSortBy('name')}
                      className={`flex-1 text-center py-1 text-[11px] rounded tracking-tight ${sortBy === 'name' ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                      {t('photo.orderName')}
                    </button>
                  </div>
                </div>

                <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-500 mr-3 shrink-0">{t('filter.exifOnOff')}</p>
                    <div className="flex gap-1 flex-1">
                      <button onClick={() => setShowExif(true)}
                        className={`flex-1 py-1 text-xs rounded ${showExif ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                        On
                      </button>
                      <button onClick={() => setShowExif(false)}
                        className={`flex-1 py-1 text-xs rounded ${!showExif ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                        Off
                      </button>
                    </div>
                </div>
                
                <div className="border-t border-gray-100 my-2"></div>

                {/* 노트 필터 */}
                <button
                  onClick={() => setFilterHasNote(!filterHasNote)}
                  className={`w-full text-left px-2 py-3 text-xs rounded flex items-center justify-between ${
                    filterHasNote ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                <span>📝 {t('photo.hasNote')}</span>
                  <span className={`${filterHasNote ? 'text-gray-300' : 'text-gray-400'}`}>
                    {photos.filter(p => !p.deleted_at && photoNoteIds.has(p.id)).length}
                  </span>
                </button>

                {/* 별점 필터 */}
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

                {/* 컬러 레이블 필터 */}
                <div className="mb-2">
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

          {/* 👉 우측 메인 사진 갤러리 영역 */}
          <div className="flex-1 min-w-0">
            
            {/* 전체 사진 뷰 */}
            {(photoSubTab === 'all' || photoSubTab === 'folder')&& (
              <div>
                  {/* local_missing 일괄 삭제 버튼 — Electron 앱 + missing 사진 있을 때만 표시 */}
                  {/* ✅ photos.some 대신 missingCount > 0 으로 수정 */}
                  {missingCount > 0 && (
                    <div className="mb-4 flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2.5">
                      <p className="text-xs text-yellow-700">
                        {/* ✅ 하드코딩 제거 및 i18n 변수 적용 */}
                        ⚠️ {t('photo.local.MissingWarning', { count: missingCount })}
                      </p>
                      <button
                        onClick={handleDeleteAllMissing}
                        disabled={deletingMissing}
                        className="text-xs px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded disabled:opacity-50"
                      >
                        {deletingMissing ? t('photo.deleting') : t('photo.deleteAll')}
                      </button>
                    </div>
                  )}
                <div className={`grid gap-4 ${
                  gridCols === 2 ? 'grid-cols-2' : 
                  gridCols === 3 ? 'grid-cols-3' : 'grid-cols-4'
                }`}>
                  {filteredPhotos.map(photo => (
                    <PhotoCard
                      key={photo.id} photo={photo} project={project}
                      editingCaption={editingCaption} captionKo={captionKo}
                      setCaptionKo={setCaptionKo} setEditingCaption={setEditingCaption}
                      onSetCover={handleSetCover} 
                      onDelete={handleDeletePhoto} onSaveCaption={handleSaveCaption}
                      onSetRating={handleSetRating} onSetColorLabel={handleSetColorLabel}
                      onOpenLightbox={setLightboxPhoto}
                      onShowChapterMenu={setChapterMenuPhoto}
                      showExif={showExif} gridCols={gridCols}
                      colorLabels={colorLabels} chapterPhotoIds={chapterPhotoIds}
                    />
                  ))}
                </div>

                {filteredPhotos.length === 0 && (
                  <div className="text-center py-20 text-gray-400">
                    {photos.length === 0
                      ? <><p className="text-lg mb-2">{t('photo.noPhotos')}</p></>
                      : <><p className="text-lg mb-2">{t('filter.noMatch')}</p></>}
                  </div>
                )}
              </div>
            )}

            {/* 휴지통 뷰 */}
            {photoSubTab === 'trash' && (
              <div>
                {trashedPhotos.length > 0 && (
                  <div className="mb-4 flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                    <p className="text-xs text-red-600">
                      🗑️ {t('photo.trash')} {trashedPhotos.length}{t('photo.countText')}
                    </p>
                    <button
                      onClick={handleDeleteAllTrash}
                      disabled={deletingTrash}
                      className="text-xs px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded disabled:opacity-50"
                    >
                      {deletingTrash ? t('photo.deleting') : t('photo.deleteAllPermanent')}
                    </button>
                  </div>
                )}
                {trashedPhotos.length === 0 ? (
                  <div className="text-center py-20 text-gray-400 border rounded-xl bg-gray-50">
                    <p className="text-lg mb-2">{t('photo.trashEmpty')}</p>
                    {/* <p className="text-sm">{t('photo.deleteInfo')}</p> */}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {trashedPhotos.map(photo => {
                      const deletedDate = new Date(photo.deleted_at!)
                      const daysLeft = 30 - Math.floor((Date.now() - deletedDate.getTime()) / (1000 * 60 * 60 * 24))
                      
                      return (
                        <div key={photo.id} className="rounded overflow-hidden bg-transparent group relative shadow-sm border border-gray-200">
                          <img 
                            src={photo.image_url} 
                            alt={photo.caption || ''} 
                            className="w-full aspect-[3/2] object-contain"
                          />
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 flex flex-col items-center justify-center gap-2 px-4 z-10">
                            <button
                              onClick={async () => {
                                try {
                                  await axios.post(`${API}/photos/${photo.id}/restore`)
                                  await fetchTrash()
                                  await fetchPhotos()
                                  await fetchChapterPhotoIds()
                                } catch (err: any) {
                                  const detail = err.response?.data?.detail
                                  const code = typeof detail === 'object' ? detail.code : detail
                                  const limit = typeof detail === 'object' ? detail.limit : undefined

                                  if (code === 'PHOTO_LIMIT_EXCEEDED') {
                                    showToast(t('api.error.PHOTO_LIMIT_EXCEEDED', { limit }), 'warning')
                                  }
                                }
                              }}
                              className="w-full text-center px-4 py-1.5 text-xs bg-white text-black rounded hover:bg-gray-200 font-medium shadow-lg"
                            >
                               ↺ {t('trash.restore')}
                            </button>
                            <button
                              onClick={() => {
                                setConfirmModal({
                                  message: t('trash.permanentDeleteConfirm'),
                                  onConfirm: async () => {
                                    setConfirmModal(null)
                                    await axios.delete(`${API}/photos/${photo.id}/permanent`)
                                    fetchTrash()
                                  },
                                })
                              }}
                              className="w-full text-center px-4 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 font-medium shadow-lg"
                            >
                              ✕ {t('trash.permanentDelete')}
                            </button>
                          </div>
                          <div className="p-2 bg-transparent flex items-center justify-center h-10">
                            {/* 💡 날짜 표시 버그 수정 (이전에 요청하신 {daysLeft}일 후 영구 삭제로 복구) */}
                            <p className="text-xs text-red-500 font-medium">
                              {t('trash.delete_warning', { daysLeft: daysLeft })}
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
        </div>
      </div>

      <div style={{ display: activeTab === 'story' ? 'block' : 'none' }}>
        <ProjectStory
          projectId={numericId!}
          activeTab={activeTab} // 🔥 추가: 컴포넌트 내부에서 현재 탭을 알 수 있게 전달
          allPhotos={photos.filter(p => !p.deleted_at)} 
          onChapterChange={() => fetchChapterPhotoIds()} 
          onPhotoUpdate={(photoId, newCaption) => {
            setPhotos(prev => prev.map(p => 
              p.id === photoId ? { ...p, caption: newCaption } : p
            ));
          }}
        />
      </div>

      {DELIVERY_ENABLED && activeTab === 'delivery' && <DeliveryManager projectId={numericId!} />}

      <div style={{ display: activeTab === 'notes' ? 'block' : 'none' }}>
        <ProjectNotes
          // key={notesKey} // 💡 삭제: 컴포넌트를 유지하여 속도 향상
          projectId={numericId!}
          activeTab={activeTab} // 🔥 추가: 컴포넌트 내부에서 현재 탭을 알 수 있게 전달
          photos={photos.filter(p => !p.deleted_at)}
        />
      </div>
      
      {/* ⬆️ 맨 위로 가기 플로팅 버튼 */}
      {!lightboxPhoto && (
      <button
        id="floating-top-button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-8 right-8 w-12 h-12 bg-black/70 hover:bg-black text-white rounded-full flex items-center justify-center shadow-2xl transition-all z-40 backdrop-blur-sm"
        title="Top"
      >
        <span className="text-2xl font-bold">↑</span>
      </button>
      )}
    </div>
  )
}
