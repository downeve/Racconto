import { useEffect, useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

interface Chapter {
  id: string
  project_id: string
  title: string
  description: string | null
  order_num: number
}

interface ChapterPhoto {
  id: string
  chapter_id: string
  photo_id: string
  order_num: number
  image_url: string
  caption: string | null
}

interface Photo {
  id: string
  image_url: string
  caption: string | null
  folder: string | null
}

export default function ProjectStory({ projectId, allPhotos }: { projectId: string, allPhotos: Photo[] }) {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [chapterPhotos, setChapterPhotos] = useState<Record<string, ChapterPhoto[]>>({})
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [showAddChapter, setShowAddChapter] = useState(false)
  const [editingChapter, setEditingChapter] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [showPhotoSelector, setShowPhotoSelector] = useState<string | null>(null)

  const fetchChapters = async () => {
    const res = await axios.get(`${API}/chapters/?project_id=${projectId}`)
    setChapters(res.data)
    for (const chapter of res.data) {
      fetchChapterPhotos(chapter.id)
    }
  }

  const fetchChapterPhotos = async (chapterId: string) => {
    const res = await axios.get(`${API}/chapters/${chapterId}/photos`)
    setChapterPhotos(prev => ({ ...prev, [chapterId]: res.data }))
  }

  useEffect(() => {
    fetchChapters()
  }, [projectId])

    const handleAddChapter = async () => {
    if (!newTitle.trim()) return
    await axios.post(`${API}/chapters/`, {
        project_id: projectId,
        title: newTitle,
        description: newDesc,
        order_num: chapters.length
    })
    setNewTitle('')
    setNewDesc('')
    setShowAddChapter(false)
    fetchChapters()
    }

  const handleUpdateChapter = async (chapter: Chapter) => {
    await axios.put(`${API}/chapters/${chapter.id}`, {
      title: editTitle,
      description: editDesc,
      order_num: chapter.order_num
    })
    setEditingChapter(null)
    fetchChapters()
  }

  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm('챕터를 삭제할까요? 사진 연결도 해제됩니다.')) return
    await axios.delete(`${API}/chapters/${chapterId}`)
    fetchChapters()
  }

  const handleAddPhoto = async (chapterId: string, photoId: string) => {
    try {
      await axios.post(`${API}/chapters/${chapterId}/photos`, { photo_id: photoId })
      fetchChapterPhotos(chapterId)
    } catch {
      // 이미 추가된 사진
    }
  }

  const handleRemovePhoto = async (chapterId: string, photoId: string) => {
    await axios.delete(`${API}/chapters/${chapterId}/photos/${photoId}`)
    fetchChapterPhotos(chapterId)
  }

  const handleMoveChapter = async (chapterId: string, direction: 'up' | 'down') => {
    const idx = chapters.findIndex(c => c.id === chapterId)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === chapters.length - 1) return

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const current = chapters[idx]
    const swap = chapters[swapIdx]

    await axios.put(`${API}/chapters/${current.id}`, {
        title: current.title,
        description: current.description,
        order_num: swap.order_num
    })
    await axios.put(`${API}/chapters/${swap.id}`, {
        title: swap.title,
        description: swap.description,
        order_num: current.order_num
    })
    fetchChapters()
    }

  return (
    <div className="flex gap-6">
      {/* 챕터 목록 */}
      <div className="flex-1">
        {/* 챕터 추가 버튼 */}
        <div className="mb-6">
          {showAddChapter ? (
            <div className="bg-white rounded-lg shadow p-4">
              <input
                className="w-full border rounded px-3 py-2 text-sm mb-2"
                placeholder="챕터 제목 *"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
              />
              <textarea
                className="w-full border rounded px-3 py-2 text-sm mb-3"
                placeholder="챕터 설명 (선택)"
                rows={2}
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={handleAddChapter} className="bg-black text-white px-4 py-2 text-sm hover:bg-gray-800">추가</button>
                <button onClick={() => setShowAddChapter(false)} className="border px-4 py-2 text-sm hover:bg-gray-50">취소</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddChapter(true)}
              className="bg-black text-white px-4 py-2 text-sm tracking-wider hover:bg-gray-800"
            >
              + 챕터 추가
            </button>
          )}
        </div>

        {/* 챕터 목록 */}
        <div className="space-y-8">
          {chapters.map((chapter, idx) => (
            <div key={chapter.id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* 챕터 헤더 */}
              <div className="p-4 border-b">
                {editingChapter === chapter.id ? (
                  <div>
                    <input
                      className="w-full border rounded px-3 py-2 text-sm mb-2"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                    />
                    <textarea
                      className="w-full border rounded px-3 py-2 text-sm mb-2"
                      rows={2}
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateChapter(chapter)} className="bg-black text-white px-3 py-1 text-xs">저장</button>
                      <button onClick={() => setEditingChapter(null)} className="border px-3 py-1 text-xs">취소</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs text-gray-400 mr-2">Chapter {idx + 1}</span>
                      <span className="font-semibold">{chapter.title}</span>
                      {chapter.description && <p className="text-sm text-gray-500 mt-1">{chapter.description}</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={() => handleMoveChapter(chapter.id, 'up')}
                            disabled={idx === 0}
                            className="text-xs text-gray-400 hover:text-black disabled:opacity-30"
                        >
                            ↑
                        </button>
                        <button
                            onClick={() => handleMoveChapter(chapter.id, 'down')}
                            disabled={idx === chapters.length - 1}
                            className="text-xs text-gray-400 hover:text-black disabled:opacity-30"
                        >
                            ↓
                        </button>
                        <button
                            onClick={() => { setEditingChapter(chapter.id); setEditTitle(chapter.title); setEditDesc(chapter.description || '') }}
                            className="text-xs text-gray-400 hover:text-black"
                        >
                            수정
                          </button>
                          <button onClick={() => handleDeleteChapter(chapter.id)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
                    </div>
                  </div>
                )}
              </div>

              {/* 챕터 사진 */}
              <div className="p-4">
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {(chapterPhotos[chapter.id] || []).map(cp => (
                    <div key={cp.id} className="relative group">
                      <img src={cp.image_url} alt={cp.caption || ''} className="w-full h-24 object-contain rounded bg-gray-100" />
                      <button
                        onClick={() => handleRemovePhoto(chapter.id, cp.photo_id)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowPhotoSelector(showPhotoSelector === chapter.id ? null : chapter.id)}
                  className="text-xs text-gray-400 hover:text-black border px-3 py-1 rounded"
                >
                  + 사진 추가
                </button>

                {/* 사진 선택기 */}
                {showPhotoSelector === chapter.id && (
                  <div className="mt-3 p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-500 mb-2">추가할 사진 선택:</p>
                    <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                      {allPhotos.map(photo => {
                        const isAdded = (chapterPhotos[chapter.id] || []).some(cp => cp.photo_id === photo.id)
                        return (
                          <div
                            key={photo.id}
                            className={`relative cursor-pointer ${isAdded ? 'opacity-40' : 'hover:opacity-80'}`}
                            onClick={() => !isAdded && handleAddPhoto(chapter.id, photo.id)}
                          >
                            <img src={photo.image_url} alt={photo.caption || ''} className="w-full h-16 object-contain rounded bg-gray-100" />
                            {isAdded && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-green-500 text-lg">✓</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <button
                      onClick={() => setShowPhotoSelector(null)}
                      className="mt-2 text-xs text-gray-400 hover:text-black"
                    >
                      닫기
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {chapters.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-2">아직 챕터가 없어요</p>
            <p className="text-sm">위 버튼으로 첫 챕터를 추가해봐요</p>
          </div>
        )}
      </div>
    </div>
  )
}