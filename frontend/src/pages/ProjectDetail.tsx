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
  onSaveCaption
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
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
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
        <img src={photo.image_url} alt={photo.caption} className="w-full object-cover" />
        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button
            onClick={() => onSetCover(photo)}
            className={`px-2 py-1 text-xs rounded ${project?.cover_image_url === photo.image_url ? 'bg-yellow-400 text-black' : 'bg-white text-black'}`}
          >
            {project?.cover_image_url === photo.image_url ? '✓ 커버' : '커버 설정'}
          </button>
          <button
            onClick={() => onTogglePortfolio(photo)}
            className={`px-3 py-1 text-xs rounded ${photo.is_portfolio === 'true' ? 'bg-green-500 text-white' : 'bg-white text-black'}`}
          >
            {photo.is_portfolio === 'true' ? '✓ 포트폴리오' : '포트폴리오 추가'}
          </button>
          <button
            onClick={() => onDelete(photo.id)}
            className="px-3 py-1 text-xs bg-red-500 text-white rounded"
          >
            삭제
          </button>
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
      {(photo.camera || photo.taken_at) && (
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
  const [editingCaption, setEditingCaption] = useState<string | null>(null)
  const [captionKo, setCaptionKo] = useState('')
  const [captionEn, setCaptionEn] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
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
    <div className="max-w-4xl mx-auto p-6">
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
        <div>
          <div className="mb-6">
            <label className="cursor-pointer bg-black text-white px-4 py-2 text-sm tracking-wider hover:bg-gray-800 inline-block">
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
            <span className="ml-3 text-xs text-gray-400">JPG, PNG, WebP / 여러 장 동시 업로드 가능</span>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={photos.map(p => p.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 gap-4">
                {photos.map(photo => (
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
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {photos.length === 0 && !uploading && (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg mb-2">아직 사진이 없어요</p>
              <p className="text-sm">위 버튼으로 사진을 업로드해봐요</p>
            </div>
          )}
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