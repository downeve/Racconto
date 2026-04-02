import { useEffect, useState } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// 👇 [추가] dnd-kit 임포트
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core'; // 👈 type을 명시하여 따로 빼줍니다.

import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';

import { CSS } from '@dnd-kit/utilities';

const API = import.meta.env.VITE_API_URL

interface Chapter {
  id: string
  project_id: string
  title: string
  description: string | null
  order_num: number
  parent_id: string | null
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

// 👇 [추가] 개별 사진 드래그 컴포넌트
interface SortablePhotoChapterProps {
  id: string; // dnd-kit 고유 ID (ChapterPhoto의 id)
  imageUrl: string;
  photoId: string;
  chapterId: string;
  onRemove: (chapterId: string, photoId: string) => void;
  onClick: () => void;
}

function SortablePhotoChapter({ id, imageUrl, photoId, chapterId, onRemove, onClick }: SortablePhotoChapterProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    // 1. 최상단 프레임: 3:2 비율 유지, overflow-hidden으로 버튼이나 여백이 튀어나오지 않게 함.
    <div ref={setNodeRef} style={style} className="relative group rounded overflow-hidden aspect-[3/2] bg-gray-100">
      
      {/* 2. 실제 이미지: object-contain으로 잘림 없이 표시 */}
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-contain cursor-pointer"
        onClick={onClick}
      />

      {/* 3. [신규 추가] 호버 오버레이 (ProjectDetail 스타일)
          마우스를 올렸을 때 사진 위에 쌓이는 검은색 투명 막입니다. (group-hover:opacity-100)
          pointer-events-none을 주어 이미지 클릭이 방해받지 않게 합니다. */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" />

      {/* 4. 드래그 핸들 (위치 수정 및 스타일 변경)
          이미지 위에 올리고 z-20을 주어 오버레이보다 위로 띄웁니다.
          아이콘 색상을 하얀색(white)으로 바꿔 어두운 배경에서 잘 보이게 합니다. */}
      <div
        {...attributes}
        {...listeners}
        // 기존 bg-white/70을 제거하고, z-20과 더 세밀한 위치(top-1.5, left-1.5)를 적용
        className="absolute top-1.5 left-1.5 p-1.5 rounded cursor-grab opacity-0 group-hover:opacity-100 transition-opacity z-20"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* 👇 아이콘 색상을 white로 변경했습니다. */}
          <path d="M6 3C6 3.55228 5.55228 4 5 4C4.44772 4 4 3.55228 4 3C4 2.44772 4.44772 2 5 2C5.55228 2 6 2.44772 6 3Z" fill="white"/>
          <path d="M6 8C6 8.55228 5.55228 9 5 9C4.44772 9 4 8.55228 4 8C4 7.44772 4.44772 7 5 7C5.55228 7 6 7.44772 6 8Z" fill="white"/>
          <path d="M6 13C6 13.5523 5.55228 14 5 14C4.44772 14 4 13.5523 4 13C4 12.4477 4.44772 12 5 12C5.55228 12 6 12.4477 6 13Z" fill="white"/>
          <path d="M12 3C12 3.55228 11.5523 4 11 4C10.4477 4 10 3.55228 10 3C10 2.44772 10.4477 2 11 2C11.5523 2 12 2.44772 12 3Z" fill="white"/>
          <path d="M12 8C12 8.55228 11.5523 9 11 9C10.4477 9 10 8.55228 10 8C10 7.44772 10.4477 7 11 7C11.5523 7 12 7.44772 12 8Z" fill="white"/>
          <path d="M12 13C12 13.5523 11.5523 14 11 14C10.4477 14 10 13.5523 10 13C10 12.4477 10.4477 12 11 12C11.5523 12 12 12.4477 12 13Z" fill="white"/>
        </svg>
      </div>

      {/* 5. 삭제 버튼 (위치 수정 및 스타일 변경)
          이미지 위에 올리고 z-20을 적용. 삭제 버튼은 빨간색(red-600)을 유지하되 더 선명하게 만듭니다. */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(chapterId, photoId); }}
        // z-20과 더 세밀한 위치(top-1.5, right-1.5)를 적용
        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20"
      >
        ×
      </button>
    </div>
  );
}

