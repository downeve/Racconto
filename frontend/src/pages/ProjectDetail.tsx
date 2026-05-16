import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { Folder, Monitor, Trash2, FileText, MapPin, AlertTriangle, BookOpen, Grid3X3, ArrowUpDown, Info, Star, Upload, FolderUp, ArrowUp, Check } from 'lucide-react'

import ProjectStory from './ProjectStory'
import DeliveryManager from '../components/DeliveryManager'
import { useTranslation } from 'react-i18next'
import ProjectNotes from './ProjectNotes'
import { useElectronSidebar } from '../context/ElectronSidebarContext'
import ConfirmModal from '../components/ConfirmModal'
import ToastNotification from '../components/ToastNotification'
import { Lightbox, PhotoCard } from '../components/ProjectDetailComponents'
import type { Photo, Project, ChapterPhotoResponse, NoteResponse } from '../components/ProjectDetailComponents'

const API = import.meta.env.VITE_API_URL
const DELIVERY_ENABLED = import.meta.env.VITE_ENABLE_DELIVERY === 'true'

// state에 의존하지 않는 순수 함수 — 컴포넌트 밖에 정의해 매 렌더 재생성 방지
const getFolderDisplayName = (folder: string) =>
  folder.split(/[/\\]/).filter(Boolean).pop() ?? folder

const isLocalSyncFolder = (folder: string) =>
  folder.startsWith('/') || /^[A-Za-z]:\\/.test(folder)

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// File 객체에 webkitRelativePath 부여 (showDirectoryPicker/drag-drop 결과를 webkitdirectory와 동일하게 처리)
const assignRelativePath = (file: File, relPath: string): File => {
  try {
    Object.defineProperty(file, 'webkitRelativePath', { value: relPath, configurable: true })
    return file
  } catch {
    return file
  }
}

// File System Access API의 FileSystemDirectoryHandle 재귀 enumerate
const collectFilesFromDirHandle = async (
  dirHandle: any,
  prefix: string
): Promise<File[]> => {
  const out: File[] = []
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      const f: File = await entry.getFile()
      if (ALLOWED_IMAGE_TYPES.includes(f.type)) {
        out.push(assignRelativePath(f, `${prefix}/${f.name}`))
      }
    } else if (entry.kind === 'directory') {
      const sub = await collectFilesFromDirHandle(entry, `${prefix}/${entry.name}`)
      out.push(...sub)
    }
  }
  return out
}

// 드래그앤드롭의 FileSystemEntry 재귀 enumerate
const collectFilesFromEntry = async (entry: any, prefix: string): Promise<File[]> => {
  if (entry.isFile) {
    return new Promise<File[]>(resolve => {
      entry.file(
        (f: File) => {
          if (ALLOWED_IMAGE_TYPES.includes(f.type)) {
            resolve([assignRelativePath(f, prefix ? `${prefix}/${f.name}` : f.name)])
          } else {
            resolve([])
          }
        },
        () => resolve([])
      )
    })
  }
  if (entry.isDirectory) {
    const reader = entry.createReader()
    const allEntries: any[] = []
    // readEntries는 한 번에 100개씩만 반환하므로 빌 때까지 반복
    const readBatch = (): Promise<void> => new Promise(resolve => {
      reader.readEntries((entries: any[]) => {
        if (entries.length === 0) return resolve()
        allEntries.push(...entries)
        readBatch().then(resolve)
      }, () => resolve())
    })
    await readBatch()
    const subPrefix = prefix ? `${prefix}/${entry.name}` : entry.name
    const out: File[] = []
    for (const sub of allEntries) {
      out.push(...(await collectFilesFromEntry(sub, subPrefix)))
    }
    return out
  }
  return []
}

interface PhotosSidebarContentProps {
  photos: Photo[]
  trashedPhotos: Photo[]
  uploading: boolean
  uploadProgress: { current: number; total: number; type: 'photo' | 'folder' } | null
  photoSubTab: 'all' | 'folder' | 'trash'
  filterFolder: string | null
  filterRating: number | null
  filterColor: string | null
  filterHasNote: boolean
  photoNoteIds: Set<string>
  colorLabels: { value: string; color: string; label: string }[]
  isAllActive: boolean
  selectionMode: boolean
  handleUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'folder') => void
  onFolderUploadClick: () => void
  handleResetAll: () => void
  handleDeleteFolder: (folder: string) => void
  setFilterFolder: React.Dispatch<React.SetStateAction<string | null>>
  setPhotoSubTab: React.Dispatch<React.SetStateAction<'all' | 'folder' | 'trash'>>
  fetchTrash: () => void
  setSelectionMode: React.Dispatch<React.SetStateAction<boolean>>
  setSelectedPhotoIds: React.Dispatch<React.SetStateAction<Set<string>>>
  setShowBulkChapterMenu: React.Dispatch<React.SetStateAction<boolean>>
  exitTrash: () => void
  setFilterHasNote: React.Dispatch<React.SetStateAction<boolean>>
  setFilterRating: React.Dispatch<React.SetStateAction<number | null>>
  handleClearRatings: () => void
  setFilterColor: React.Dispatch<React.SetStateAction<string | null>>
  handleClearColorLabels: () => void
}

