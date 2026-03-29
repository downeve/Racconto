import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
  arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const API = import.meta.env.VITE_API_URL

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
  is_portfolio: string
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
}

interface Note {
  id: string
  project_id: string
  content: string
  created_at: string
  updated_at: string
}

// 개별 사진 카드 컴포넌트 (드래그 가능)
function SortablePhoto({
  photo,
  project,
  editingCaption,
  captionKo,
  captionEn,
  setCaptionKo,
  setCaptionEn,
  setEditingCaption,
  onSetCover,
  onTogglePortfolio,
  onDelete,
  onSaveCaption,
  onSetRating,
  onSetColorLabel,
  showExif,
  gridCols
}: {
  photo: Photo
  project: Project
  editingCaption: string | null
  captionKo: string
  captionEn: string
  setCaptionKo: (v: string) => void
  setCaptionEn: (v: string) => void
  setEditingCaption: (v: string | null) => void
  onSetCover: (photo: Photo) => void
  onTogglePortfolio: (photo: Photo) => void
  onDelete: (id: string) => void
  onSaveCaption: (photo: Photo) => void
  onSetRating: (photo: Photo, rating: number) => void
  onSetColorLabel: (photo: Photo, label: string) => void
  showExif: boolean
  gridCols: number
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // 목록형 레이아웃
  if (gridCols === 1) {
    return (
      <div ref={setNodeRef} style={style} className="bg-white rounded overflow-hidden flex items-center gap-4 p-2 border-b">
        {/* 드래그 핸들 */}
        <div {...attributes} {...listeners} className="text-gray-300 cursor-grab px-1">⠿</div>
        
        {/* 썸네일 */}
        <img src={photo.image_url} alt={photo.caption} className="w-16 h-16 object-cover rounded shrink-0" />
        
        {/* 별점 */}
        <div className="flex gap-0.5 shrink-0">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => onSetRating(photo, star)}
              className={`text-xs ${photo.rating && photo.rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
            >
              ★
            </button>
          ))}
        </div>

        {/* 컬러 레이블 */}
        <div className="flex gap-0.5 shrink-0">
          {[
            { value: 'red', color: 'bg-red-500', label: '거절' },
            { value: 'yellow', color: 'bg-yellow-400', label: '보류' },
            { value: 'green', color: 'bg-green-500', label: '선택' },
            { value: 'blue', color: 'bg-blue-500', label: '클라이언트' },
            { value: 'purple', color: 'bg-purple-500', label: '포트폴리오' },
          ].map(label => (
            <button
              key={label.value}
              onClick={() => onSetColorLabel(photo, label.value)}
              title={label.label}
              className={`w-3 h-3 rounded-full ${label.color} ${photo.color_label === label.value ? 'ring-2 ring-offset-1 ring-gray-400' : 'opacity-40'}`}
            />
          ))}
        </div>

        {/* 캡션 */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => {
            setEditingCaption(photo.id)
            setCaptionKo(photo.caption || '')
            setCaptionEn(photo.caption_en || '')
          }}
        >
          {editingCaption === photo.id ? (
            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
              <input
                className="border rounded px-2 py-0.5 text-xs flex-1"
                placeholder="캡션 (한국어)"
                value={captionKo}
                onChange={e => setCaptionKo(e.target.value)}
              />
              <input
                className="border rounded px-2 py-0.5 text-xs flex-1"
                placeholder="Caption (English)"
                value={captionEn}
                onChange={e => setCaptionEn(e.target.value)}
              />
              <button onClick={() => onSaveCaption(photo)} className="bg-black text-white px-2 py-0.5 text-xs rounded">저장</button>
              <button onClick={() => setEditingCaption(null)} className="border px-2 py-0.5 text-xs rounded">취소</button>
            </div>
          ) : (
            <>
              {photo.caption ? (
                <p className="text-sm text-gray-700 truncate">{photo.caption}</p>
              ) : (
                <p className="text-sm text-gray-300">캡션 추가...</p>
              )}
              {photo.caption_en && <p className="text-xs text-gray-400 truncate italic">{photo.caption_en}</p>}
            </>
          )}
        </div>

        {/* EXIF */}
        {showExif && editingCaption !== photo.id && (
          <div className="text-xs text-gray-400 shrink-0 text-right">
            {photo.camera && <p>{photo.camera}</p>}
            {photo.taken_at && <p>{new Date(photo.taken_at).toLocaleDateString('ko-KR')}</p>}
            {(photo.focal_length || photo.aperture || photo.shutter_speed || photo.iso) && (
              <p>{[photo.focal_length, photo.aperture, photo.shutter_speed, photo.iso].filter(Boolean).join(' · ')}</p>
            )}
          </div>
        )}

        {/* 포트폴리오/커버/삭제 버튼 */}
        {editingCaption !== photo.id && (
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onSetCover(photo)}
            className={`px-2 py-1 text-xs rounded ${project?.cover_image_url === photo.image_url ? 'bg-yellow-400 text-black' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            {project?.cover_image_url === photo.image_url ? '✓커버' : '커버'}
          </button>
          <button
            onClick={() => onTogglePortfolio(photo)}
            className={`px-2 py-1 text-xs rounded ${photo.is_portfolio === 'true' ? 'bg-green-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            {photo.is_portfolio === 'true' ? '✓포트폴리오' : '포트폴리오'}
          </button>
          <button
            onClick={() => onDelete(photo.id)}
            className="px-2 py-1 text-xs bg-red-100 text-red-500 rounded hover:bg-red-200"
          >
            삭제
          </button>
        </div>
        )}
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style} className="rounded overflow-hidden bg-gray-100">
      <div className="relative group">
        {/* 드래그 핸들 */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 z-10 bg-black bg-opacity-50 text-white px-2 py-1 text-xs rounded cursor-grab active:cursor-grabbing"
        >
          ⠿
        </div>
        <img
          src={photo.image_url}
          alt={photo.caption}
          className="w-full object-cover cursor-pointer"
        />
        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 flex-wrap p-1"
        onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onSetCover(photo)}
            className={`${gridCols >= 4 ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-xs'} rounded ${project?.cover_image_url === photo.image_url ? 'bg-yellow-400 text-black' : 'bg-white text-black'}`}
          >
            {project?.cover_image_url === photo.image_url ? '✓커버' : gridCols >= 3 ? '커버' : '커버 설정'}
          </button>
          <button
            onClick={() => onTogglePortfolio(photo)}
            className={`${gridCols >= 4 ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-xs'} rounded ${photo.is_portfolio === 'true' ? 'bg-green-500 text-white' : 'bg-white text-black'}`}
          >
            {photo.is_portfolio === 'true' ? '✓포트폴리오' : gridCols >= 3 ? '포트폴리오' : '포트폴리오 추가'}
          </button>
          <button
            onClick={() => onDelete(photo.id)}
            className={`${gridCols >= 4 ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-xs'} bg-red-500 text-white rounded`}
          >
            삭제
          </button>
        </div>
      </div>

      {/* 별점 & 컬러 레이블 */}
      <div className="px-2 py-2 bg-white flex items-center justify-between">
        {/* 별점 */}
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => onSetRating(photo, star)}
              className={`${gridCols >= 4 ? 'text-xs' : 'text-sm'} ${photo.rating && photo.rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
            >
              ★
            </button>
          ))}
        </div>
        {/* 컬러 레이블 */}
        <div className="flex gap-0.5">
          {[
            { value: 'red', color: 'bg-red-500', label: '거절' },
            { value: 'yellow', color: 'bg-yellow-400', label: '보류' },
            { value: 'green', color: 'bg-green-500', label: '선택' },
            { value: 'blue', color: 'bg-blue-500', label: '클라이언트' },
            { value: 'purple', color: 'bg-purple-500', label: '포트폴리오' },
          ].map(label => (
            <button
              key={label.value}
              onClick={() => onSetColorLabel(photo, label.value)}
              title={label.label}
              className={`rounded-full ${label.color} ${gridCols >= 4 ? 'w-3 h-3' : 'w-4 h-4'} ${photo.color_label === label.value ? 'ring-2 ring-offset-1 ring-gray-400' : 'opacity-50'}`}
            />
          ))}
        </div>
      </div>

      {/* 캡션 영역 */}
      {editingCaption === photo.id ? (
        <div className="p-2 bg-white">
          <input
            className="w-full border rounded px-2 py-1 text-xs mb-1"
            placeholder="캡션 (한국어)"
            value={captionKo}
            onChange={e => setCaptionKo(e.target.value)}
          />
          <input
            className="w-full border rounded px-2 py-1 text-xs mb-2"
            placeholder="Caption (English)"
            value={captionEn}
            onChange={e => setCaptionEn(e.target.value)}
          />
          <div className="flex gap-1">
            <button onClick={() => onSaveCaption(photo)} className="bg-black text-white px-2 py-1 text-xs">저장</button>
            <button onClick={() => setEditingCaption(null)} className="border px-2 py-1 text-xs">취소</button>
          </div>
        </div>
      ) : (
        <div
          className="p-2 cursor-pointer hover:bg-gray-50"
          onClick={() => {
            setEditingCaption(photo.id)
            setCaptionKo(photo.caption || '')
            setCaptionEn(photo.caption_en || '')
          }}
        >
          {photo.caption || photo.caption_en ? (
            <div>
              {photo.caption && <p className="text-xs text-gray-600">{photo.caption}</p>}
              {photo.caption_en && <p className="text-xs text-gray-400 italic">{photo.caption_en}</p>}
            </div>
          ) : (
            <p className="text-xs text-gray-300">캡션 추가...</p>
          )}
        </div>
      )}

      {/* EXIF 메타데이터 */}
      {showExif && (photo.camera || photo.taken_at) && (
        <div className="px-2 pb-2 bg-white">
          <div className="border-t pt-2 mt-1">
            {photo.taken_at && (
              <p className="text-xs text-gray-400">
                📅 {new Date(photo.taken_at).toLocaleDateString('ko-KR')}
              </p>
            )}
            {photo.camera && (
              <p className="text-xs text-gray-400">📷 {photo.camera}</p>
            )}
            {photo.lens && (
              <p className="text-xs text-gray-400">🔭 {photo.lens}</p>
            )}
            {(photo.iso || photo.shutter_speed || photo.aperture || photo.focal_length) && (
              <p className="text-xs text-gray-400">
                {[photo.focal_length, photo.aperture, photo.shutter_speed, photo.iso]
                  .filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProjectDetail() {
  const { id } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [uploading, setUploading] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [activeTab, setActiveTab] = useState<'photos' | 'notes'>('photos')
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [filterColor, setFilterColor] = useState<string | null>(null)
  const [filterPortfolio, setFilterPortfolio] = useState(false)
  const [gridCols, setGridCols] = useState(3)
  const [showExif, setShowExif] = useState(true)
  const [showFilter, setShowFilter] = useState(true)
  const [editingCaption, setEditingCaption] = useState<string | null>(null)
  const [captionKo, setCaptionKo] = useState('')
  const [captionEn, setCaptionEn] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,  // 8px 이상 움직여야 드래그로 인식
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fetchPhotos = async () => {
    if (!id) return
    const res = await axios.get(`${API}/photos/?project_id=${id}`)
    setPhotos(res.data)
  }

  const fetchNotes = async () => {
    if (!id) return
    const res = await axios.get(`${API}/notes/?project_id=${id}`)
    setNotes(res.data)
  }

  useEffect(() => {
    if (!id) return
    axios.get(`${API}/projects/${id}`).then(res => setProject(res.data))
    fetchPhotos()
    fetchNotes()
  }, [id])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !id) return
    setUploading(true)
    const files = Array.from(e.target.files)
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      await axios.post(`${API}/photos/upload?project_id=${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    }
    await fetchPhotos()
    setUploading(false)
    e.target.value = ''
  }

  const handleTogglePortfolio = async (photo: Photo) => {
    const newValue = photo.is_portfolio === 'true' ? 'false' : 'true'
    await axios.put(`${API}/photos/${photo.id}`, { ...photo, is_portfolio: newValue })
    fetchPhotos()
  }

  const handleSetCover = async (photo: Photo) => {
    const statusValue = typeof project!.status === 'object'
      ? (project!.status as any).value
      : project!.status
    await axios.put(`${API}/projects/${id}`, {
      title: project!.title,
      title_en: project!.title_en,
      description: project!.description,
      description_en: project!.description_en,
      location: project!.location,
      is_public: project!.is_public,
      status: statusValue,
      cover_image_url: photo.image_url
    })
    const res = await axios.get(`${API}/projects/${id}`)
    setProject(res.data)
  }

  const handleRemoveCover = async () => {
    const statusValue = typeof project!.status === 'object'
      ? (project!.status as any).value
      : project!.status
    await axios.put(`${API}/projects/${id}`, {
      title: project!.title,
      title_en: project!.title_en,
      description: project!.description,
      description_en: project!.description_en,
      location: project!.location,
      is_public: project!.is_public,
      status: statusValue,
      cover_image_url: null
    })
    const res = await axios.get(`${API}/projects/${id}`)
    setProject(res.data)
  }

  const handleDeletePhoto = async (photoId: string) => {
    await axios.delete(`${API}/photos/${photoId}`)
    fetchPhotos()
  }

  const handleSetRating = async (photo: Photo, rating: number) => {
    const newRating = photo.rating === rating ? null : rating
    await axios.put(`${API}/photos/${photo.id}`, {
      ...photo,
      rating: newRating
    })
    fetchPhotos()
  }

  const handleSetColorLabel = async (photo: Photo, label: string) => {
    const newLabel = photo.color_label === label ? null : label
    await axios.put(`${API}/photos/${photo.id}`, {
      ...photo,
      color_label: newLabel
    })
    fetchPhotos()
  }

  const handleClearRatings = async () => {
    if (!confirm('모든 사진의 별점을 초기화할까요?')) return
    for (const photo of photos) {
      if (photo.rating !== null) {
        await axios.put(`${API}/photos/${photo.id}`, { ...photo, rating: null })
      }
    }
    fetchPhotos()
  }

  const handleClearColorLabels = async () => {
    if (!confirm('모든 사진의 컬러 레이블을 초기화할까요?')) return
    for (const photo of photos) {
      if (photo.color_label !== null) {
        await axios.put(`${API}/photos/${photo.id}`, { ...photo, color_label: null })
      }
    }
    fetchPhotos()
  }

  const filteredPhotos = photos.filter(photo => {
    if (filterRating !== null) {
      if (filterRating === 0) {
        if (photo.rating !== null) return false
      } else {
        if (photo.rating !== filterRating) return false
      }
    }
    if (filterColor !== null && photo.color_label !== filterColor) return false
    if (filterPortfolio && photo.is_portfolio !== 'true') return false
    return true
  })

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = photos.findIndex(p => p.id === active.id)
    const newIndex = photos.findIndex(p => p.id === over.id)
    const newPhotos = arrayMove(photos, oldIndex, newIndex)
    setPhotos(newPhotos)
    for (let i = 0; i < newPhotos.length; i++) {
      await axios.put(`${API}/photos/${newPhotos[i].id}`, {
        ...newPhotos[i],
        order: i
      })
    }
  }

  const handleSaveCaption = async (photo: Photo) => {
    await axios.put(`${API}/photos/${photo.id}`, {
      ...photo,
      caption: captionKo,
      caption_en: captionEn
    })
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
    setEditingNote(null)
    setEditContent('')
    fetchNotes()
  }

  const handleDeleteNote = async (noteId: string) => {
    await axios.delete(`${API}/notes/${noteId}`)
    fetchNotes()
  }

  if (!project) return <div className="p-6 text-gray-400">로딩 중...</div>

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* 프로젝트 헤더 */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-1">{project.title}</h2>
        {project.title_en && <p className="text-gray-400 mb-4">{project.title_en}</p>}
        {project.location && <p className="text-sm text-gray-500 mb-4">📍 {project.location}</p>}
        {project.description && <p className="text-gray-700 mb-2">{project.description}</p>}
        {project.description_en && <p className="text-gray-500 text-sm">{project.description_en}</p>}
        {project.cover_image_url && (
          <div className="mt-4 flex items-center gap-3">
            <img src={project.cover_image_url} alt="커버" className="w-16 h-16 object-cover rounded" />
            <div>
              <p className="text-xs text-gray-500 mb-1">현재 커버 이미지</p>
              <button onClick={handleRemoveCover} className="text-xs text-red-400 hover:text-red-600">
                커버 제거
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 탭 */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('photos')}
          className={`px-6 py-2 text-sm tracking-wider ${activeTab === 'photos' ? 'border-b-2 border-black font-semibold' : 'text-gray-400'}`}
        >
          사진 ({photos.length})
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-6 py-2 text-sm tracking-wider ${activeTab === 'notes' ? 'border-b-2 border-black font-semibold' : 'text-gray-400'}`}
        >
          노트 ({notes.length})
        </button>
      </div>

      {/* 사진 탭 */}
      {activeTab === 'photos' && (
        <div className="flex gap-6">
          {/* 왼쪽 필터 패널 */}
          <div className={`${showFilter ? 'w-48' : 'w-6'} shrink-0 transition-all duration-200`}>
            <button
              onClick={() => setShowFilter(!showFilter)}
              className="mb-2 text-gray-400 hover:text-black text-xs flex items-center gap-1"
            >
              {showFilter ? '◀ 필터' : '▶'}
            </button>

            {showFilter && (
              <div className="bg-white rounded-lg shadow p-4 sticky top-4">

                {/* 업로드 버튼 */}
                <label className="cursor-pointer bg-black text-white px-3 py-2 text-xs tracking-wider hover:bg-gray-800 inline-block w-full text-center mb-4">
                  {uploading ? '업로드 중...' : '+ 사진 업로드'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                </label>

                {/* 보기 설정 */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2">보기</p>
                  <div className="flex gap-1 mb-2">
                    {[
                      { cols: 2, icon: '2' },
                      { cols: 3, icon: '3' },
                      { cols: 4, icon: '4' },
                      { cols: 1, icon: '≡' },
                    ].map(({ cols, icon }) => (
                      <button
                        key={cols}
                        onClick={() => setGridCols(cols)}
                        className={`flex-1 py-1 text-xs rounded ${gridCols === cols ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowExif(!showExif)}
                    className={`w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between ${showExif ? 'bg-black text-white' : 'hover:bg-gray-50'}`}
                  >
                    <span>EXIF 정보</span>
                    <span>{showExif ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                {/* 전체 보기 */}
                <button
                  onClick={() => { setFilterRating(null); setFilterColor(null); setFilterPortfolio(false) }}
                  className={`w-full text-left px-2 py-1 text-xs rounded mb-3 ${!filterRating && !filterColor && !filterPortfolio ? 'bg-black text-white' : 'hover:bg-gray-50'}`}
                >
                  전체 ({photos.length})
                </button>

                {/* 별점 필터 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 mb-2">별점</p>
                  <button
                    onClick={handleClearRatings}
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    초기화
                  </button>
                  </div>
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = photos.filter(p => p.rating === star).length
                    return (
                      <button
                        key={star}
                        onClick={() => setFilterRating(filterRating === star ? null : star)}
                        className={`w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between ${filterRating === star ? 'bg-black text-white' : 'hover:bg-gray-50'}`}
                      >
                        <span>{'★'.repeat(star)}{'☆'.repeat(5 - star)}</span>
                        <span className="text-gray-400">{count}</span>
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setFilterRating(filterRating === 0 ? null : 0)}
                    className={`w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between ${filterRating === 0 ? 'bg-black text-white' : 'hover:bg-gray-50'}`}
                  >
                    <span className="text-gray-400">미평가</span>
                    <span className="text-gray-400">{photos.filter(p => !p.rating).length}</span>
                  </button>
                </div>

                {/* 컬러 레이블 필터 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 mb-2">컬러 레이블</p>
                  <button
                    onClick={handleClearColorLabels}
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    초기화
                  </button>
                  </div>
                  {[
                    { value: 'red', color: 'bg-red-500', label: '거절' },
                    { value: 'yellow', color: 'bg-yellow-400', label: '보류' },
                    { value: 'green', color: 'bg-green-500', label: '선택' },
                    { value: 'blue', color: 'bg-blue-500', label: '클라이언트 공유' },
                    { value: 'purple', color: 'bg-purple-500', label: '최종 선택' },
                  ].map(label => {
                    const count = photos.filter(p => p.color_label === label.value).length
                    return (
                      <button
                        key={label.value}
                        onClick={() => setFilterColor(filterColor === label.value ? null : label.value)}
                        className={`w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between ${filterColor === label.value ? 'bg-black text-white' : 'hover:bg-gray-50'}`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${label.color}`} />
                          {label.label}
                        </span>
                        <span className="text-gray-400">{count}</span>
                      </button>
                    )
                  })}
                </div>

                {/* 포트폴리오 필터 */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">포트폴리오</p>
                  <button
                    onClick={() => setFilterPortfolio(!filterPortfolio)}
                    className={`w-full text-left px-2 py-1 text-xs rounded flex items-center justify-between ${filterPortfolio ? 'bg-black text-white' : 'hover:bg-gray-50'}`}
                  >
                    <span>✓ 포트폴리오</span>
                    <span className="text-gray-400">{photos.filter(p => p.is_portfolio === 'true').length}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 오른쪽 사진 그리드 */}
          <div className="flex-1">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredPhotos.map(p => p.id)} strategy={rectSortingStrategy}>
                <div className={`grid gap-4 ${
                  gridCols === 1 ? 'grid-cols-1' :
                  gridCols === 2 ? 'grid-cols-2' :
                  gridCols === 3 ? 'grid-cols-3' :
                  'grid-cols-4'
                }`}>
                  {filteredPhotos.map(photo => (
                    <SortablePhoto
                      key={photo.id}
                      photo={photo}
                      project={project}
                      editingCaption={editingCaption}
                      captionKo={captionKo}
                      captionEn={captionEn}
                      setCaptionKo={setCaptionKo}
                      setCaptionEn={setCaptionEn}
                      setEditingCaption={setEditingCaption}
                      onSetCover={handleSetCover}
                      onTogglePortfolio={handleTogglePortfolio}
                      onDelete={handleDeletePhoto}
                      onSaveCaption={handleSaveCaption}
                      onSetRating={handleSetRating}
                      onSetColorLabel={handleSetColorLabel}
                      showExif={showExif}
                      gridCols={gridCols}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {filteredPhotos.length === 0 && !uploading && (
              <div className="text-center py-20 text-gray-400">
                {photos.length === 0 ? (
                  <>
                    <p className="text-lg mb-2">아직 사진이 없어요</p>
                    <p className="text-sm">위 버튼으로 사진을 업로드해봐요</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg mb-2">조건에 맞는 사진이 없어요</p>
                    <p className="text-sm">필터를 변경해봐요</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 노트 탭 */}
      {activeTab === 'notes' && (
        <div>
          <div className="mb-6">
            <textarea
              className="w-full border rounded px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-black"
              placeholder="리서치 메모, 촬영 아이디어, 컨셉 노트 등을 자유롭게 기록하세요..."
              rows={4}
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
            />
            <button
              onClick={handleAddNote}
              className="bg-black text-white px-4 py-2 text-sm tracking-wider hover:bg-gray-800"
            >
              + 노트 추가
            </button>
          </div>

          <div className="space-y-4">
            {notes.map(note => (
              <div key={note.id} className="bg-white rounded-lg shadow p-4">
                {editingNote === note.id ? (
                  <div>
                    <textarea
                      className="w-full border rounded px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-black"
                      rows={4}
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                    />
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
                        {new Date(note.updated_at).toLocaleDateString('ko-KR', {
                          year: 'numeric', month: 'long', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingNote(note.id); setEditContent(note.content) }} className="text-xs text-gray-400 hover:text-black">수정</button>
                        <button onClick={() => handleDeleteNote(note.id)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {notes.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg mb-2">아직 노트가 없어요</p>
              <p className="text-sm">리서치, 아이디어, 컨셉을 자유롭게 기록해봐요</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}