export default function ProjectStory({ projectId, allPhotos, onChapterChange }: { projectId: string, allPhotos: Photo[], onChapterChange?: (count: number) => void }) {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [chapterPhotos, setChapterPhotos] = useState<Record<string, ChapterPhoto[]>>({})
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [showAddChapter, setShowAddChapter] = useState(false)
  const [addingSubChapterTo, setAddingSubChapterTo] = useState<string | null>(null)
  const [editingChapter, setEditingChapter] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [showPhotoSelector, setShowPhotoSelector] = useState<string | null>(null)
  const { t } = useTranslation()

  // 👇 [여기서부터 추가]
  // 라이트박스 상태
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [currentChapterPhotos, setCurrentChapterPhotos] = useState<ChapterPhoto[]>([]);

  // 드래그 센서
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // 순서 변경 핸들러
  const handleDragEnd = (event: DragEndEvent, chapterId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setChapterPhotos(prev => {
      const photos = prev[chapterId] || [];
      const oldIndex = photos.findIndex(p => p.id === active.id);
      const newIndex = photos.findIndex(p => p.id === over.id);
      
      const newPhotos = arrayMove(photos, oldIndex, newIndex);
      
      // 👇 [핵심] 원본 사진(/photos)이 아니라, '해당 챕터의 사진 매핑 데이터'를 업데이트합니다.
      Promise.all(newPhotos.map((photo, index) => 
        // photo.photo_id와 함께 바뀐 index(순서)를 전송합니다.
        axios.put(`${API}/chapters/${chapterId}/photos/${photo.photo_id}`, {
          order_num: index // 챕터 내에서의 새로운 순서
        })
      )).catch(err => console.error("챕터 사진 순서 업데이트 실패:", err));
      
      return { ...prev, [chapterId]: newPhotos };
    });
  };
  // [여기까지 추가]

  const fetchChapters = async () => {
  const res = await axios.get(`${API}/chapters/?project_id=${projectId}`)
    setChapters(res.data)
    onChapterChange?.(res.data.length)
    for (const chapter of res.data) {
        fetchChapterPhotos(chapter.id)
    }
  }

  const fetchChapterPhotos = async (chapterId: string) => {
    const res = await axios.get(`${API}/chapters/${chapterId}/photos`)
    setChapterPhotos(prev => ({ ...prev, [chapterId]: res.data }))
  }

// 라이트박스 키보드 네비게이션 (시작/끝에서 멈춤 버전)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 라이트박스가 열려있을 때만 작동
      if (selectedPhotoIndex === null || !currentChapterPhotos.length) return;

      const lastIndex = currentChapterPhotos.length - 1;

      if (e.key === 'ArrowRight') {
        // 👇 [수정] 마지막 사진이 아닐 때만 다음으로 이동
        if (selectedPhotoIndex < lastIndex) {
          setSelectedPhotoIndex(prev => prev! + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        // 👇 [수정] 첫 번째 사진이 아닐 때만 이전으로 이동
        if (selectedPhotoIndex > 0) {
          setSelectedPhotoIndex(prev => prev! - 1);
        }
      } else if (e.key === 'Escape') {
        setSelectedPhotoIndex(null); // ESC 누르면 닫기
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhotoIndex, currentChapterPhotos]);

  useEffect(() => {
    fetchChapters()
  }, [projectId])

  const handleAddChapter = async () => {
    if (!newTitle.trim()) return
    await axios.post(`${API}/chapters/`, {
      project_id: projectId,
      title: newTitle,
      description: newDesc,
      order_num: chapters.length,
      parent_id: addingSubChapterTo  // 🆕 추가 (서브챕터면 parent_id, 최상위면 null)
    })
    setNewTitle('')
    setNewDesc('')
    setShowAddChapter(false)
    setAddingSubChapterTo(null)  // 🆕 초기화
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
    if (!confirm(t('story.chapterDeleteWarning'))) return
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
              {/* 🆕 서브챕터 추가 중일 때 안내 */}
              {addingSubChapterTo && (
                <p className="text-xs text-gray-500 mb-2">
                  {t('story.addingSubChapter')}
                </p>
              )}
              <input
                className="w-full border rounded px-3 py-2 text-sm mb-2"
                placeholder={t('story.chapterTitle')}
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
              />
              <textarea
                className="w-full border rounded px-3 py-2 text-sm mb-3"
                placeholder={t('story.chapterDescription')}
                rows={2}
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={handleAddChapter} className="bg-black text-white px-4 py-2 text-sm hover:bg-gray-800">
                  {t('common.add')}
                </button>
                <button 
                  onClick={() => {
                    setShowAddChapter(false)
                    setAddingSubChapterTo(null)  // 🆕 추가
                  }} 
                  className="border px-4 py-2 text-sm hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setShowAddChapter(true)
                setAddingSubChapterTo(null)  // 🆕 최상위 챕터 추가
              }}
              className="bg-black text-white px-4 py-2 text-sm tracking-wider hover:bg-gray-800"
            >
              + {t('story.addChapter')}
            </button>
          )}
        </div>

        {/* 챕터 목록 */}
        <div className="space-y-8">
        {chapters
          .filter(c => !c.parent_id)  // 🆕 최상위 챕터만
          .map((chapter, idx) => {
            const subChapters = chapters.filter(c => c.parent_id === chapter.id)  // 🆕 서브챕터
            
            return (
              <div key={chapter.id}>
                {/* 최상위 챕터 */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
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
                          <button onClick={() => handleUpdateChapter(chapter)} className="bg-black text-white px-3 py-1 text-xs">{t('common.save')}</button>
                          <button onClick={() => setEditingChapter(null)} className="border px-3 py-1 text-xs">{t('common.cancel')}</button>
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
                          {/* 🆕 서브챕터 추가 버튼 */}
                          <button
                            onClick={() => {
                              setShowAddChapter(true)
                              setAddingSubChapterTo(chapter.id)
                            }}
                            className="text-xs text-blue-500 hover:text-blue-700"
                          >
                            + Sub
                          </button>
                          <button
                            onClick={() => handleMoveChapter(chapter.id, 'up')}
                            disabled={idx === 0}
                            className="text-xs text-gray-400 hover:text-black disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => handleMoveChapter(chapter.id, 'down')}
                            disabled={idx === chapters.filter(c => !c.parent_id).length - 1}
                            className="text-xs text-gray-400 hover:text-black disabled:opacity-30"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => { setEditingChapter(chapter.id); setEditTitle(chapter.title); setEditDesc(chapter.description || '') }}
                            className="text-xs text-gray-400 hover:text-black"
                          >
                            {t('common.edit')}
                          </button>
                          <button onClick={() => handleDeleteChapter(chapter.id)} className="text-xs text-red-400 hover:text-red-600">{t('common.delete')}</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 챕터 사진 */}
                  <div className="p-4">
                    <div className="grid grid-cols-3 gap-2 mb-3">
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
                      + {t('story.addPhoto')}
                    </button>

                    {/* 사진 선택기 */}
                    {showPhotoSelector === chapter.id && (
                      <div className="mt-3 p-3 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500 mb-2">{t('story.selectPhotos')}</p>
                        <div className="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto">
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
                          {t('common.close')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 🆕 서브챕터들 (인덴트) */}
                {subChapters.map((subChapter, subIdx) => (
                  <div key={subChapter.id} className="ml-8 mt-3 bg-white rounded-lg shadow overflow-hidden border-l-4 border-blue-400">
                    {/* 서브챕터 헤더 */}
                    <div className="p-4 border-b">
                      {editingChapter === subChapter.id ? (
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
                            <button onClick={() => handleUpdateChapter(subChapter)} className="bg-black text-white px-3 py-1 text-xs">{t('common.save')}</button>
                            <button onClick={() => setEditingChapter(null)} className="border px-3 py-1 text-xs">{t('common.cancel')}</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-blue-500 mr-2">Sub-Chapter {idx + 1}.{subIdx + 1}</span>
                            <span className="font-semibold">{subChapter.title}</span>
                            {subChapter.description && <p className="text-sm text-gray-500 mt-1">{subChapter.description}</p>}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => { setEditingChapter(subChapter.id); setEditTitle(subChapter.title); setEditDesc(subChapter.description || '') }}
                              className="text-xs text-gray-400 hover:text-black"
                            >
                              {t('common.edit')}
                            </button>
                            <button onClick={() => handleDeleteChapter(subChapter.id)} className="text-xs text-red-400 hover:text-red-600">{t('common.delete')}</button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 서브챕터 사진 */}
                    <div className="p-4">
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {(chapterPhotos[subChapter.id] || []).map(cp => (
                          <div key={cp.id} className="relative group">
                            <img src={cp.image_url} alt={cp.caption || ''} className="w-full h-24 object-contain rounded bg-gray-100" />
                            <button
                              onClick={() => handleRemovePhoto(subChapter.id, cp.photo_id)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setShowPhotoSelector(showPhotoSelector === subChapter.id ? null : subChapter.id)}
                        className="text-xs text-gray-400 hover:text-black border px-3 py-1 rounded"
                      >
                        + {t('story.addPhoto')}
                      </button>

                      {/* 사진 선택기 */}
                      {showPhotoSelector === subChapter.id && (
                        <div className="mt-3 p-3 bg-gray-50 rounded">
                          <p className="text-xs text-gray-500 mb-2">{t('story.selectPhotos')}</p>
                          <div className="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto">
                            {allPhotos.map(photo => {
                              const isAdded = (chapterPhotos[subChapter.id] || []).some(cp => cp.photo_id === photo.id)
                              return (
                                <div
                                  key={photo.id}
                                  className={`relative cursor-pointer ${isAdded ? 'opacity-40' : 'hover:opacity-80'}`}
                                  onClick={() => !isAdded && handleAddPhoto(subChapter.id, photo.id)}
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
                            {t('common.close')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )  // 🆕 추가: .map() 종료
          })}
          </div>

        {chapters.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-2">{t('story.noChapter')}</p>
          </div>
        )}
      </div>

      {/* 👇 [수정됨] 포트폴리오 스타일 다크 테마 라이트박스 */}
      {selectedPhotoIndex !== null && currentChapterPhotos[selectedPhotoIndex] && (
        <div 
          className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm" 
          onClick={() => setSelectedPhotoIndex(null)}
        >
          {/* 우측 상단 닫기 버튼 */}
          <button 
            onClick={() => setSelectedPhotoIndex(null)} 
            className="absolute top-6 right-6 text-white hover:text-gray-300 z-50"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* 중앙 이미지 및 정보 */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 relative" onClick={e => e.stopPropagation()}>
            <img 
              src={currentChapterPhotos[selectedPhotoIndex].image_url} 
              alt={currentChapterPhotos[selectedPhotoIndex].caption || ''} 
              className="max-w-full max-h-[80vh] object-contain shadow-lg" 
            />
            
            {/* 캡션 */}
            {currentChapterPhotos[selectedPhotoIndex].caption && (
              <p className="text-white text-sm mt-4 text-center">
                {currentChapterPhotos[selectedPhotoIndex].caption}
              </p>
            )}
            
            {/* 챕터 이름 + 페이지 번호 */}
            <div className="text-center mt-2">
              <p className="text-gray-400 text-xs mb-1">
                {(() => {
                  const currentChapterId = currentChapterPhotos[selectedPhotoIndex].chapter_id;
                  const chapterIndex = chapters.findIndex(c => c.id === currentChapterId);
                  const chapter = chapters[chapterIndex];
                  // 배열 인덱스는 0부터 시작하므로 +1 을 해줍니다.
                  return chapter ? `Chapter ${chapterIndex + 1}. ${chapter.title}` : '';
                })()}
              </p>
              <p className="text-gray-500 text-xs">
                {selectedPhotoIndex + 1} / {currentChapterPhotos.length}
              </p>
            </div>

            {/* 좌우 네비게이션 (시작/끝에서 멈춤 버전) */}
            {currentChapterPhotos.length > 1 && (
              <>
                {/* 이전 버튼 (‹) */}
                <button 
                  // 👇 [수정] 첫 번째 사진일 때 disabled 활성화
                  disabled={selectedPhotoIndex === 0} 
                  onClick={() => setSelectedPhotoIndex(prev => prev! - 1)} 
                  // 👇 [수정] disabled일 때 opacity를 주고, cursor를 변경하는 스타일 추가
                  className="absolute left-6 p-4 text-white text-5xl z-10 select-none 
                             disabled:opacity-20 disabled:cursor-not-allowed hover:enabled:text-gray-300"
                >
                  ‹
                </button>
                
                {/* 다음 버튼 (›) */}
                <button 
                  // 👇 [수정] 마지막 사진일 때 disabled 활성화
                  disabled={selectedPhotoIndex === currentChapterPhotos.length - 1}
                  onClick={() => setSelectedPhotoIndex(prev => prev! + 1)} 
                  // 👇 [수정] disabled일 때 opacity를 주고, cursor를 변경하는 스타일 추가
                  className="absolute right-6 p-4 text-white text-5xl z-10 select-none
                             disabled:opacity-20 disabled:cursor-not-allowed hover:enabled:text-gray-300"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {/* 👆 라이트박스 끝 */}
    </div>
  )
}