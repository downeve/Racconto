import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

import ProjectStory from './ProjectStory'
import DeliveryManager from '../components/DeliveryManager'
import { useTranslation } from 'react-i18next'
import Heading from '../components/Heading' //
import ProjectNotes from './ProjectNotes'
import PhotoNotePanel from '../components/PhotoNotePanel'

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
      <div className="flex items-center justify-between px-6 py-3 shrink-0" onClick={e => e.stopPropagation()}>
        <span className="text-white/50 text-sm">{idx + 1} / {photos.length}</span>
        {photo.local_missing && (
          <span className="text-yellow-400 text-xs font-bold px-2 py-0.5 bg-yellow-400/20 rounded-full">
            ⚠️ 로컬 파일 없음
          </span>
        )}
        <button onClick={onClose} className="text-white/70 hover:text-white text-2xl">✕</button>
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
            ⚠️ 로컬 파일 없음
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
export default function ProjectDetail() {
  const { t } = useTranslation()

  const { id } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)
  
  const [activeTab, setActiveTab] = useState<'photos' | 'story' | 'notes' | 'delivery'>('photos')
  const [photoSubTab, setPhotoSubTab] = useState<'all' | 'trash'>('all')
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
    setChapters(
      res.data
        .sort((a: any, b: any) => a.order_num - b.order_num)
        .map((c: any) => ({ id: c.id, title: c.title, parent_id: c.parent_id, order_num: c.order_num }))
    )
    const ids = new Set<string>()
    for (const chapter of res.data) {
      const photoRes = await axios.get(`${API}/chapters/${chapter.id}/photos`)
      photoRes.data.forEach((cp: any) => ids.add(cp.photo_id))
    }
    setChapterPhotoIds(ids)
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
    axios.get(`${API}/projects/${id}`).then(res => setProject(res.data))
    fetchPhotos()
    fetchTrash()
  }, [id])

  useEffect(() => { if (id) fetchChapterPhotoIds() }, [id])

  useEffect(() => {
    if (!window.racconto) return
    window.racconto.onDeletedFile((filePath: string) => {
      const filename = filePath.split('/').pop()
      setPhotos(prev => prev.map(p =>
        p.original_filename === filename ? { ...p, local_missing: true } : p
      ))
    })
  }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !id) return
    setUploading(true)

    // 💡 1. 백엔드가 허용하는 이미지 형식만 남기고 필터링 (.DS_Store 등 제외)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    const validFiles = Array.from(e.target.files).filter(file => allowedTypes.includes(file.type))

    // 안내 메시지 (옵션)
    if (validFiles.length !== e.target.files.length) {
      console.warn(`지원하지 않는 파일 ${e.target.files.length - validFiles.length}개가 제외되었습니다.`)
    }

    // 💡 2. 필터링된 정상 파일들만 업로드 진행
    for (const file of validFiles) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        const relativePath = (file as any).webkitRelativePath
        const folder = relativePath ? relativePath.split('/')[0] : null
        
        const url = folder
          ? `${API}/photos/upload?project_id=${id}&folder=${encodeURIComponent(folder)}`
          : `${API}/photos/upload?project_id=${id}`
          
        // 정상 업로드 시도
        await axios.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        
      } catch (error) {
        // 💡 3. [핵심] 특정 파일 업로드 중 에러가 나더라도 함수를 멈추지 않고, 
        // 콘솔에 에러만 찍은 뒤 다음 파일로 계속 진행하도록 try-catch로 감쌌습니다.
        // 💡 t('photo.uploadFail')을 템플릿 리터럴 안에 삽입
        console.error(`❌ ${file.name} ${t('photo.uploadFail')}:`, error)
        
        const detail = (error as any)?.response?.data?.detail
        const code = typeof detail === 'object' ? detail.code : detail
        const limit = typeof detail === 'object' ? detail.limit : undefined

        if (code === 'PHOTO_LIMIT_EXCEEDED') {
          alert(t('api.error.PHOTO_LIMIT_EXCEEDED', { limit }))
          break
        } else {
          alert(`❌ ${file.name} ${t('photo.uploadFail')}`)
        }
      }
    }

    // 모든 루프가 끝난 뒤에 상태 업데이트 및 새로고침
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
    await fetchPhotos()
    await fetchChapterPhotoIds()
    await fetchTrash()
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

  const handleDeleteAllMissing = async () => {
    const missingPhotos = photos.filter(p => p.local_missing && !p.deleted_at)
    if (missingPhotos.length === 0) return
    if (!confirm(`로컬 파일 없음 사진 ${missingPhotos.length}개를 모두 삭제할까요?`)) return
    setDeletingMissing(true)
    await axios.delete(`${API}/photos/bulk-delete`, {
      data: { photo_ids: missingPhotos.map(p => p.id) }
    })
    await fetchPhotos()
    await fetchTrash()
    await fetchChapterPhotoIds()
    setDeletingMissing(false)
  }

  const handleDeleteAllTrash = async () => {
    if (trashedPhotos.length === 0) return
    if (!confirm(`휴지통 사진 ${trashedPhotos.length}개를 모두 영구 삭제할까요?`)) return
    setDeletingTrash(true)
    await axios.delete(`${API}/photos/bulk-permanent`, {
      data: { photo_ids: trashedPhotos.map(p => p.id) }
    })
    await fetchTrash()
    setDeletingTrash(false)
  }

  const handleSaveCaption = async (photo: Photo) => {
    await axios.put(`${API}/photos/${photo.id}`, { ...photo, caption: captionKo })
    setEditingCaption(null)
    fetchPhotos()
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
    if (photo.deleted_at) return false

    if (filterRating !== null) {
      if (filterRating === 0) { if (photo.rating !== null) return false }
      else { if (photo.rating !== filterRating) return false }
    }
    if (filterColor !== null && photo.color_label !== filterColor) return false
    if (filterFolder !== null && photo.folder !== filterFolder) return false
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

  if (!project) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto p-6">
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
          projectId={id!}
          onAddToChapter={async (photoId, chapterId) => {
            await axios.post(`${API}/chapters/${chapterId}/photos`, { photo_id: photoId })
            await fetchChapterPhotoIds()
          }}
        />
      )}

      <div className="mb-2">
        <a href="/projects" className="text-sm text-gray-400 hover:text-black">{t('nav.backToProjects')}</a>
      </div>

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

      <div className="flex border-b mb-6">
        <button onClick={() => { 
            setActiveTab('photos'); 
            setPhotoSubTab('all'); 
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
        <div className="flex gap-6 items-start">
          
          {/* 👈 좌측 사이드바 (필터 & 라이브러리 통합) */}
          <div className={`${showFilter ? 'w-48' : 'w-6'} shrink-0 transition-all duration-200`}>
            <button onClick={() => setShowFilter(!showFilter)}
              className="mb-2 text-gray-400 hover:text-black text-xs flex items-center gap-1">
              {showFilter ? '◀ ' + t('filter.filter') : '▶'}
            </button>

            {showFilter && (
              <div className="bg-white rounded-lg shadow p-4 overflow-y-auto max-h-[calc(100vh-2rem)] min-h-[calc(100vh-8rem)] sticky top-4">
                
                {/* 💡 flex-col을 지워서 가로 배치(flex-row 기본값)로 변경했습니다 */}
                <div className="mb-3 flex gap-2">
                  {/* 💡 양쪽 버튼이 1:1 비율을 가지도록 flex-1을 추가하고 rounded를 넣었습니다 */}
                  <label className="flex-1 cursor-pointer bg-black text-white px-1.5 py-1.5 text-xs tracking-wider hover:bg-gray-800 inline-block text-center rounded">
                    {uploading ? t('photo.uploading') : t('photo.uploadPhotos')}
                    <input type="file" accept="image/jpeg, image/png, image/webp" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
                  </label>
                  <label className="flex-1 cursor-pointer bg-gray-700 text-white px-1.5 py-1.5 text-xs tracking-wider hover:bg-gray-600 inline-block text-center rounded">
                    {uploading ? t('photo.uploading') : t('photo.uploadFolder')}
                    <input type="file" accept="image/jpeg, image/png, image/webp" multiple className="hidden" onChange={handleUpload} disabled={uploading} {...{ webkitdirectory: '' } as any} />
                  </label>
                </div>

                {/* 📂 새로 추가된 라이브러리 (기존 상단 가로 탭을 이쪽으로 이동) */}
                <div className="mb-2">
                  <p className="text-xs font-semibold text-gray-500 mb-2">{t('photo.library')}</p>
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => setPhotoSubTab('all')}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center justify-between ${photoSubTab === 'all' ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                      <span>{t('photo.allPhotos')}</span>
                      <span className={`${photoSubTab === 'all' ? 'text-gray-300' : 'text-gray-400'}`}>
                        {photos.filter(p => !p.deleted_at).length}
                      </span>
                    </button>
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

                {photos.some(p => p.folder) && (
                  <div className="mt-3 mb-3">
                    <p className="text-xs font-semibold text-gray-500 mb-2">{t('filter.folder')}</p>
                    <button onClick={() => setFilterFolder(null)}
                      className={`w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between mb-1 ${filterFolder === null ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                      <span>{t('filter.allFolders')}</span><span className="text-gray-400">{photos.length}</span>
                    </button>
                      {[...new Set(photos.filter(p => p.folder).map(p => p.folder))].map(folder => {
                      const count = photos.filter(p => p.folder === folder).length
                      return (
                        <button key={folder} onClick={() => setFilterFolder(filterFolder === folder ? null : folder!)}
                          title={folder!}
                          className={`w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between ${filterFolder === folder ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                          <span className="flex items-center gap-1 min-w-0">
                            <span className="shrink-0">📁</span>
                            <span className="truncate">{folder}</span>
                          </span>
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

          {/* 👉 우측 메인 사진 갤러리 영역 */}
          <div className="flex-1 min-w-0">
            
            {/* 전체 사진 뷰 */}
            {photoSubTab === 'all' && (
              <div>
                  {/* local_missing 일괄 삭제 버튼 — Electron 앱 + missing 사진 있을 때만 표시 */}
                  {photos.some(p => p.local_missing && !p.deleted_at) && (
                    <div className="mb-4 flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2.5">
                      <p className="text-xs text-yellow-700">
                        ⚠️ 로컬 파일 없음 사진 {photos.filter(p => p.local_missing && !p.deleted_at).length}개
                      </p>
                      <button
                        onClick={handleDeleteAllMissing}
                        disabled={deletingMissing}
                        className="text-xs px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded disabled:opacity-50"
                      >
                        {deletingMissing ? '삭제 중...' : '전체 삭제'}
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

                {filteredPhotos.length === 0 && !uploading && (
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
                      🗑️ 휴지통 사진 {trashedPhotos.length}개
                    </p>
                    <button
                      onClick={handleDeleteAllTrash}
                      disabled={deletingTrash}
                      className="text-xs px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded disabled:opacity-50"
                    >
                      {deletingTrash ? '삭제 중...' : '전체 영구 삭제'}
                    </button>
                  </div>
                )}
                {trashedPhotos.length === 0 ? (
                  <div className="text-center py-20 text-gray-400 border rounded-xl bg-gray-50">
                    <p className="text-lg mb-2">{t('photo.trashEmpty')}</p>
                    <p className="text-sm">삭제된 사진은 30일 동안 보관 후 영구 삭제됩니다.</p>
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
                                    alert(t('api.error.PHOTO_LIMIT_EXCEEDED', { limit }))
                                  }
                                }
                              }}
                              className="w-full text-center px-4 py-1.5 text-xs bg-white text-black rounded hover:bg-gray-200 font-medium shadow-lg"
                            >
                               ↺ {t('trash.restore')}
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm(t('trash.permanentDeleteConfirm'))) return
                                await axios.delete(`${API}/photos/${photo.id}/permanent`)
                                fetchTrash()
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
      )}

      {activeTab === 'story' && (
        <ProjectStory 
          projectId={id!} 
          allPhotos={photos.filter(p => !p.deleted_at)} 
          onChapterChange={() => fetchChapterPhotoIds()} 
          onPhotoUpdate={fetchPhotos} 
        />
      )}

      {DELIVERY_ENABLED && activeTab === 'delivery' && <DeliveryManager projectId={id!} />}

      {activeTab === 'notes' && (
        <ProjectNotes
          projectId={id!}
          photos={photos.filter(p => !p.deleted_at)}
        />
      )}
      
      {/* ⬆️ 맨 위로 가기 플로팅 버튼 */}
      {!lightboxPhoto && (
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-8 right-8 w-12 h-12 bg-black/70 hover:bg-black text-white rounded-full flex items-center justify-center shadow-2xl transition-all z-50 backdrop-blur-sm"
        title="맨 위로"
      >
        <span className="text-2xl font-bold">↑</span>
      </button>
      )}
    </div>
  )
}