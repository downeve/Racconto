import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import exifr from 'exifr'
import { Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useElectronSidebar } from '../../context/ElectronSidebarContext'
import { useMobileLayout } from '../../context/MobileLayoutContext'
import MobileShell from '../../components/mobile/MobileShell'
import MobileSegmentTabs from '../../components/mobile/MobileSegmentTabs'
import { MobilePhotoCard } from '../../components/mobile/MobilePhotoCard'
import MobilePhotoActionSheet from '../../components/mobile/MobilePhotoActionSheet'
import MobileLightbox from '../../components/mobile/MobileLightbox'
import MobileStoryTab from '../../components/mobile/story/MobileStoryTab'
import ConfirmModal from '../../components/ConfirmModal'
import ToastNotification from '../../components/ToastNotification'
import ProjectNotes from '../ProjectNotes'
import type { Photo, Project, ChapterPhotoResponse, NoteResponse, ColorLabel } from '../../components/ProjectDetailComponents'

const API = import.meta.env.VITE_API_URL

type Tab = 'photos' | 'story' | 'notes'

export default function MobileProjectDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const [numericId, setNumericId] = useState<string | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const { setSidebarContent, triggerRefresh, setUploadInProgress: setUploading } = useElectronSidebar()
  const { setBottomSheetContent, setFabAction } = useMobileLayout()
  const [activeTab, setActiveTab] = useState<Tab>('photos')
  const [gridCols, setGridCols] = useState(2)

  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set())
  const [filterRating] = useState<number | null>(null)
  const [filterColor] = useState<string | null>(null)
  const [chapterPhotoIds, setChapterPhotoIds] = useState<Set<string>>(new Set())
  const [photoChapterMap, setPhotoChapterMap] = useState<Map<string, string>>(new Map())
  const [, setPhotoNoteIds] = useState<Set<string>>(new Set())
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null)
  const [actionSheetPhoto, setActionSheetPhoto] = useState<Photo | null>(null)
  const [chapters, setChapters] = useState<{ id: string; title: string; parent_id?: string | null; order_num?: number }[]>([])
  const [sortBy] = useState<'default' | 'taken_at' | 'name'>('default')
  const [sortOrder] = useState<'asc' | 'desc'>('asc')
  const [notesVersion, setNotesVersion] = useState(0)
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingDeleteBatchRef = useRef<{ ids: string[]; snapshotPhotos: Photo[]; timer: ReturnType<typeof setTimeout> | null }>({ ids: [], snapshotPhotos: [], timer: null })
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const [labelSettings, setLabelSettings] = useState<Record<string, string>>({
    color_label_red: t('colors.reject'), color_label_yellow: t('colors.hold'),
    color_label_green: t('colors.select'), color_label_blue: t('colors.clientShare'),
    color_label_purple: t('colors.finalSelect'),
  })

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

  const fetchChapterPhotoIds = async () => {
    if (!numericId) return
    const res = await axios.get(`${API}/chapters/all-photo-ids?project_id=${numericId}`)
    setChapters(res.data.chapters)
    const ids = new Set<string>()
    const map = new Map<string, string>()
    res.data.photo_ids.forEach((cp: ChapterPhotoResponse) => {
      if (cp.photo_id) { ids.add(cp.photo_id); map.set(cp.photo_id, cp.chapter_id) }
    })
    setChapterPhotoIds(ids)
    setPhotoChapterMap(map)
  }

  const fetchPhotoNoteIds = async () => {
    if (!numericId) return
    const res = await axios.get(`${API}/notes/?project_id=${numericId}`)
    const ids = new Set<string>(
      (res.data as NoteResponse[]).filter(n => n.photo_id).map(n => n.photo_id as string)
    )
    setPhotoNoteIds(ids)
  }

  useEffect(() => {
    axios.get(`${API}/settings/`).then(res => {
      setGridCols(parseInt(res.data['default_grid_cols'] || '2'))
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
    fetchPhotoNoteIds()
    fetchChapterPhotoIds()
  }, [numericId])

  useEffect(() => {
    setSidebarContent(null)
  }, [setSidebarContent])

  const colorLabels: ColorLabel[] = useMemo(() => [
    { value: 'red', color: 'bg-red-500', label: labelSettings['color_label_red'] },
    { value: 'yellow', color: 'bg-yellow-400', label: labelSettings['color_label_yellow'] },
    { value: 'green', color: 'bg-green-500', label: labelSettings['color_label_green'] },
    { value: 'blue', color: 'bg-blue-500', label: labelSettings['color_label_blue'] },
    { value: 'purple', color: 'bg-purple-500', label: labelSettings['color_label_purple'] },
  ], [labelSettings])

  const filteredPhotos = useMemo(() => photos.filter(photo => {
    if (photo.deleted_at) return false
    if (filterRating !== null && photo.rating !== filterRating) return false
    if (filterColor !== null && photo.color_label !== filterColor) return false
    return true
  }).sort((a, b) => {
    if (sortBy === 'taken_at') {
      const aMs = a.taken_at ? new Date(a.taken_at).getTime() : null
      const bMs = b.taken_at ? new Date(b.taken_at).getTime() : null
      if (aMs === null && bMs === null) return 0
      if (aMs === null) return 1
      if (bMs === null) return -1
      return sortOrder === 'desc' ? bMs - aMs : aMs - bMs
    }
    return sortOrder === 'desc' ? (b.order ?? 0) - (a.order ?? 0) : (a.order ?? 0) - (b.order ?? 0)
  }), [photos, filterRating, filterColor, sortBy, sortOrder])

  const resizeImage = (file: File): Promise<Blob> => {
    const MAX_SIZE = 3200
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const { width, height } = img
        let newW = width, newH = height
        if (Math.max(width, height) > MAX_SIZE) {
          if (width >= height) { newW = MAX_SIZE; newH = Math.round(height * MAX_SIZE / width) }
          else { newH = MAX_SIZE; newW = Math.round(width * MAX_SIZE / height) }
        }
        const canvas = document.createElement('canvas')
        canvas.width = newW; canvas.height = newH
        canvas.getContext('2d')!.drawImage(img, 0, 0, newW, newH)
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/jpeg', 0.88)
      }
      img.onerror = reject
      img.src = url
    })
  }

  const doUpload = async (validFiles: File[]) => {
    setUploading(true)
    let failedCount = 0, successCount = 0, limitExceeded = false, skipCount = 0
    for (const file of validFiles) {
      try {
        const isDuplicate = photos.some(p => p.original_filename === file.name && !p.deleted_at)
        if (isDuplicate) { skipCount++; successCount++; continue }
        let restored = false
        try {
          await axios.post(`${API}/photos/restore-by-filename`, { project_id: numericId, original_filename: file.name })
          restored = true
        } catch (e: any) {
          if (e.response?.status !== 404) throw e
        }
        if (!restored) {
          const exifData: Record<string, string> = {}
          try {
            const parsed = await exifr.parse(file, {
              pick: ['DateTimeOriginal', 'Make', 'Model', 'LensModel', 'ISO', 'ExposureTime', 'FNumber', 'FocalLength', 'GPSLatitude', 'GPSLongitude']
            })
            if (parsed) {
              if (parsed.DateTimeOriginal) exifData.taken_at = new Date(parsed.DateTimeOriginal).toISOString()
              if (parsed.Make || parsed.Model) exifData.camera = `${parsed.Make || ''} ${parsed.Model || ''}`.trim()
              if (parsed.LensModel) exifData.lens = parsed.LensModel
              if (parsed.ISO) exifData.iso = `ISO ${parsed.ISO}`
              if (parsed.ExposureTime) exifData.shutter_speed = parsed.ExposureTime < 1 ? `1/${Math.round(1 / parsed.ExposureTime)}s` : `${parsed.ExposureTime.toFixed(1)}s`
              if (parsed.FNumber) exifData.aperture = `f/${parsed.FNumber.toFixed(1)}`
              if (parsed.FocalLength) exifData.focal_length = `${Math.round(parsed.FocalLength)}mm`
              if (parsed.GPSLatitude) exifData.gps_lat = String(parsed.GPSLatitude)
              if (parsed.GPSLongitude) exifData.gps_lng = String(parsed.GPSLongitude)
            }
          } catch {}
          const resizedBlob = await resizeImage(file)
          const { data: urlData } = await axios.get(`${API}/photos/cf-upload-url`)
          const formData = new FormData()
          formData.append('file', resizedBlob, file.name)
          const cfRes = await fetch(urlData.uploadURL, { method: 'POST', body: formData })
          const cfData = await cfRes.json()
          if (!cfData.success) throw new Error('CF upload failed')
          await axios.post(`${API}/photos/`, { project_id: numericId, image_url: cfData.result.variants[0], original_filename: file.name, source: 'web', ...exifData })
        }
        successCount++
      } catch (error: any) {
        const code = typeof error?.response?.data?.detail === 'object' ? error.response.data.detail.code : error?.response?.data?.detail
        if (error?.response?.status === 401) break
        else if (code === 'PHOTO_LIMIT_EXCEEDED') { limitExceeded = true; break }
        else failedCount++
      }
    }
    if (limitExceeded) showToast(successCount > 0 ? t('photo.upload.limitExceededPartial', { success: successCount }) : t('photo.upload.limitExceeded'), 'warning')
    else if (failedCount > 0) showToast(t('photo.upload.fail', { count: failedCount }), 'error')
    else if (successCount - skipCount > 0) showToast(t('photo.upload.success', { count: successCount - skipCount }), 'success')
    try { await fetchPhotos() } finally { setUploading(false) }
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !id) return
    const inputEl = e.target
    const validFiles = Array.from(e.target.files).filter(f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type))
    inputEl.value = ''
    if (validFiles.length > 0) doUpload(validFiles)
  }

  const handleSetCover = async (photo: Photo) => {
    if (!project || !numericId) return
    const statusValue = typeof project.status === 'object' ? (project.status as { value: string }).value : project.status
    try {
      await axios.put(`${API}/projects/${numericId}`, { title: project.title, title_en: project.title_en, description: project.description, description_en: project.description_en, location: project.location, is_public: project.is_public, status: statusValue, cover_image_url: photo.image_url })
      const res = await axios.get(`${API}/projects/${numericId}`)
      setProject(res.data)
      triggerRefresh()
    } catch {}
  }

  const handleDeletePhoto = (photoId: string) => {
    const batch = pendingDeleteBatchRef.current
    if (batch.ids.length === 0) batch.snapshotPhotos = [...photos]
    if (lightboxPhoto?.id === photoId) setLightboxPhoto(null)
    setPhotos(prev => prev.filter(p => p.id !== photoId))
    batch.ids.push(photoId)
    if (batch.timer) clearTimeout(batch.timer)
    batch.timer = setTimeout(async () => {
      const ids = [...batch.ids]
      const { snapshotPhotos } = batch
      batch.ids = []; batch.timer = null
      try {
        await axios.delete(`${API}/photos/bulk-delete`, { data: { photo_ids: ids } })
        fetchPhotos()
        fetchChapterPhotoIds()
        fetchPhotoNoteIds()
        axios.get(`${API}/projects/${numericId}`).then(res => setProject(res.data))
      } catch {
        setPhotos(snapshotPhotos)
      }
    }, 400)
  }

  const handleSetRating = async (photo: Photo, rating: number) => {
    const newRating = photo.rating === rating ? null : rating
    const prev = photo.rating
    setPhotos(p => p.map(x => x.id === photo.id ? { ...x, rating: newRating } : x))
    if (lightboxPhoto?.id === photo.id) setLightboxPhoto(p => p ? { ...p, rating: newRating } : null)
    try { await axios.put(`${API}/photos/${photo.id}`, { ...photo, rating: newRating }) }
    catch {
      setPhotos(p => p.map(x => x.id === photo.id ? { ...x, rating: prev } : x))
      if (lightboxPhoto?.id === photo.id) setLightboxPhoto(p => p ? { ...p, rating: prev } : null)
    }
  }

  const handleSetColorLabel = async (photo: Photo, label: string) => {
    const newLabel = photo.color_label === label ? null : label
    const prev = photo.color_label
    setPhotos(p => p.map(x => x.id === photo.id ? { ...x, color_label: newLabel } : x))
    if (lightboxPhoto?.id === photo.id) setLightboxPhoto(p => p ? { ...p, color_label: newLabel } : null)
    try { await axios.put(`${API}/photos/${photo.id}`, { ...photo, color_label: newLabel }) }
    catch {
      setPhotos(p => p.map(x => x.id === photo.id ? { ...x, color_label: prev } : x))
      if (lightboxPhoto?.id === photo.id) setLightboxPhoto(p => p ? { ...p, color_label: prev } : null)
    }
  }

  const handleRotatePhoto = async (photo: Photo, direction: 'left' | 'right') => {
    try {
      const res = await axios.post(`${API}/photos/${photo.id}/rotate`, { direction })
      const updated: Photo = res.data
      setPhotos(p => p.map(x => x.id === photo.id ? { ...x, image_url: updated.image_url } : x))
      if (lightboxPhoto?.id === photo.id) setLightboxPhoto(p => p ? { ...p, image_url: updated.image_url } : null)
      showToast(t('photo.rotateSuccess'), 'success')
    } catch {
      showToast(t('photo.rotateFail'), 'error')
    }
  }

  const handleAddToChapter = async (photoId: string, chapterId: string) => {
    try {
      await axios.post(`${API}/chapters/${chapterId}/photos`, { photo_id: photoId })
      await fetchChapterPhotoIds()
    } catch {}
  }

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotoIds(prev => {
      const next = new Set(prev)
      if (next.has(photoId)) next.delete(photoId)
      else next.add(photoId)
      return next
    })
  }

  // FAB 설정
  useEffect(() => {
    if (activeTab === 'photos') {
      setFabAction(() => () => {
        setBottomSheetContent(
          <div className="p-4 flex flex-col gap-3">
            <p className="text-sm font-semibold text-stone-700">{t('photo.upload') || '사진 업로드'}</p>
            <button
              onClick={() => { setBottomSheetContent(null); uploadInputRef.current?.click() }}
              className="flex items-center gap-3 py-3 min-h-[44px] text-sm text-stone-700"
            >
              <Upload size={18} strokeWidth={1.5} className="text-stone-500" />
              {t('photo.uploadPhotos') || '사진 선택'}
            </button>
          </div>
        )
      })
    } else if (activeTab === 'notes') {
      // Notes 탭 FAB는 ProjectNotes 내부에서 처리하기 어려우므로 숨김
      setFabAction(null)
    } else {
      setFabAction(null)
    }
    return () => setFabAction(null)
  }, [activeTab, setFabAction, setBottomSheetContent, t])

  const TABS = [
    { key: 'photos' as Tab, label: t('photo.title') },
    { key: 'story' as Tab, label: t('story.title') },
    { key: 'notes' as Tab, label: t('note.title') },
  ]

  const colsClass = gridCols === 1 ? 'grid-cols-1' : gridCols >= 3 ? 'grid-cols-3' : 'grid-cols-2'

  return (
    <MobileShell title={project?.title || ''} showBack>
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          dangerous
        />
      )}
      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleUpload}
      />

      <MobileSegmentTabs tabs={TABS} activeTab={activeTab} onChange={k => setActiveTab(k as Tab)} />

      {activeTab === 'photos' && (
        <div className="flex flex-col">
          {/* 그리드 열 설정 */}
          <div className="flex items-center justify-end gap-2 px-3 py-2">
            {[1, 2, 3].map(c => (
              <button
                key={c}
                onClick={() => setGridCols(c)}
                className={`text-xs px-2 py-1 rounded ${gridCols === c ? 'bg-stone-900 text-white' : 'text-stone-400'}`}
              >
                {c}열
              </button>
            ))}
          </div>

          <div className={`grid ${colsClass} gap-0.5 px-0.5`}>
            {filteredPhotos.map(photo => (
              <MobilePhotoCard
                key={photo.id}
                photo={photo}
                colorLabels={colorLabels}
                chapterPhotoIds={chapterPhotoIds}
                selectionMode={selectionMode}
                isSelected={selectedPhotoIds.has(photo.id)}
                onToggleSelect={togglePhotoSelection}
                onOpenLightbox={setLightboxPhoto}
                onShowActionSheet={setActionSheetPhoto}
              />
            ))}
          </div>

          {/* 다중 선택 하단 바 */}
          {selectionMode && (
            <div
              className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-4 py-3 flex items-center justify-between z-30"
              style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 0.75rem)` }}
            >
              <span className="text-sm text-stone-600">{selectedPhotoIds.size}장 선택됨</span>
              <div className="flex gap-3">
                <button onClick={() => { setSelectionMode(false); setSelectedPhotoIds(new Set()) }} className="text-sm text-stone-500 min-h-[44px] px-3">
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'story' && numericId && (
        <MobileStoryTab projectId={numericId} allPhotos={photos} />
      )}

      {activeTab === 'notes' && numericId && (
        <div className="p-4">
          <ProjectNotes
            projectId={numericId}
            activeTab={activeTab}
            notesVersion={notesVersion}
            photos={photos.map(p => ({ id: p.id, image_url: p.image_url, caption: p.caption }))}
          />
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <MobileLightbox
          photo={lightboxPhoto}
          photos={filteredPhotos}
          colorLabels={colorLabels}
          chapterPhotoIds={chapterPhotoIds}
          chapters={chapters}
          photoChapterMap={photoChapterMap}
          projectId={numericId || ''}
          onClose={() => setLightboxPhoto(null)}
          onNavigate={setLightboxPhoto}
          onSetRating={handleSetRating}
          onSetColorLabel={handleSetColorLabel}
          onAddToChapter={handleAddToChapter}
          onNoteChange={() => { fetchPhotoNoteIds(); setNotesVersion(v => v + 1) }}
          onRotate={handleRotatePhoto}
        />
      )}

      {/* ActionSheet */}
      {actionSheetPhoto && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setActionSheetPhoto(null)} />
          <div className="relative bg-white rounded-t-2xl" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-stone-300" />
            </div>
            <MobilePhotoActionSheet
              photo={actionSheetPhoto}
              colorLabels={colorLabels}
              chapters={chapters}
              onSetCover={handleSetCover}
              onDelete={(id) => { setActionSheetPhoto(null); handleDeletePhoto(id) }}
              onSetRating={handleSetRating}
              onSetColorLabel={handleSetColorLabel}
              onAddToChapter={handleAddToChapter}
              onClose={() => setActionSheetPhoto(null)}
            />
          </div>
        </div>
      )}
    </MobileShell>
  )
}