function PhotosSidebarContent({
  photos, trashedPhotos, uploading, uploadProgress,
  photoSubTab, filterFolder, filterRating, filterColor, filterHasNote,
  photoNoteIds, colorLabels, isAllActive, selectionMode,
  handleUpload, onFolderUploadClick, handleResetAll, handleDeleteFolder,
  setFilterFolder, setPhotoSubTab, fetchTrash,
  setSelectionMode, setSelectedPhotoIds, setShowBulkChapterMenu,
  exitTrash, setFilterHasNote, setFilterRating, handleClearRatings,
  setFilterColor, handleClearColorLabels,
}: PhotosSidebarContentProps) {
  const { t } = useTranslation()

  const si = (active: boolean) =>
    `relative w-full text-left px-2 py-1 rounded-[1px] flex items-center justify-between text-[0.8125rem] font-sans font-medium transition-colors duration-150 ${
      active
        ? 'bg-edit-ink/[0.06] text-edit-ink before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[2px] before:bg-edit-ink'
        : 'text-edit-muted hover:bg-edit-paper hover:text-edit-ink'
    }`

  const base = photos.filter(p => !p.deleted_at && (filterFolder === null || p.folder === filterFolder))

  return (
    <div className="p-4">
      {/* 업로드 버튼 */}
      <div className="mb-4 flex gap-1">
        <label className={`flex-1 cursor-pointer text-[0.8125rem] font-sans font-medium px-2 py-2 inline-flex items-center justify-center gap-1.5 bg-edit-ink/80 text-edit-paper hover:bg-edit-ink/90 rounded-[1px] transition-colors ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}>
          {uploading && uploadProgress?.type === 'photo'
            ? <><div className="w-3 h-3 border border-edit-paper/40 border-t-edit-paper rounded-full animate-spin shrink-0" />{uploadProgress.current} / {uploadProgress.total}</>
            : <><Upload size={12} strokeWidth={1.5} />{t('photo.uploadPhotos')}</>}
          <input type="file" accept="image/jpeg, image/png, image/webp" multiple className="hidden" onChange={e => handleUpload(e, 'photo')} disabled={uploading} />
        </label>
        <button
          type="button"
          onClick={onFolderUploadClick}
          disabled={uploading}
          className={`flex-1 cursor-pointer text-[0.8125rem] font-sans font-medium px-2 py-2 inline-flex items-center justify-center gap-1.5 border border-edit-line text-edit-muted hover:text-edit-ink hover:border-edit-line-strong rounded-[1px] transition-colors ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {uploading && uploadProgress?.type === 'folder'
            ? <><div className="w-3 h-3 border border-edit-muted/40 border-t-edit-muted rounded-full animate-spin shrink-0" />{uploadProgress.current} / {uploadProgress.total}</>
            : <><FolderUp size={12} strokeWidth={1.5} />{t('photo.uploadFolder')}</>}
        </button>
      </div>

      {/* 라이브러리 */}
      <div className="mb-3">
        <p className="t-caption text-edit-faint mb-1.5">{t('photo.library')}</p>
        <div className="flex flex-col gap-0.5">
          <button onClick={handleResetAll} className={si(isAllActive)}>
            <span>{t('photo.allPhotos')}</span>
            <span>{photos.filter(p => !p.deleted_at).length}</span>
          </button>
          {photos.some(p => p.folder) && (
            <div className="flex flex-col gap-0.5">
              {[...new Set(photos.filter(p => p.folder).map(p => p.folder))].map(folder => (
                <div key={folder} className="group/folder">
                  <button onClick={() => {
                    setFilterFolder(filterFolder === folder ? null : folder!)
                    setPhotoSubTab(filterFolder === folder ? 'all' : 'folder')
                  }} className={si(filterFolder === folder)}>
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Folder size={11} strokeWidth={1.5} className="shrink-0" />
                      <span className="truncate">{getFolderDisplayName(folder!)}</span>
                      {isLocalSyncFolder(folder!) && <Monitor size={10} strokeWidth={1.5} className="shrink-0 opacity-50" />}
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteFolder(folder!) }}
                        className="opacity-0 group-hover/folder:opacity-100 transition-opacity text-edit-line hover:text-edit-danger"
                        title={t('photo.moveToTrash')}
                      ><Trash2 size={11} strokeWidth={1.5} /></button>
                      <span>{photos.filter(p => p.folder === folder && !p.deleted_at).length}</span>
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => { handleResetAll(); setPhotoSubTab('trash'); fetchTrash() }}
            className={`${si(photoSubTab === 'trash')} ${photoSubTab !== 'trash' ? 'hover:text-edit-danger' : ''}`}>
            <span>{t('photo.trash')}</span>
            <span>{trashedPhotos.length}</span>
          </button>
        </div>
      </div>

      <div className="border-t border-edit-line my-3" />

      {/* 챕터 추가 다중 선택 토글 */}
      <div className="my-3">
        <button
          onClick={() => { setSelectionMode(v => !v); setSelectedPhotoIds(new Set()); setShowBulkChapterMenu(false) }}
          className={`w-full px-3 py-2 text-left text-[0.8125rem] font-sans font-medium inline-flex items-center justify-between rounded-[1px] transition-colors ${
            selectionMode
              ? 'bg-edit-ink text-edit-paper'
              : 'border border-edit-line text-edit-muted hover:text-edit-ink hover:border-edit-line-strong'
          }`}>
          <span>{t('filter.addToChapter')}</span>
          <span className="t-caption opacity-70">{selectionMode ? t('common.cancel') : t('common.select')}</span>
        </button>
      </div>

      <div className="border-t border-edit-line my-3" />

      {/* 노트 있는 사진 */}
      <button onClick={() => { exitTrash(); setFilterHasNote(!filterHasNote) }}
        className={`${si(filterHasNote)} mb-0.5`}>
        <span className="flex items-center gap-1.5"><FileText size={11} strokeWidth={1.5} />{t('photo.hasNote')}</span>
        <span>{base.filter(p => photoNoteIds.has(p.id)).length}</span>
      </button>

      {/* 별점 필터 */}
      <div className="mb-4 mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="t-caption text-edit-faint">{t('filter.rating')}</p>
          <button onClick={handleClearRatings} className="text-[0.8125rem] font-sans text-edit-faint hover:text-edit-danger transition-colors">{t('common.reset')}</button>
        </div>
        {[5, 4, 3, 2, 1].map(star => (
          <button key={star} onClick={() => { exitTrash(); setFilterRating(filterRating === star ? null : star) }}
            className={si(filterRating === star)}>
            <span className="flex gap-0.5">
              {[1,2,3,4,5].map(i => (
                <Star key={i} size={11} strokeWidth={1.25}
                  className={i <= star ? 'fill-edit-ink text-edit-ink' : 'text-edit-line-strong'} />
              ))}
            </span>
            <span>{base.filter(p => p.rating === star).length}</span>
          </button>
        ))}
        <button onClick={() => { exitTrash(); setFilterRating(filterRating === 0 ? null : 0) }}
          className={si(filterRating === 0)}>
          <span>{t('filter.unrated')}</span>
          <span>{base.filter(p => !p.rating).length}</span>
        </button>
      </div>

      {/* 컬러 라벨 필터 */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1.5">
          <p className="t-caption text-edit-faint">{t('filter.colors')}</p>
          <button onClick={handleClearColorLabels} className="text-[0.8125rem] font-sans text-edit-faint hover:text-edit-danger transition-colors">{t('common.reset')}</button>
        </div>
        {colorLabels.map(label => (
          <button key={label.value} onClick={() => { exitTrash(); setFilterColor(filterColor === label.value ? null : label.value) }}
            className={si(filterColor === label.value)}>
            <span className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${label.color}`} />{label.label}</span>
            <span>{base.filter(p => p.color_label === label.value).length}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ProjectDetail({
    electronTab,
  }: {
    electronTab?: 'photos' | 'story' | 'notes'
  }) {
  const { t } = useTranslation()

  const { id } = useParams()
  const queryClient = useQueryClient()
  const { triggerRefresh, uploadInProgress: uploading, uploadProgress, startUpload } = useElectronSidebar()

  const [activeTab, setActiveTab] = useState<'photos' | 'story' | 'notes' | 'delivery'>('photos')

  const isElectron = !!window.racconto

  const [photoSubTab, setPhotoSubTab] = useState<'all' | 'folder' | 'trash'>('all')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set())
  const [showBulkChapterMenu, setShowBulkChapterMenu] = useState(false)
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [filterColor, setFilterColor] = useState<string | null>(null)
  const [filterFolder, setFilterFolder] = useState<string | null>(null)
  const [showExif, setShowExif] = useState(true)
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null)
  const [chapterMenuPhoto, setChapterMenuPhoto] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'default' | 'taken_at' | 'name'>('default')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [deletingMissing, setDeletingMissing] = useState(false)
  const [deletingTrash, setDeletingTrash] = useState(false)
  const [linkedFolders, setLinkedFolders] = useState<Set<string>>(new Set())
  const [trashSelectedIds, setTrashSelectedIds] = useState<Set<string>>(new Set())
  const [filterHasNote, setFilterHasNote] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const dragDepthRef = useRef(0)
  const folderFallbackInputRef = useRef<HTMLInputElement | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [chapterPhotoVersion, setChapterPhotoVersion] = useState(0)

  // ── React Query ───────────────────────────────────────────
  const { data: project } = useQuery<Project>({
    queryKey: ['project', id],
    queryFn: async () => (await axios.get(`${API}/projects/${id}`)).data,
    enabled: !!id,
  })
  const numericId = project ? String(project.id) : null

  const { data: photos = [] } = useQuery<Photo[]>({
    queryKey: ['photos', numericId],
    queryFn: async () => (await axios.get(`${API}/photos/?project_id=${numericId}`)).data,
    enabled: !!numericId,
  })

  const { data: trashedPhotos = [] } = useQuery<Photo[]>({
    queryKey: ['photosTrash', numericId],
    queryFn: async () => (await axios.get(`${API}/photos/trash/${numericId}`)).data,
    enabled: !!numericId,
  })

  const { data: chapterData } = useQuery({
    queryKey: ['chapterPhotos', numericId],
    queryFn: async () => (await axios.get(`${API}/chapters/all-photo-ids?project_id=${numericId}`)).data,
    enabled: !!numericId,
  })

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await axios.get(`${API}/settings/`)).data,
  })

  const { data: notesData } = useQuery<NoteResponse[]>({
    queryKey: ['notes', numericId],
    queryFn: async () => (await axios.get(`${API}/notes/?project_id=${numericId}`)).data,
    enabled: !!numericId,
  })

  // ── Derived state ──────────────────────────────────────────
  const chapters = useMemo<{ id: string; title: string; parent_id?: string | null; order_num?: number }[]>(
    () => chapterData?.chapters ?? [], [chapterData]
  )
  const { chapterPhotoIds, photoChapterMap } = useMemo(() => {
    const ids = new Set<string>()
    const map = new Map<string, string>()
    chapterData?.photo_ids?.forEach((cp: ChapterPhotoResponse) => {
      if (cp.photo_id) { ids.add(cp.photo_id); map.set(cp.photo_id, cp.chapter_id) }
    })
    return { chapterPhotoIds: ids, photoChapterMap: map }
  }, [chapterData])

  const photoNoteIds = useMemo(() =>
    new Set<string>((notesData ?? []).filter(n => n.photo_id).map(n => n.photo_id as string)),
    [notesData]
  )

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, type })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }, [])

  const [gridCols, setGridCols] = useState(3)
  const [openDropdown, setOpenDropdown] = useState<'view' | 'sort' | 'exif' | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const labelSettings = useMemo(() => ({
    color_label_red:    settingsData?.['color_label_red']    || t('colors.reject'),
    color_label_yellow: settingsData?.['color_label_yellow'] || t('colors.hold'),
    color_label_green:  settingsData?.['color_label_green']  || t('colors.select'),
    color_label_blue:   settingsData?.['color_label_blue']   || t('colors.clientShare'),
    color_label_purple: settingsData?.['color_label_purple'] || t('colors.finalSelect'),
  }), [settingsData, t])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!settingsData) return
    setGridCols(parseInt(settingsData['default_grid_cols'] || '3'))
    setShowExif(settingsData['default_show_exif'] !== 'false')
    if (settingsData['default_sort_by']) setSortBy(settingsData['default_sort_by'])
    if (settingsData['default_sort_order']) setSortOrder(settingsData['default_sort_order'] as 'asc' | 'desc')
  }, [settingsData])

  useEffect(() => {
    if (id) setActiveTab('photos')
  }, [id])

  useEffect(() => {
    setChapterPhotoVersion(v => v + 1)
  }, [chapterData])

  const numericIdRef = useRef(numericId)
  useEffect(() => { numericIdRef.current = numericId }, [numericId])

  useEffect(() => {
    const handler = () => {
      if (!numericIdRef.current) return
      queryClient.invalidateQueries({ queryKey: ['photos', numericIdRef.current] })
    }
    window.addEventListener('racconto:uploadDone', handler)
    window.addEventListener('racconto:limitExceeded', handler)
    return () => {
      window.removeEventListener('racconto:uploadDone', handler)
      window.removeEventListener('racconto:limitExceeded', handler)
    }
  }, [queryClient])

  useEffect(() => {
    if (!window.racconto) return
    window.racconto.onDeletedFile((filePath: string) => {
      const filename = filePath.split('/').pop()
      queryClient.setQueryData(['photos', numericIdRef.current], (prev: Photo[] | undefined) =>
        (prev ?? []).map(p => p.original_filename === filename ? { ...p, local_missing: true } : p)
      )
    })
    return () => window.racconto?.offDeletedFile?.()
  }, [queryClient])

  useEffect(() => {
    if (!isElectron || !numericId) return
    const refresh = () => {
      window.racconto!.getAllMappings().then(mappings => {
        const folders = new Set(
          Object.entries(mappings)
            .filter(([, m]) => m.projectId === numericId)
            .map(([folderPath]) => folderPath)
        )
        setLinkedFolders(folders)
      })
    }
    refresh()
    window.racconto!.onFolderUnlinked(refresh)
  }, [numericId, isElectron])

  useEffect(() => {
    if (isElectron || !project) return
    setLinkedFolders(new Set(project.linked_folders ?? []))
  }, [project, isElectron])

  // Electron일 때 사이드바 탭과 동기화
  useEffect(() => {
    if (electronTab) {
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

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'folder') => {
    if (!e.target.files || !numericId) return
    const inputEl = e.target
    const validFiles = Array.from(e.target.files).filter(file => ALLOWED_IMAGE_TYPES.includes(file.type))
    inputEl.value = ''
    if (validFiles.length === 0) return
    startUpload(validFiles, numericId, photos.filter(p => p.original_filename != null) as any, type)
  }

  // showDirectoryPicker / drag-and-drop 공통: ConfirmModal로 이미지 개수 확인 후 업로드
  const confirmAndUpload = (files: File[], type: 'photo' | 'folder') => {
    if (!numericId) return
    if (files.length === 0) {
      showToast(t('photo.upload.noImagesFound'), 'warning')
      return
    }
    setConfirmModal({
      message: t('photo.upload.folderConfirm', { count: files.length }),
      onConfirm: () => {
        setConfirmModal(null)
        startUpload(files, numericId, photos.filter(p => p.original_filename != null) as any, type)
      },
    })
  }

  const handleFolderUploadClick = async () => {
    if (uploading || !numericId) return
    // Chrome/Edge: File System Access API — 브라우저 기본 alert 우회
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker()
        const files = await collectFilesFromDirHandle(dirHandle, dirHandle.name)
        confirmAndUpload(files, 'folder')
      } catch (err: any) {
        if (err?.name !== 'AbortError') console.error(err)
      }
      return
    }
    // Safari/Firefox: webkitdirectory input fallback (이 경우 브라우저 기본 확인창은 우회 불가)
    folderFallbackInputRef.current?.click()
  }

  const handleDragEnter = (e: React.DragEvent) => {
    if (uploading || activeTab !== 'photos') return
    if (!Array.from(e.dataTransfer.types).includes('Files')) return
    e.preventDefault()
    dragDepthRef.current++
    if (dragDepthRef.current === 1) setIsDragOver(true)
  }
  const handleDragOver = (e: React.DragEvent) => {
    if (uploading || activeTab !== 'photos') return
    if (!Array.from(e.dataTransfer.types).includes('Files')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }
  const handleDragLeave = (e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer.types).includes('Files')) return
    e.preventDefault()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setIsDragOver(false)
  }
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    dragDepthRef.current = 0
    setIsDragOver(false)
    if (uploading || activeTab !== 'photos' || !numericId) return

    const items = Array.from(e.dataTransfer.items)
    const hasFolder = items.some(it => {
      const entry = (it as any).webkitGetAsEntry?.()
      return entry?.isDirectory
    })

    const collected: File[] = []
    for (const item of items) {
      if (item.kind !== 'file') continue
      const entry = (item as any).webkitGetAsEntry?.()
      if (!entry) continue
      collected.push(...(await collectFilesFromEntry(entry, '')))
    }
    confirmAndUpload(collected, hasFolder ? 'folder' : 'photo')
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

      // 3. 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['project', id] })
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
    queryClient.invalidateQueries({ queryKey: ['project', id] })
    triggerRefresh()
  }

  const handleSetRating = async (photo: Photo, rating: number) => {
    // 1. 새 상태 계산 & 이전 상태 백업(롤백용)
    const newRating = photo.rating === rating ? null : rating;
    const previousRating = photo.rating;

    queryClient.setQueryData(['photos', numericId], (prev: Photo[] | undefined) =>
      (prev ?? []).map(p => p.id === photo.id ? { ...p, rating: newRating } : p)
    )
    if (lightboxPhoto?.id === photo.id) {
      setLightboxPhoto(prev => prev ? { ...prev, rating: newRating } : null)
    }

    try {
      await axios.put(`${API}/photos/${photo.id}`, { ...photo, rating: newRating })
    } catch (error) {
      console.error("별점 업데이트 실패, 롤백합니다.", error)
      queryClient.setQueryData(['photos', numericId], (prev: Photo[] | undefined) =>
        (prev ?? []).map(p => p.id === photo.id ? { ...p, rating: previousRating } : p)
      )
      if (lightboxPhoto?.id === photo.id) {
        setLightboxPhoto(prev => prev ? { ...prev, rating: previousRating } : null)
      }
    }
  }

  const handleSetColorLabel = async (photo: Photo, label: string) => {
    // 1. 새 상태 계산 & 이전 상태 백업(롤백용)
    const newLabel = photo.color_label === label ? null : label;
    const previousLabel = photo.color_label;

    queryClient.setQueryData(['photos', numericId], (prev: Photo[] | undefined) =>
      (prev ?? []).map(p => p.id === photo.id ? { ...p, color_label: newLabel } : p)
    )
    if (lightboxPhoto?.id === photo.id) {
      setLightboxPhoto(prev => prev ? { ...prev, color_label: newLabel } : null)
    }

    try {
      await axios.put(`${API}/photos/${photo.id}`, { ...photo, color_label: newLabel })
    } catch (error) {
      console.error("컬러 라벨 업데이트 실패, 롤백합니다.", error)
      queryClient.setQueryData(['photos', numericId], (prev: Photo[] | undefined) =>
        (prev ?? []).map(p => p.id === photo.id ? { ...p, color_label: previousLabel } : p)
      )
      if (lightboxPhoto?.id === photo.id) {
        setLightboxPhoto(prev => prev ? { ...prev, color_label: previousLabel } : null)
      }
    }
  }

  const handleRotatePhoto = async (photo: Photo, direction: 'left' | 'right') => {
    try {
      const res = await axios.post(`${API}/photos/${photo.id}/rotate`, { direction })
      const updatedPhoto: Photo = res.data
      queryClient.setQueryData(['photos', numericId], (prev: Photo[] | undefined) =>
        (prev ?? []).map(p => p.id === photo.id ? { ...p, image_url: updatedPhoto.image_url } : p)
      )
      if (lightboxPhoto?.id === photo.id) {
        setLightboxPhoto(prev => prev ? { ...prev, image_url: updatedPhoto.image_url } : null)
      }
      if (project?.cover_image_url === photo.image_url) {
        queryClient.invalidateQueries({ queryKey: ['project', id] })
        triggerRefresh()
      }
      showToast(t('photo.rotateSuccess'), 'success')
    } catch (error) {
      console.error('사진 회전 실패:', error)
      showToast(t('photo.rotateFail'), 'error')
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
        queryClient.invalidateQueries({ queryKey: ['photos', numericId] })
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
        queryClient.invalidateQueries({ queryKey: ['photos', numericId] })
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
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['photos', numericId] }),
            queryClient.invalidateQueries({ queryKey: ['photosTrash', numericId] }),
            queryClient.invalidateQueries({ queryKey: ['chapterPhotos', numericId] }),
            queryClient.invalidateQueries({ queryKey: ['notes', numericId] }),
            queryClient.invalidateQueries({ queryKey: ['project', id] }),
          ])
        } finally {
          setDeletingMissing(false)
        }
      },
    })
  }

  const canHardDelete = useCallback((photo: Photo): boolean => {
    if (photo.source !== 'electron' || !photo.folder) return true
    if (!linkedFolders.has(photo.folder)) return true
    return !!photo.local_missing
  }, [linkedFolders])

  const webTrashPhotos = useMemo(
    () => trashedPhotos.filter(p => canHardDelete(p)),
    [trashedPhotos, canHardDelete]
  )
  const localTrashPhotos = useMemo(
    () => trashedPhotos.filter(p => !canHardDelete(p)),
    [trashedPhotos, canHardDelete]
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
        await queryClient.invalidateQueries({ queryKey: ['photosTrash', numericId] })
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
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['photos', numericId] }),
          queryClient.invalidateQueries({ queryKey: ['photosTrash', numericId] }),
          queryClient.invalidateQueries({ queryKey: ['chapterPhotos', numericId] }),
          queryClient.invalidateQueries({ queryKey: ['notes', numericId] }),
          queryClient.invalidateQueries({ queryKey: ['project', id] }),
        ])
      },
    })
  }

  // 변경
  const handleAddToChapter = async (photoId: string, chapterId: string) => {
    const currentChapterId = photoChapterMap.get(photoId)
    try {
      if (currentChapterId === chapterId) {
        await axios.delete(`${API}/chapters/${chapterId}/photos/${photoId}`)
      } else {
        if (currentChapterId) {
          await axios.delete(`${API}/chapters/${currentChapterId}/photos/${photoId}`)
        }
        await axios.post(`${API}/chapters/${chapterId}/photos`, { photo_id: photoId })
      }
      await queryClient.invalidateQueries({ queryKey: ['chapterPhotos', numericId] })
      queryClient.removeQueries({ queryKey: ['storyChapters', id] })
    } catch {
      // 오류 무시
    }
    setChapterMenuPhoto(null)
  }

  // 변경 후
  const colorLabels = useMemo(() => [
    { value: 'red',    color: 'bg-label-red',    label: labelSettings['color_label_red'] },
    { value: 'yellow', color: 'bg-label-yellow', label: labelSettings['color_label_yellow'] },
    { value: 'green',  color: 'bg-label-green',  label: labelSettings['color_label_green'] },
    { value: 'blue',   color: 'bg-label-blue',   label: labelSettings['color_label_blue'] },
    { value: 'purple', color: 'bg-label-purple', label: labelSettings['color_label_purple'] },
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

  const missingCount = useMemo(
    () => photos.filter(p => p.local_missing && !p.deleted_at).length,
    [photos]
  )

  // 🚀 [추가할 함수] 사진 선택/해제 토글
  const togglePhotoSelection = useCallback((photoId: string) => {
    setSelectedPhotoIds(prev => {
      const next = new Set(prev)
      if (next.has(photoId)) next.delete(photoId)
      else next.add(photoId)
      return next
    })
  }, [])

  const handleBulkAddToChapter = async (chapterId: string) => {
    if (selectedPhotoIds.size === 0) return
    try {
      await axios.post(`${API}/chapters/${chapterId}/photos/bulk`, {
        photo_ids: Array.from(selectedPhotoIds)
      })
      const count = selectedPhotoIds.size
      setSelectionMode(false)
      setSelectedPhotoIds(new Set())
      setShowBulkChapterMenu(false)
      await queryClient.invalidateQueries({ queryKey: ['chapterPhotos', numericId] })
      queryClient.removeQueries({ queryKey: ['storyChapters', id] })
      showToast(t('story.addMultiplePhotoSuccess', { count }), 'success')
    } catch (error) {
      console.error('일괄 추가 실패', error)
      showToast('챕터 추가에 실패했습니다.', 'error')
    }
  }



  if (!project) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-edit-line border-t-edit-ink rounded-full animate-spin" />
    </div>
  )

  const sidebarSlot = document.getElementById('sidebar-content-slot')

  return (
    <div
      className="p-6 max-w-7xl mx-auto px-6 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="fixed inset-0 z-modal bg-edit-ink/15 backdrop-blur-[2px] border-2 border-dashed border-edit-ink pointer-events-none flex items-center justify-center">
          <p className="text-h3 text-edit-ink">{t('photo.upload.dropHere')}</p>
        </div>
      )}
      {sidebarSlot && activeTab === 'photos' && createPortal(
        <PhotosSidebarContent
          photos={photos}
          trashedPhotos={trashedPhotos}
          uploading={uploading}
          uploadProgress={uploadProgress}
          photoSubTab={photoSubTab}
          filterFolder={filterFolder}
          filterRating={filterRating}
          filterColor={filterColor}
          filterHasNote={filterHasNote}
          photoNoteIds={photoNoteIds}
          colorLabels={colorLabels}
          isAllActive={isAllActive}
          selectionMode={selectionMode}
          handleUpload={handleUpload}
          onFolderUploadClick={handleFolderUploadClick}
          handleResetAll={handleResetAll}
          handleDeleteFolder={handleDeleteFolder}
          setFilterFolder={setFilterFolder}
          setPhotoSubTab={setPhotoSubTab}
          fetchTrash={() => queryClient.invalidateQueries({ queryKey: ['photosTrash', numericId] })}
          setSelectionMode={setSelectionMode}
          setSelectedPhotoIds={setSelectedPhotoIds}
          setShowBulkChapterMenu={setShowBulkChapterMenu}
          exitTrash={exitTrash}
          setFilterHasNote={setFilterHasNote}
          setFilterRating={setFilterRating}
          handleClearRatings={handleClearRatings}
          setFilterColor={setFilterColor}
          handleClearColorLabels={handleClearColorLabels}
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
          onNoteChange={() => queryClient.invalidateQueries({ queryKey: ['notes', numericId] })}
          onAddToChapter={handleAddToChapter}
          onRotate={handleRotatePhoto}
        />
      )}

      <div className="mb-8 flex items-start justify-between gap-6 max-w-5xl">
        <div className="flex-1">
          <h1 className="font-serif text-h2 font-normal tracking-tight mb-2">
            {project.title}
          </h1>
          {project.location && (
            <p className="t-loc text-edit-muted mb-3">
              <MapPin size={11} strokeWidth={1.25} />{project.location}
            </p>
          )}
          {project.description && (
            <p className="font-serif text-body text-edit-ink/85 leading-[1.7] break-keep max-w-2xl">
              {project.description}
            </p>
          )}
        </div>
        {project.cover_image_url && (
          <div className="shrink-0 flex flex-col items-center gap-2">
            <img src={project.cover_image_url} alt="커버" className="w-24 h-24 object-cover rounded-[2px]" />
            <button onClick={handleRemoveCover} className="t-eyebrow text-edit-muted hover:text-edit-danger transition-colors">{t('photo.removeCover')}</button>
          </div>
        )}
      </div>

      {chapterMenuPhoto && (
        <div className="fixed inset-0 bg-black/55 z-modal flex items-center justify-center backdrop-blur-sm"
          onClick={() => setChapterMenuPhoto(null)}>
          <div className="bg-edit-paper rounded-[2px] p-6 min-w-[340px] max-w-[440px] shadow-[0_24px_64px_rgba(0,0,0,0.18)]"
            onClick={e => e.stopPropagation()}>
            <h3 className="font-serif text-body font-normal mb-4">{t('story.selectChapter')}</h3>
            <div>
              {chapters.length === 0 ? (
                <div className="text-center py-6 text-edit-faint text-small">
                  <p>{t('story.noChapter')}</p>
                  <p className="mt-1">{t('story.noChapter2')}</p>
                </div>
              ) : (() => {
                const currentChapterId = photoChapterMap.get(chapterMenuPhoto!)
                return chapters.filter(c => !c.parent_id).map((parent, pIdx) => (
                  <div key={parent.id}>
                    <button
                      onClick={() => handleAddToChapter(chapterMenuPhoto!, parent.id)}
                      className="w-full text-left px-3 py-2 text-small rounded-[1px] hover:bg-edit-paper-2 text-edit-ink whitespace-nowrap flex items-center justify-between gap-4">
                      <span>Ch. {pIdx + 1}. {parent.title}</span>
                      {currentChapterId === parent.id && <Check size={12} strokeWidth={2} className="text-green-600 shrink-0" />}
                    </button>
                    {chapters.filter(child => child.parent_id === parent.id).map((child, cIdx) => (
                      <button key={child.id}
                        onClick={() => handleAddToChapter(chapterMenuPhoto!, child.id)}
                        className="w-full text-left px-3 py-2 text-small rounded-[1px] hover:bg-edit-paper-2 text-edit-muted pl-9 whitespace-nowrap flex items-center justify-between gap-4">
                        <span>Ch. {pIdx + 1}.{cIdx + 1}. {child.title}</span>
                        {currentChapterId === child.id && <Check size={12} strokeWidth={2} className="text-green-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                ))
              })()}
            </div>
            <button onClick={() => setChapterMenuPhoto(null)}
              className="mt-4 w-full t-caption text-edit-muted hover:text-edit-ink transition-colors">{t('common.close')}</button>
          </div>
        </div>
      )}

      {/* 사진 탭 — 필터/업로드 패널은 사이드바(Portal)로 렌더 */}
      <div style={{ display: activeTab === 'photos' ? 'block' : 'none' }}>
        {/* 폴더 업로드 fallback (Safari/Firefox 등 showDirectoryPicker 미지원 시) */}
        <input
          ref={folderFallbackInputRef}
          type="file"
          accept="image/jpeg, image/png, image/webp"
          multiple
          className="hidden"
          onChange={e => handleUpload(e, 'folder')}
          disabled={uploading}
          {...{ webkitdirectory: '' } as any}
        />

          {/* 사진 갤러리 */}

            {/* ── 사진 탭 툴바 ── */}
            {photoSubTab !== 'trash' && (
            <div ref={dropdownRef} className="flex items-center gap-1.5 mb-3 relative">
              {(() => {
                const toolbarBtn = (active: boolean) =>
                  `p-1.5 rounded-[1px] inline-flex items-center gap-1.5 t-caption transition-colors duration-150 ${
                    active ? 'bg-edit-ink text-edit-paper' : 'text-edit-muted hover:text-edit-ink hover:bg-edit-paper'
                  }`
                const dropdownPanel = 'absolute top-full mt-1 bg-edit-paper border border-edit-line rounded-[2px] shadow-[0_8px_24px_rgba(0,0,0,0.06)] z-popover'
                return (
                  <>
                    {/* 뷰 */}
                    <button
                      onClick={() => setOpenDropdown(openDropdown === 'view' ? null : 'view')}
                      className={toolbarBtn(openDropdown === 'view')}
                      title={t('filter.view')}
                    >
                      <Grid3X3 size={14} strokeWidth={1.5} />
                      <span>{gridCols}</span>
                    </button>
                    {openDropdown === 'view' && (
                      <div className={`${dropdownPanel} left-0 p-1.5 flex gap-1`}>
                        {[2, 3, 4, 5].map(cols => (
                          <button key={cols} onClick={() => { setGridCols(cols); setOpenDropdown(null) }}
                            className={`w-8 h-8 t-caption rounded-[1px] ${gridCols === cols ? 'bg-edit-ink text-edit-paper' : 'text-edit-muted hover:bg-edit-paper-2'}`}>
                            {cols}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 정렬 */}
                    <button
                      onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
                      className={toolbarBtn(openDropdown === 'sort')}
                      title={t('photo.listOrder')}
                    >
                      <ArrowUpDown size={14} strokeWidth={1.5} />
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    </button>
                    {openDropdown === 'sort' && (
                      <div className={`${dropdownPanel} left-0 p-2 min-w-[160px]`}>
                        <div className="flex justify-between items-center mb-2 px-1">
                          <span className="t-eyebrow text-edit-muted">{t('photo.listOrder')}</span>
                          <button onClick={() => { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); setOpenDropdown(null) }}
                            className="t-caption px-2 py-0.5 rounded-[1px] text-edit-muted hover:text-edit-ink hover:bg-edit-paper-2 transition-colors">
                            {sortOrder === 'asc' ? t('photo.orderAsc') : t('photo.orderDesc')}
                          </button>
                        </div>
                        {([['default', t('photo.orderUpload')], ['taken_at', t('photo.orderTaken')], ['name', t('photo.orderName')]] as const).map(([key, label]) => (
                          <button key={key} onClick={() => { setSortBy(key as 'default' | 'taken_at' | 'name'); setOpenDropdown(null) }}
                            className={`w-full text-left px-2 py-1.5 t-caption rounded-[1px] transition-colors ${sortBy === key ? 'bg-edit-ink text-edit-paper' : 'text-edit-muted hover:bg-edit-paper-2 hover:text-edit-ink'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* EXIF */}
                    <button
                      onClick={() => setOpenDropdown(openDropdown === 'exif' ? null : 'exif')}
                      className={toolbarBtn(openDropdown === 'exif')}
                      title={t('filter.exifOnOff')}
                    >
                      <Info size={14} strokeWidth={1.5} />
                      <span>EXIF</span>
                    </button>
                    {openDropdown === 'exif' && (
                      <div className={`${dropdownPanel} left-[5.5rem] p-1.5 flex gap-1`}>
                        {[true, false].map(val => (
                          <button key={String(val)} onClick={() => { setShowExif(val); setOpenDropdown(null) }}
                            className={`px-3 py-1 t-caption rounded-[1px] transition-colors ${showExif === val ? 'bg-edit-ink text-edit-paper' : 'text-edit-muted hover:bg-edit-paper-2'}`}>
                            {val ? 'On' : 'Off'}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
            )}

            {/* 전체 사진 뷰 */}
            {(photoSubTab === 'all' || photoSubTab === 'folder')&& (
              <div>
                  {/* local_missing 일괄 삭제 버튼 — Electron 앱 + missing 사진 있을 때만 표시 */}
                  {/* ✅ photos.some 대신 missingCount > 0 으로 수정 */}
                  {missingCount > 0 && (
                    <div className="my-3 px-4 py-3 border-l-2 border-edit-warning bg-edit-warning/[0.04] flex items-center justify-between">
                      <p className="t-caption text-edit-ink/85 inline-flex items-center gap-2">
                        <AlertTriangle size={12} strokeWidth={1.5} className="shrink-0 text-edit-warning" />
                        {t('photo.local.MissingWarning', { count: missingCount })}
                      </p>
                      <button
                        onClick={handleDeleteAllMissing}
                        disabled={deletingMissing}
                        className="t-caption px-3 py-1.5 border border-edit-warning text-edit-warning hover:bg-edit-warning hover:text-edit-paper rounded-[1px] transition-colors disabled:opacity-50"
                      >
                        {deletingMissing ? t('photo.deleting') : t('photo.deleteAll')}
                      </button>
                    </div>
                  )}
                <div className={`grid gap-4 ${
                  gridCols === 2 ? 'grid-cols-2' : 
                  gridCols === 3 ? 'grid-cols-3' :
                  gridCols === 4 ? 'grid-cols-4' : 'grid-cols-5'
                }`}>
                  {filteredPhotos.map(photo => (
                    <PhotoCard
                      key={photo.id} photo={photo} project={project}
                      onSetCover={handleSetCover}
                      onSetRating={handleSetRating} onSetColorLabel={handleSetColorLabel}
                      onOpenLightbox={setLightboxPhoto}
                      showExif={showExif} gridCols={gridCols}
                      colorLabels={colorLabels} chapterPhotoIds={chapterPhotoIds}
                      selectionMode={selectionMode}
                      isSelected={selectedPhotoIds.has(photo.id)}
                      anySelected={selectedPhotoIds.size > 0}
                      onToggleSelect={togglePhotoSelection}
                    />
                  ))}
                </div>

                {filteredPhotos.length === 0 && (
                  <div className="text-center text-h3 py-20 text-muted">
                    {photos.length === 0
                      ? <><p className="mb-2">{t('photo.noPhotos')}</p></>
                      : <><p className="mb-2">{t('filter.noMatch')}</p></>}
                  </div>
                )}
              </div>
            )}

            {/* 휴지통 뷰 */}
            {photoSubTab === 'trash' && (
              <div>
                {/* 상단 바: 전체 삭제 or 다중 선택 액션 */}
                {trashedPhotos.length > 0 && (
                  trashSelectedIds.size > 0 ? (
                    <div className="mb-4 flex items-center justify-between bg-edit-paper border border-edit-line rounded-card px-3 py-2 gap-3">
                      <span className="text-menu text-edit-ink font-medium">
                        {t('trash.selectedCount', { count: trashSelectedIds.size })}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setTrashSelectedIds(new Set())}
                          className="text-menu px-3 py-1.5 border border-edit-line text-edit-muted hover:text-edit-ink rounded transition-colors"
                        >
                          {t('trash.deselectAll')}
                        </button>
                        <button
                          onClick={async () => {
                            const ids = Array.from(trashSelectedIds)
                            try {
                              await axios.post(`${API}/photos/bulk-restore`, { photo_ids: ids })
                              queryClient.invalidateQueries({ queryKey: ['photosTrash', numericId] })
                              queryClient.invalidateQueries({ queryKey: ['photos', numericId] })
                              setTrashSelectedIds(new Set())
                            } catch (err: any) {
                              const detail = err.response?.data?.detail
                              const code = typeof detail === 'object' ? detail.code : detail
                              const limit = typeof detail === 'object' ? detail.limit : undefined
                              if (code === 'PHOTO_LIMIT_EXCEEDED') {
                                showToast(t('api.error.PHOTO_LIMIT_EXCEEDED', { limit }), 'warning')
                              }
                            }
                          }}
                          className="text-menu px-3 py-1.5 bg-edit-ink text-edit-paper rounded hover:bg-edit-ink/85 transition-colors"
                        >
                          ↺ {t('trash.bulkRestore')}
                        </button>
                        <button
                          onClick={() => {
                            const ids = Array.from(trashSelectedIds)
                            const deletable = ids.filter(id => {
                              const p = trashedPhotos.find(p => p.id === id)
                              return p && canHardDelete(p)
                            })
                            const skipped = ids.length - deletable.length
                            if (deletable.length === 0) {
                              showToast(
                                !isElectron
                                  ? t('trash.permanentDeleteWebBlocked')
                                  : t('trash.permanentDeleteLocalExists'),
                                'warning'
                              )
                              return
                            }
                            const msg = skipped > 0
                              ? t('trash.bulkDeleteLocalSkipped', { skipped, count: deletable.length })
                              : t('trash.bulkDeleteConfirm', { count: deletable.length })
                            setConfirmModal({
                              message: msg,
                              onConfirm: async () => {
                                setConfirmModal(null)
                                await axios.delete(`${API}/photos/bulk-permanent`, { data: { photo_ids: deletable } })
                                queryClient.invalidateQueries({ queryKey: ['photosTrash', numericId] })
                                setTrashSelectedIds(new Set())
                              },
                            })
                          }}
                          className="text-menu px-3 py-1.5 bg-red-500 hover:bg-red-600 text-card rounded transition-colors"
                        >
                          ✕ {t('trash.bulkDelete')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 flex items-center justify-between bg-red-50 border border-red-200 rounded-card px-3 py-2 gap-3">
                      <div className="min-w-0">
                        <p className="text-menu text-red-600 flex items-center gap-1">
                          <Trash2 size={13} strokeWidth={1.5} className="shrink-0" />{t('photo.trash')} {trashedPhotos.length}{t('photo.countText')}
                        </p>
                        {localTrashPhotos.length > 0 && (
                          <p className="text-caption text-amber-600 mt-0.5 flex items-center gap-1">
                            <AlertTriangle size={11} strokeWidth={1.5} className="shrink-0" />{t('trash.localSyncBadge')} {localTrashPhotos.length}{t('photo.countText')}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={handleDeleteAllTrash}
                        disabled={deletingTrash}
                        className="shrink-0 text-menu px-3 py-1.5 bg-red-500 hover:bg-red-600 text-card rounded disabled:opacity-50"
                      >
                        {deletingTrash
                          ? t('photo.deleting')
                          : webTrashPhotos.length > 0 && localTrashPhotos.length > 0
                            ? t('photo.deleteAllPermanent') + ` (웹 ${webTrashPhotos.length}개)`
                            : t('photo.deleteAllPermanent')}
                      </button>
                    </div>
                  )
                )}
                {trashedPhotos.length === 0 ? (
                  <div className="text-center text-h3 py-20 text-muted border rounded-card bg-card">
                    <p className="mb-2">{t('photo.trashEmpty')}</p>
                  </div>
                ) : (
                  <div className={`grid grid-cols-${gridCols} gap-4`}>
                    {[...trashedPhotos]
                      .sort((a, b) => new Date(b.deleted_at!).getTime() - new Date(a.deleted_at!).getTime())
                      .map(photo => {
                        const deletedDate = new Date(photo.deleted_at!)
                        const daysLeft = 30 - Math.floor((Date.now() - deletedDate.getTime()) / (1000 * 60 * 60 * 24))
                        const isLocal = !canHardDelete(photo)
                        const isSelected = trashSelectedIds.has(photo.id)

                        return (
                          <div
                            key={photo.id}
                            className={`rounded overflow-hidden bg-transparent group relative shadow transition-[box-shadow] ${
                              isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-edit-line-strong' : ''
                            }`}
                          >
                            <div className="relative">
                              <img
                                src={photo.image_url}
                                alt={photo.caption || ''}
                                className="w-full aspect-[3/2] object-contain"
                              />
                              {isLocal && !isSelected && (
                                <div className="absolute top-1.5 left-1.5 z-10">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-eyebrow font-medium rounded bg-amber-500/90 text-card backdrop-blur-sm">
                                    {t('trash.localSyncBadge')}
                                  </span>
                                </div>
                              )}
                              {/* 선택 체크박스 — 좌상단 네모, z-30으로 오버레이 위 */}
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  setTrashSelectedIds(prev => {
                                    const next = new Set(prev)
                                    next.has(photo.id) ? next.delete(photo.id) : next.add(photo.id)
                                    return next
                                  })
                                }}
                                className={`absolute top-1.5 left-1.5 z-30 w-5 h-5 rounded flex items-center justify-center transition-opacity ${
                                  isSelected || trashSelectedIds.size > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                } ${isSelected ? 'bg-white' : 'bg-black/40 border border-white/60'}`}
                                aria-label={isSelected ? '선택 해제' : '선택'}
                              >
                                {isSelected && <Check size={11} strokeWidth={2.5} className="text-edit-ink" />}
                              </button>
                            </div>
                            {/* 호버 오버레이 — 선택 모드 아닐 때만 */}
                            {trashSelectedIds.size === 0 && (
                              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 flex flex-col items-center justify-center gap-2 px-4 z-20">
                                <button
                                  onClick={async () => {
                                    const prevPhotos = queryClient.getQueryData<Photo[]>(['photos', numericId]) ?? []
                                    const prevTrash = queryClient.getQueryData<Photo[]>(['photosTrash', numericId]) ?? []
                                    queryClient.setQueryData(['photosTrash', numericId], (prev: Photo[] | undefined) =>
                                      (prev ?? []).filter(p => p.id !== photo.id)
                                    )
                                    queryClient.setQueryData(['photos', numericId], (prev: Photo[] | undefined) =>
                                      [...(prev ?? []), { ...photo, deleted_at: null }]
                                    )
                                    try {
                                      await axios.post(`${API}/photos/${photo.id}/restore`)
                                      queryClient.invalidateQueries({ queryKey: ['chapterPhotos', numericId] })
                                    } catch (err: any) {
                                      queryClient.setQueryData(['photos', numericId], prevPhotos)
                                      queryClient.setQueryData(['photosTrash', numericId], prevTrash)
                                      const detail = err.response?.data?.detail
                                      const code = typeof detail === 'object' ? detail.code : detail
                                      const limit = typeof detail === 'object' ? detail.limit : undefined
                                      if (code === 'PHOTO_LIMIT_EXCEEDED') {
                                        showToast(t('api.error.PHOTO_LIMIT_EXCEEDED', { limit }), 'warning')
                                      }
                                    }
                                  }}
                                  className="w-full text-center px-3 py-1.5 text-menu bg-card text-ink rounded-card hover:bg-hair font-medium shadow"
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
                                        queryClient.invalidateQueries({ queryKey: ['photosTrash', numericId] })
                                      },
                                    })
                                  }}
                                  className={`w-full text-center px-3 py-1.5 text-menu rounded-card font-medium shadow ${
                                    !isLocal ? 'bg-red-600 text-card hover:bg-red-700' : 'bg-gray-500 text-card hover:bg-gray-600'
                                  }`}
                                >
                                  ✕ {t('trash.permanentDelete')}
                                </button>
                              </div>
                            )}
                            <div className="p-2 bg-transparent flex items-center justify-center h-10">
                              <p className="text-menu text-red-500 font-medium">
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

      <div style={{ display: activeTab === 'story' ? 'block' : 'none' }}>
        <ProjectStory
          projectId={numericId!}
          activeTab={activeTab}
          allPhotos={photos.filter(p => !p.deleted_at)}
          chapterPhotoCount={chapterPhotoVersion}
          onChapterChange={() => queryClient.invalidateQueries({ queryKey: ['chapterPhotos', numericId] })}
        />
      </div>

      {DELIVERY_ENABLED && activeTab === 'delivery' && <DeliveryManager projectId={numericId!} />}

      <div style={{ display: activeTab === 'notes' ? 'block' : 'none' }}>
        <ProjectNotes
          projectId={numericId!}
          activeTab={activeTab}
          photos={photos.filter(p => !p.deleted_at)}
        />
      </div>
      
      {/* ⬆️ 맨 위로 가기 플로팅 버튼 */}
      {!lightboxPhoto && (
      <button
        id="floating-top-button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-8 right-8 w-10 h-10 bg-edit-ink text-edit-paper rounded-full flex items-center justify-center shadow-deep hover:opacity-80 transition-opacity z-40"
        title="Top"
      >
        <ArrowUp size={16} strokeWidth={1.5} />
      </button>
      )}

      {/* 🚀 다중 선택 하단 플로팅 바 */}
      {(selectionMode || selectedPhotoIds.size > 0) && activeTab === 'photos' && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-canvas-2 border border-ink-2 px-3 py-2 rounded-card shadow flex items-center gap-8 z-[100] animate-fade-in-up">
          <div className="flex flex-col">
            <span className="font-bold text-menu text-ink-2">{t('story.multiplePhotoSelected', { count: selectedPhotoIds.size })}</span>
            {/* <span className="text-menu text-card">{t('story.addMultiplePhoto')}</span> */}
          </div>
          
          <div className="flex gap-3 relative">
            {selectionMode ? (
              /* 챕터에 추가 모드 */
              <>
                <button
                  onClick={() => setShowBulkChapterMenu(v => !v)}
                  disabled={selectedPhotoIds.size === 0}
                  className="inline-flex items-center gap-1.5 px-2 py-1.5 font-bold text-menu btn-secondary-on-card border hover:bg-faint/40 border-muted disabled:text-faint transition-[background,color,border] duration-150 ease-out"
                >
                  <BookOpen size={13} strokeWidth={1.5} />{t('story.addToChapter')}
                </button>

                {/* 챕터 목록 드롭다운 (위로 열림) */}
                {showBulkChapterMenu && selectedPhotoIds.size > 0 && (
                  <div className="absolute bottom-full left-0 mb-3 bg-card rounded-card shadow text-ink py-2 max-h-64 overflow-y-auto min-w-max">
                    {chapters.length === 0 ? (
                      <p className="text-menu text-muted px-3 py-1.5 whitespace-nowrap">{t('story.noChapter')}</p>
                    ) : (
                      chapters.filter(c => !c.parent_id).map((parent, pIdx) => (
                        <div key={parent.id}>
                          <button
                            onClick={() => handleBulkAddToChapter(parent.id)}
                            className="block w-full text-left px-3 py-1.5 rounded-card hover:bg-hair text-menu text-ink-2 whitespace-nowrap"
                          >
                            Ch. {pIdx + 1}. {parent.title}
                          </button>
                          {chapters.filter(c => c.parent_id === parent.id).map((child, cIdx) => (
                            <button
                              key={child.id}
                              onClick={() => handleBulkAddToChapter(child.id)}
                              className="block w-full text-left px-3 py-1.5 rounded-card hover:bg-hair text-menu text-muted pl-8 whitespace-nowrap"
                            >
                              Ch. {pIdx + 1}.{cIdx + 1}. {child.title}
                            </button>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            ) : (
              /* 일반 다중 선택 모드 — 삭제만 */
              <button
                onClick={() => {
                  if (selectedPhotoIds.size === 0) return
                  setConfirmModal({
                    message: t('photo.bulkDeleteConfirm', { count: selectedPhotoIds.size }),
                    onConfirm: async () => {
                      setConfirmModal(null)
                      await axios.delete(`${API}/photos/bulk-delete`, { data: { photo_ids: Array.from(selectedPhotoIds) } })
                      queryClient.invalidateQueries({ queryKey: ['photos', numericId] })
                      queryClient.invalidateQueries({ queryKey: ['photosTrash', numericId] })
                      setSelectedPhotoIds(new Set())
                    },
                  })
                }}
                disabled={selectedPhotoIds.size === 0}
                className="inline-flex items-center gap-1.5 px-2 py-1.5 font-bold text-menu bg-red-500 text-white hover:bg-red-600 border border-red-500 disabled:opacity-40 transition-colors ease-out"
              >
                <Trash2 size={13} strokeWidth={1.5} />{t('photo.moveToTrash')}
              </button>
            )}

            <button
              onClick={() => {
                setSelectionMode(false)
                setSelectedPhotoIds(new Set())
                setShowBulkChapterMenu(false)
              }}
              className="px-2 py-1.5 text-menu btn-secondary-on-card border border-hair font-medium transition-[background,color,border] duration-150 ease-out"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}