import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import exifr from 'exifr'

import ProjectStory from './ProjectStory'
import DeliveryManager from '../components/DeliveryManager'
import { useTranslation } from 'react-i18next'
import Heading from '../components/Heading'
import ProjectNotes from './ProjectNotes'
import { useElectronSidebar } from '../context/ElectronSidebarContext'
import ConfirmModal from '../components/ConfirmModal'
import ToastNotification from '../components/ToastNotification'
import { Lightbox, PhotoCard } from '../components/ProjectDetailComponents'
import type { Photo, Project, ChapterPhotoResponse, NoteResponse } from '../components/ProjectDetailComponents'

const API = import.meta.env.VITE_API_URL
const DELIVERY_ENABLED = import.meta.env.VITE_ENABLE_DELIVERY === 'true'

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

  // 🚀 [추가할 State] 다중 선택 모드 관련 상태
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set())
  const [showBulkChapterMenu, setShowBulkChapterMenu] = useState(false)
  
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [filterColor, setFilterColor] = useState<string | null>(null)
  const [filterFolder, setFilterFolder] = useState<string | null>(null)
  const [showExif, setShowExif] = useState(true)
  const [showFilter, setShowFilter] = useState(true)
  const [chapterPhotoIds, setChapterPhotoIds] = useState<Set<string>>(new Set())
  const [photoChapterMap, setPhotoChapterMap] = useState<Map<string, string>>(new Map())

  const [notesVersion, setNotesVersion] = useState(0)
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null)
  const [chapterMenuPhoto, setChapterMenuPhoto] = useState<string | null>(null)
  const [chapters, setChapters] = useState<{ id: string; title: string; parent_id?: string | null; order_num?: number }[]>([])
  const [sortBy, setSortBy] = useState<'default' | 'taken_at' | 'name'>('default')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc') // 초기값은 그대로, 아래 useEffect에서 덮어씀
  const [deletingMissing, setDeletingMissing] = useState(false)
  const [deletingTrash, setDeletingTrash] = useState(false)
  const [isProjectFolderLinked, setIsProjectFolderLinked] = useState(false)
  const [photoNoteIds, setPhotoNoteIds] = useState<Set<string>>(new Set())
  const [filterHasNote, setFilterHasNote] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [chapterPhotoVersion, setChapterPhotoVersion] = useState(0)

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
    const res = await axios.get(`${API}/chapters/all-photo-ids?project_id=${numericId}`)
    setChapters(res.data.chapters)
    const ids = new Set<string>()
    const map = new Map<string, string>()
    res.data.photo_ids.forEach((cp: ChapterPhotoResponse) => {
      if (cp.photo_id) {
        ids.add(cp.photo_id)
        map.set(cp.photo_id, cp.chapter_id)
      }
    })
    setChapterPhotoIds(ids)
    setPhotoChapterMap(map)
    setChapterPhotoVersion(v => v + 1)
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

      // 설정에서 지정한 기본 정렬 기준 불러오기!
      if (res.data['default_sort_by']) {
        setSortBy(res.data['default_sort_by'])
      }
      
      // 오름차순, 내림차순 설정 값 불러오기
      if (res.data['default_sort_order']) {
        setSortOrder(res.data['default_sort_order'] as 'asc' | 'desc')
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

  const numericIdRef = useRef(numericId)
  useEffect(() => { numericIdRef.current = numericId }, [numericId])

  useEffect(() => {
    const handler = async () => {
      if (!numericIdRef.current) return
      const res = await axios.get(`${API}/photos/?project_id=${numericIdRef.current}`)
      setPhotos(res.data)
    }
    window.addEventListener('racconto:uploadDone', handler)
    window.addEventListener('racconto:limitExceeded', handler)
    return () => {
      window.removeEventListener('racconto:uploadDone', handler)
      window.removeEventListener('racconto:limitExceeded', handler)
    }
  }, []) // ← dependency 빈 배열로 변경

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

  useEffect(() => {
    if (!isElectron || !numericId) return
    window.racconto!.getAllMappings().then(mappings => {
      const linked = Object.values(mappings).some(m => m.projectId === numericId)
      setIsProjectFolderLinked(linked)
    })
    window.racconto!.onFolderUnlinked(() => {
      window.racconto!.getAllMappings().then(mappings => {
        const linked = Object.values(mappings).some(m => m.projectId === numericId)
        setIsProjectFolderLinked(linked)
      })
    })
  }, [numericId, isElectron])

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

  useEffect(() => {
    if (selectionMode) {
      setSelectionMode(false)
      setSelectedPhotoIds(new Set())
      setShowBulkChapterMenu(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filterFolder, filterRating, filterColor, sortBy])

  const resizeImage = (file: File): Promise<Blob> => {
    const MAX_SIZE = 2400
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      // 변경 후
      img.onload = () => {
        URL.revokeObjectURL(url)
        const { width, height } = img

        // 장변이 MAX_SIZE 이하면 원본 그대로 사용
        if (Math.max(width, height) <= MAX_SIZE) {
          resolve(file)
          return
        }

        // 장변이 MAX_SIZE 초과할 때만 리사이즈
        let newW = width, newH = height
        if (width >= height) {
          newW = MAX_SIZE
          newH = Math.round(height * MAX_SIZE / width)
        } else {
          newH = MAX_SIZE
          newW = Math.round(width * MAX_SIZE / height)
        }

        const canvas = document.createElement('canvas')
        canvas.width = newW
        canvas.height = newH
        canvas.getContext('2d')!.drawImage(img, 0, 0, newW, newH)
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error('toBlob failed')),
          'image/jpeg',
          0.95  // 0.88 → 0.95
        )
      }
      img.onerror = reject
      img.src = url
    })
  }

  const doUpload = async (validFiles: File[]) => {
    setUploading(true)

    let failedCount = 0
    let successCount = 0
    let limitExceeded = false
    let skipCount = 0
    for (const file of validFiles) {
      try {
        const relativePath = (file as any).webkitRelativePath
        const folder = relativePath ? relativePath.split('/')[0] : null

        // 0-a. 활성 사진 중 동일 파일명+폴더가 있으면 중복 스킵
        const isDuplicate = photos.some(
          p => p.original_filename === file.name && p.folder === folder && !p.deleted_at
        )
        if (isDuplicate) { skipCount++; successCount++; continue }

        // 0-b. 휴지통에 같은 파일명이 있으면 새 업로드 대신 복구 (Workflow 4)
        let restored = false
        try {
          await axios.post(`${API}/photos/restore-by-filename`, {
            project_id: numericId,
            original_filename: file.name,
          })
          restored = true
        } catch (e: any) {
          if (e.response?.status !== 404) throw e
          // 404 = 휴지통에 없음, 정상 업로드 진행
        }

        if (!restored) {
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
        await axios.post(`${API}/photos/`, {
          project_id: numericId,
          image_url: imageUrl,
          folder,
          original_filename: file.name,
          source: 'web',
          ...exifData,
        })
        } // end if (!restored)
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
    } else if (successCount - skipCount > 0) {
      showToast(t('photo.upload.success', { count: successCount - skipCount }), 'success')
    } else if (skipCount > 0) {
      showToast(t('photo.upload.allSkipped', { count: skipCount }), 'warning')
    }

    try {
      await fetchPhotos()
    } catch {
      // 로그아웃 등으로 fetchPhotos 실패해도 uploading은 반드시 해제
    } finally {
      setUploading(false)
    }
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !id) return
    const inputEl = e.target
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    const validFiles = Array.from(e.target.files).filter(file => allowedTypes.includes(file.type))
    inputEl.value = ''
    if (validFiles.length === 0) return

    const isFolder = validFiles.some(f => !!(f as any).webkitRelativePath)
    if (isFolder) {
      setConfirmModal({
        message: t('photo.upload.folderConfirm', { count: validFiles.length }),
        onConfirm: () => { setConfirmModal(null); doUpload(validFiles) },
      })
    } else {
      doUpload(validFiles)
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

      // 백그라운드 데이터 동기화
      Promise.all([
        axios.get(`${API}/projects/${numericId}`).then(res => setProject(res.data)),
        fetchChapterPhotoIds(),
        fetchPhotoNoteIds()
      ]);

    } catch (error) {
      console.error("사진 삭제 실패:", error);
      setPhotos(prevPhotos);
      setTrashedPhotos(prevTrash);
      // (선택) showToast(t('common.error'), 'error'); 
    }
  }

  const handleSetRating = async (photo: Photo, rating: number) => {
    // 1. 새 상태 계산 & 이전 상태 백업(롤백용)
    const newRating = photo.rating === rating ? null : rating;
    const previousRating = photo.rating;

    // 2. ⚡️ 낙관적 업데이트: 서버 대기 없이 화면(메인 그리드, 라이트박스) 즉시 변경
    setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, rating: newRating } : p));
    if (lightboxPhoto?.id === photo.id) {
      setLightboxPhoto(prev => prev ? { ...prev, rating: newRating } : null);
    }

    // 3. 백그라운드 서버 통신
    try {
      await axios.put(`${API}/photos/${photo.id}`, { ...photo, rating: newRating });
    } catch (error) {
      console.error("별점 업데이트 실패, 이전 상태로 롤백합니다.", error);
      // 4. 🔄 에러 발생 시 롤백 (백업해둔 이전 상태로 화면 원상복구)
      setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, rating: previousRating } : p));
      if (lightboxPhoto?.id === photo.id) {
        setLightboxPhoto(prev => prev ? { ...prev, rating: previousRating } : null);
      }
      // (선택) 여기에 토스트 알림을 추가해도 좋습니다. ex) toast.error("수정에 실패했습니다.")
    }
  }

  const handleSetColorLabel = async (photo: Photo, label: string) => {
    // 1. 새 상태 계산 & 이전 상태 백업(롤백용)
    const newLabel = photo.color_label === label ? null : label;
    const previousLabel = photo.color_label;

    // 2. ⚡️ 낙관적 업데이트: 화면 즉시 변경
    setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, color_label: newLabel } : p));
    if (lightboxPhoto?.id === photo.id) {
      setLightboxPhoto(prev => prev ? { ...prev, color_label: newLabel } : null);
    }

    // 3. 백그라운드 서버 통신
    try {
      await axios.put(`${API}/photos/${photo.id}`, { ...photo, color_label: newLabel });
    } catch (error) {
      console.error("컬러 라벨 업데이트 실패, 이전 상태로 롤백합니다.", error);
      // 4. 🔄 에러 발생 시 롤백 (화면 원상복구)
      setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, color_label: previousLabel } : p));
      if (lightboxPhoto?.id === photo.id) {
        setLightboxPhoto(prev => prev ? { ...prev, color_label: previousLabel } : null);
      }
    }
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

  const exitTrash = () => { if (photoSubTab === 'trash') setPhotoSubTab('all') }

  const handleResetAll = () => {
    setFilterFolder(null)
    setFilterRating(null)
    setFilterColor(null)
    setFilterHasNote(false)
    setPhotoSubTab('all')
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

  const getFolderDisplayName = (folder: string) =>
    folder.split(/[/\\]/).filter(Boolean).pop() ?? folder

  const isLocalSyncFolder = (folder: string) =>
    folder.startsWith('/') || /^[A-Za-z]:\\/.test(folder)

  const canHardDelete = (photo: Photo): boolean => {
    if (photo.source !== 'electron') return true
    if (!isElectron) return false
    if (!isProjectFolderLinked) return true
    return !!photo.local_missing
  }

  const webTrashPhotos = useMemo(
    () => trashedPhotos.filter(p => canHardDelete(p)),
    [trashedPhotos, isElectron, isProjectFolderLinked]
  )
  const localTrashPhotos = useMemo(
    () => trashedPhotos.filter(p => !canHardDelete(p)),
    [trashedPhotos, isElectron, isProjectFolderLinked]
  )

  const handleDeleteAllTrash = () => {
    if (trashedPhotos.length === 0) return

    const doDelete = async () => {
      setConfirmModal(null)
      setDeletingTrash(true)
      try {
        await axios.delete(`${API}/photos/bulk-permanent`, {
          data: { photo_ids: webTrashPhotos.map(p => p.id) }
        })
        await fetchTrash()
      } catch (error) {
        console.error(error)
      } finally {
        setDeletingTrash(false)
      }
    }

    if (localTrashPhotos.length === 0) {
      // 웹 사진만
      setConfirmModal({
        message: t('trash.deleteAllWebConfirm', { count: webTrashPhotos.length }),
        onConfirm: doDelete,
      })
    } else if (webTrashPhotos.length === 0) {
      // 로컬 사진만 — 안내 모달
      setConfirmModal({
        message: t('trash.deleteAllLocalBlocked'),
        onConfirm: () => setConfirmModal(null),
      })
    } else {
      // 혼합 — 웹 사진만 삭제
      setConfirmModal({
        message: t('trash.deleteAllMixedConfirm', { web: webTrashPhotos.length, local: localTrashPhotos.length }),
        onConfirm: doDelete,
      })
    }
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

  // 변경
  const handleAddToChapter = async (photoId: string, chapterId: string) => {
    try {
      await axios.post(`${API}/chapters/${chapterId}/photos`, { photo_id: photoId })
      await fetchChapterPhotoIds()   // ← await 추가
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

  const isAllActive = photoSubTab === 'all' && filterFolder === null && filterRating === null && filterColor === null && !filterHasNote

  const filteredPhotos = useMemo(() => photos.filter(photo => {
    if (photo.deleted_at) return false
    if (filterRating !== null) {
      if (filterRating === 0) { if (photo.rating !== null) return false }
      else { if (photo.rating !== filterRating) return false }
    }
    if (filterColor !== null && photo.color_label !== filterColor) return false
    if (filterFolder !== null && photo.folder !== filterFolder) return false
    if (filterHasNote && !photoNoteIds.has(photo.id)) return false
    return true
  }).map(photo => ({
    photo,
    takenAtMs: photo.taken_at ? new Date(photo.taken_at).getTime() : null
  })).sort((a, b) => {
    let result = 0
    if (sortBy === 'taken_at') {
      if (a.takenAtMs === null && b.takenAtMs === null) result = 0
      else if (a.takenAtMs === null) result = 1
      else if (b.takenAtMs === null) result = -1
      else result = a.takenAtMs - b.takenAtMs
    } else if (sortBy === 'name') {
      result = (a.photo.original_filename || '').localeCompare(b.photo.original_filename || '')
    } else {
      result = (a.photo.order ?? 0) - (b.photo.order ?? 0)
    }
    return sortOrder === 'desc' ? -result : result
  }).map(item => item.photo), [photos, filterRating, filterColor, filterFolder, filterHasNote, photoNoteIds, sortBy, sortOrder])

  const missingCount = photos.filter(p => p.local_missing && !p.deleted_at).length;

  // 🚀 [추가할 함수] 사진 선택/해제 토글
  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotoIds(prev => {
      const next = new Set(prev)
      if (next.has(photoId)) next.delete(photoId)
      else next.add(photoId)
      return next
    })
  }

  // 🚀 [추가할 함수] 선택된 사진들을 특정 챕터에 일괄 전송
  const handleBulkAddToChapter = async (chapterId: string) => {
    if (selectedPhotoIds.size === 0) return
    try {
      await axios.post(`${API}/chapters/${chapterId}/photos/bulk`, {
        photo_ids: Array.from(selectedPhotoIds)
      })
      // 성공 후 상태 초기화 및 새로고침
      const count = selectedPhotoIds.size
      setSelectionMode(false)
      setSelectedPhotoIds(new Set())
      setShowBulkChapterMenu(false)
      await fetchChapterPhotoIds()
      showToast(t('story.addMultiplePhotoSuccess', { count }), 'success')
    } catch (error) {
      console.error("일괄 추가 실패", error)
      showToast('챕터 추가에 실패했습니다.', 'error')
    }
  }

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
            <button onClick={handleResetAll}
              className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center justify-between ${isAllActive ? 'bg-black text-white font-semibold' : 'hover:bg-gray-50 text-gray-700'}`}>
              <span>{t('photo.allPhotos')}</span>
              <span className={isAllActive ? 'text-gray-300' : 'text-gray-400'}>{photos.filter(p => !p.deleted_at).length}</span>
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
                      <span className="flex items-center gap-1 min-w-0">
                        <span className="shrink-0">📁</span>
                        <span className="truncate">{getFolderDisplayName(folder!)}</span>
                        {isLocalSyncFolder(folder!) && (
                          <span className={`shrink-0 text-[10px] ${filterFolder === folder ? 'text-gray-300' : 'text-gray-400'}`}>💻</span>
                        )}
                      </span>
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
            <button onClick={() => { handleResetAll(); setPhotoSubTab('trash'); fetchTrash() }}
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

        <div className="border-t border-gray-100 my-2"></div>

        {/* 사진 다중 선택 - 챕터 추가 버튼 */}
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 mr-3 shrink-0">{t('filter.addToChapter')}</p>
          <div className="flex gap-1 flex-1">
            <button
              onClick={() => {
                setSelectionMode(v => !v)
                setSelectedPhotoIds(new Set()) // 끌 때 선택 초기화
                setShowBulkChapterMenu(false)
              }}
              className={`flex-1 py-1 text-xs rounded ${selectionMode ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
              {selectionMode ? t('common.cancel') : t('common.select')}
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100 my-2" />

        {/* 노트 필터 */}
        {(() => {
          const base = photos.filter(p => !p.deleted_at && (filterFolder === null || p.folder === filterFolder))
          return (
            <>
              <button onClick={() => { exitTrash(); setFilterHasNote(!filterHasNote) }}
                className={`w-full text-left px-2 py-3 text-xs rounded flex items-center justify-between ${filterHasNote ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
                <span>📝 {t('photo.hasNote')}</span>
                <span className={filterHasNote ? 'text-gray-300' : 'text-gray-400'}>{base.filter(p => photoNoteIds.has(p.id)).length}</span>
              </button>

              {/* 별점 필터 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500">{t('filter.rating')}</p>
                  <button onClick={handleClearRatings} className="text-xs text-gray-400 hover:text-red-500">{t('common.reset')}</button>
                </div>
                {[5, 4, 3, 2, 1].map(star => (
                  <button key={star} onClick={() => { exitTrash(); setFilterRating(filterRating === star ? null : star) }}
                    className={`w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between ${filterRating === star ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                    <span>{'★'.repeat(star)}{'☆'.repeat(5 - star)}</span>
                    <span className={filterRating === star ? 'text-gray-300' : 'text-gray-400'}>{base.filter(p => p.rating === star).length}</span>
                  </button>
                ))}
                <button onClick={() => { exitTrash(); setFilterRating(filterRating === 0 ? null : 0) }}
                  className={`w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between ${filterRating === 0 ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                  <span className={filterRating === 0 ? 'text-gray-300' : 'text-gray-400'}>{t('filter.unrated')}</span>
                  <span className={filterRating === 0 ? 'text-gray-300' : 'text-gray-400'}>{base.filter(p => !p.rating).length}</span>
                </button>
              </div>

              {/* 컬러 레이블 필터 */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500">{t('filter.colors')}</p>
                  <button onClick={handleClearColorLabels} className="text-xs text-gray-400 hover:text-red-500">{t('common.reset')}</button>
                </div>
                {colorLabels.map(label => (
                  <button key={label.value} onClick={() => { exitTrash(); setFilterColor(filterColor === label.value ? null : label.value) }}
                    className={`w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between ${filterColor === label.value ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                    <span className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full ${label.color}`} />{label.label}</span>
                    <span className={filterColor === label.value ? 'text-gray-300' : 'text-gray-400'}>{base.filter(p => p.color_label === label.value).length}</span>
                  </button>
                ))}
              </div>
            </>
          )
        })()}
      </div>
    )
  }, [isElectron, activeTab, photoSubTab, photos, trashedPhotos, uploading, gridCols, sortBy, sortOrder, showExif, filterRating, filterColor, filterFolder, filterHasNote, photoNoteIds, colorLabels, isAllActive, t])


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
          showExif={showExif}
          chapters={chapters}
          projectId={numericId!}
          photoChapterMap={photoChapterMap}
          onNoteChange={() => { setNotesVersion(v => v + 1); fetchPhotoNoteIds() }}
          onAddToChapter={handleAddToChapter}
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
          {project.description && <p className="text-gray-700 mb-2 max-w-2xl break-keep">{project.description}</p>}
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
          <div className={`${isElectron ? 'hidden' : ''} ${showFilter ? 'w-48' : 'w-6'} sticky top-24 shrink-0 transition-all duration-200`}>
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
                      onClick={handleResetAll}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center justify-between ${isAllActive ? 'bg-black text-white font-semibold' : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                      <span>{t('photo.allPhotos')}</span>
                      <span className={isAllActive ? 'text-gray-300' : 'text-gray-400'}>
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
                            <span className="flex items-center gap-1 min-w-0">
                              <span className="shrink-0">📁</span>
                              <span className="truncate">{getFolderDisplayName(folder!)}</span>
                              {isLocalSyncFolder(folder!) && (
                                <span className={`shrink-0 text-[10px] ${filterFolder === folder ? 'text-gray-300' : 'text-gray-400'}`}>💻</span>
                              )}
                            </span>
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
                      onClick={() => { handleResetAll(); setPhotoSubTab('trash'); fetchTrash(); }}
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

                {/* EXIF 정보 On/Off */}
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

                {/* 사진 다중 선택 - 챕터 추가 버튼 */}
                <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-500 mr-3 shrink-0">{t('filter.addToChapter')}</p>
                    <div className="flex gap-1 flex-1">
                      <button
                        onClick={() => {
                          setSelectionMode(v => !v)
                          setSelectedPhotoIds(new Set()) // 끌 때 선택 초기화
                          setShowBulkChapterMenu(false)
                        }}
                        className={`flex-1 py-1 text-xs rounded ${selectionMode ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                        {selectionMode ? t('common.cancel') : t('common.select')}
                      </button>
                    </div>
                </div>
                
                <div className="border-t border-gray-100 my-2"></div>

                {/* 노트 · 별점 · 컬러 필터 (폴더 선택 시 해당 폴더 내 카운트로 컨텍스트 반영) */}
                {(() => {
                  const base = photos.filter(p => !p.deleted_at && (filterFolder === null || p.folder === filterFolder))
                  return (
                    <>
                      {/* 노트 필터 */}
                      <button
                        onClick={() => { exitTrash(); setFilterHasNote(!filterHasNote) }}
                        className={`w-full text-left px-1.5 py-1.5 mb-2 text-xs rounded flex items-center justify-between ${filterHasNote ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-700'}`}
                      >
                        <span>📝 {t('photo.hasNote')}</span>
                        <span className={filterHasNote ? 'text-gray-300' : 'text-gray-400'}>
                          {base.filter(p => photoNoteIds.has(p.id)).length}
                        </span>
                      </button>

                      {/* 별점 필터 */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-gray-500">{t('filter.rating')}</p>
                          <button onClick={handleClearRatings} className="text-xs text-gray-400 hover:text-red-500">{t('common.reset')}</button>
                        </div>
                        {[5, 4, 3, 2, 1].map(star => (
                          <button key={star} onClick={() => { exitTrash(); setFilterRating(filterRating === star ? null : star) }}
                            className={`w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between ${filterRating === star ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                            <span>{'★'.repeat(star)}{'☆'.repeat(5 - star)}</span>
                            <span className={filterRating === star ? 'text-gray-300' : 'text-gray-400'}>{base.filter(p => p.rating === star).length}</span>
                          </button>
                        ))}
                        <button onClick={() => { exitTrash(); setFilterRating(filterRating === 0 ? null : 0) }}
                          className={`w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between ${filterRating === 0 ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                          <span className={filterRating === 0 ? 'text-gray-300' : 'text-gray-400'}>{t('filter.unrated')}</span>
                          <span className={filterRating === 0 ? 'text-gray-300' : 'text-gray-400'}>{base.filter(p => !p.rating).length}</span>
                        </button>
                      </div>

                      {/* 컬러 레이블 필터 */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-gray-500">{t('filter.colors')}</p>
                          <button onClick={handleClearColorLabels} className="text-xs text-gray-400 hover:text-red-500">{t('common.reset')}</button>
                        </div>
                        {colorLabels.map(label => (
                          <button key={label.value} onClick={() => { exitTrash(); setFilterColor(filterColor === label.value ? null : label.value) }}
                            className={`w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between ${filterColor === label.value ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                            <span className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full ${label.color}`} />{label.label}</span>
                            <span className={filterColor === label.value ? 'text-gray-300' : 'text-gray-400'}>{base.filter(p => p.color_label === label.value).length}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )
                })()}

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
                      onSetCover={handleSetCover}
                      onDelete={handleDeletePhoto}
                      onSetRating={handleSetRating} onSetColorLabel={handleSetColorLabel}
                      onOpenLightbox={setLightboxPhoto}
                      showExif={showExif} gridCols={gridCols}
                      colorLabels={colorLabels} chapterPhotoIds={chapterPhotoIds}
                      selectionMode={selectionMode}
                      isSelected={selectedPhotoIds.has(photo.id)}
                      onToggleSelect={togglePhotoSelection}
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
                  <div className="mb-4 flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-red-600">
                        🗑️ {t('photo.trash')} {trashedPhotos.length}{t('photo.countText')}
                      </p>
                      {localTrashPhotos.length > 0 && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          ⚠️ {t('trash.localSyncBadge')} {localTrashPhotos.length}{t('photo.countText')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleDeleteAllTrash}
                      disabled={deletingTrash}
                      className="shrink-0 text-xs px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded disabled:opacity-50"
                    >
                      {deletingTrash
                        ? t('photo.deleting')
                        : webTrashPhotos.length > 0 && localTrashPhotos.length > 0
                          ? t('photo.deleteAllPermanent') + ` (웹 ${webTrashPhotos.length}개)`
                          : t('photo.deleteAllPermanent')}
                    </button>
                  </div>
                )}
                {trashedPhotos.length === 0 ? (
                  <div className="text-center py-20 text-gray-400 border rounded-xl bg-gray-50">
                    <p className="text-lg mb-2">{t('photo.trashEmpty')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {trashedPhotos.map(photo => {
                      const deletedDate = new Date(photo.deleted_at!)
                      const daysLeft = 30 - Math.floor((Date.now() - deletedDate.getTime()) / (1000 * 60 * 60 * 24))
                      const isLocal = !canHardDelete(photo)

                      return (
                        <div key={photo.id} className="rounded overflow-hidden bg-transparent group relative shadow-sm border border-gray-200">
                          <div className="relative">
                            <img
                              src={photo.image_url}
                              alt={photo.caption || ''}
                              className="w-full aspect-[3/2] object-contain"
                            />
                            {isLocal && (
                              <div className="absolute top-1.5 left-1.5 z-10">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-500/90 text-white backdrop-blur-sm">
                                  {t('trash.localSyncBadge')}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 flex flex-col items-center justify-center gap-2 px-4 z-20">
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
                                if (isLocal) {
                                  showToast(
                                    !isElectron
                                      ? t('trash.permanentDeleteWebBlocked')
                                      : t('trash.permanentDeleteLocalExists'),
                                    'warning'
                                  )
                                  return
                                }
                                setConfirmModal({
                                  message: t('trash.permanentDeleteConfirm'),
                                  onConfirm: async () => {
                                    setConfirmModal(null)
                                    await axios.delete(`${API}/photos/${photo.id}/permanent`)
                                    fetchTrash()
                                  },
                                })
                              }}
                              className={`w-full text-center px-4 py-1.5 text-xs rounded font-medium shadow-lg ${
                                !isLocal
                                  ? 'bg-red-600 text-white hover:bg-red-700'
                                  : 'bg-gray-500 text-white hover:bg-gray-600'
                              }`}
                            >
                              ✕ {t('trash.permanentDelete')}
                            </button>
                          </div>
                          <div className="p-2 bg-transparent flex items-center justify-center h-10">
                            <p className="text-xs text-red-500 font-medium">
                              {t('trash.delete_warning', { daysLeft })}
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
          activeTab={activeTab}
          allPhotos={photos.filter(p => !p.deleted_at)}
          chapterPhotoCount={chapterPhotoVersion}
          onChapterChange={() => fetchChapterPhotoIds()}
        />
      </div>

      {DELIVERY_ENABLED && activeTab === 'delivery' && <DeliveryManager projectId={numericId!} />}

      <div style={{ display: activeTab === 'notes' ? 'block' : 'none' }}>
        <ProjectNotes
          projectId={numericId!}
          activeTab={activeTab}
          notesVersion={notesVersion}
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

      {/* 🚀 다중 선택 하단 플로팅 바 */}
      {selectionMode && activeTab === 'photos' && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-2xl flex items-center gap-8 z-[100] animate-fade-in-up">
          <div className="flex flex-col">
            <span className="font-bold text-sm">{t('story.multiplePhotoSelected', { count: selectedPhotoIds.size })}</span>
            <span className="text-xs text-gray-400">{t('story.addMultiplePhoto')}</span>
          </div>
          
          <div className="flex gap-3 relative">
            <button
              onClick={() => setShowBulkChapterMenu(v => !v)}
              disabled={selectedPhotoIds.size === 0}
              className="px-2 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-xs font-bold transition-colors"
            >
              📖 {t('story.addToChapter')}
            </button>

            {/* 챕터 목록 드롭다운 (위로 열림) */}
            {showBulkChapterMenu && selectedPhotoIds.size > 0 && (
              <div className="absolute bottom-full left-0 mb-3 w-64 bg-white rounded-lg shadow-xl text-black py-2 max-h-64 overflow-y-auto">
                {chapters.length === 0 ? (
                  <p className="text-xs text-gray-500 px-3 py-1.5">{t('story.noChapter')}</p>
                ) : (
                  chapters.filter(c => !c.parent_id).map((parent, pIdx) => (
                    <div key={parent.id}>
                      <button
                        onClick={() => handleBulkAddToChapter(parent.id)}
                        className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-xs font-bold text-gray-600"
                      >
                        {t('story.chapter')} {pIdx + 1}. {parent.title}
                      </button>
                      {chapters.filter(c => c.parent_id === parent.id).map((child, cIdx) => (
                        <button
                          key={child.id}
                          onClick={() => handleBulkAddToChapter(child.id)}
                          className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs text-gray-500 pl-8"
                        >
                          ↳ {pIdx + 1}.{cIdx + 1}. {child.title}
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            )}

            <button 
              onClick={() => {
                setSelectionMode(false)
                setSelectedPhotoIds(new Set())
                setShowBulkChapterMenu(false)
              }}
              className="px-2 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}