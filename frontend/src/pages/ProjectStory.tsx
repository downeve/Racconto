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
    // 👇 핵심 1: 가장 바깥쪽 틀(div)에 aspect-[3/2]를 주어 3:2 비율의 투명한 네모 액자를 만듭니다.
    <div ref={setNodeRef} style={style} className="relative group rounded overflow-hidden aspect-[3/2]">
      
      {/* 👇 핵심 2: 이미지는 이 액자 안에서 꽉 차되(w-full h-full), 원본 비율을 유지하며 들어갑니다(object-contain). */}
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-contain cursor-pointer"
        onClick={onClick}
      />

      {/* 드래그 핸들 */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 bg-white/70 p-1 rounded cursor-grab opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 3C6 3.55228 5.55228 4 5 4C4.44772 4 4 3.55228 4 3C4 2.44772 4.44772 2 5 2C5.55228 2 6 2.44772 6 3Z" fill="#333333"/>
          <path d="M6 8C6 8.55228 5.55228 9 5 9C4.44772 9 4 8.55228 4 8C4 7.44772 4.44772 7 5 7C5.55228 7 6 7.44772 6 8Z" fill="#333333"/>
          <path d="M6 13C6 13.5523 5.55228 14 5 14C4.44772 14 4 13.5523 4 13C4 12.4477 4.44772 12 5 12C5.55228 12 6 12.4477 6 13Z" fill="#333333"/>
          <path d="M12 3C12 3.55228 11.5523 4 11 4C10.4477 4 10 3.55228 10 3C10 2.44772 10.4477 2 11 2C11.5523 2 12 2.44772 12 3Z" fill="#333333"/>
          <path d="M12 8C12 8.55228 11.5523 9 11 9C10.4477 9 10 8.55228 10 8C10 7.44772 10.4477 7 11 7C11.5523 7 12 7.44772 12 8Z" fill="#333333"/>
          <path d="M12 13C12 13.5523 11.5523 14 11 14C10.4477 14 10 13.5523 10 13C10 12.4477 10.4477 12 11 12C11.5523 12 12 12.4477 12 13Z" fill="#333333"/>
        </svg>
      </div>

      {/* 삭제 버튼 */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(chapterId, photoId); }}
        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center z-10"
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
              <input
                className="w-full border rounded px-3 py-2 text-sm mb-2"
                placeholder={t('story.chapterTitlePlaceholder')}
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
              />
              <textarea
                className="w-full border rounded px-3 py-2 text-sm mb-3"
                placeholder={t('story.chapterDescPlaceholder')}
                rows={2}
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={handleAddChapter} className="bg-black text-white px-4 py-2 text-sm hover:bg-gray-800">{t('common.add')}</button>
                <button onClick={() => setShowAddChapter(false)} className="border px-4 py-2 text-sm hover:bg-gray-50">{t('common.cancel')}</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddChapter(true)}
              className="bg-black text-white px-4 py-2 text-sm tracking-wider hover:bg-gray-800"
            >
              {t('story.addChapter')}
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
                            {t('common.edit')}
                          </button>
                          <button onClick={() => handleDeleteChapter(chapter.id)} className="text-xs text-red-400 hover:text-red-600">{t('story.deleteChapter')}</button>
                    </div>
                  </div>
                )}
              </div>

              {/* 챕터 사진 */}
              <div className="p-4">
                {/* 👇 여백(gap)을 1로 줄여 꽉 차게 보이게 수정하고 dnd 적용 */}
                <div className="grid grid-cols-3 gap-1 mb-3">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleDragEnd(e, chapter.id)}
                  >
                    <SortableContext 
                      items={(chapterPhotos[chapter.id] || []).map(p => p.id)} 
                      strategy={rectSortingStrategy}
                    >
                      {(chapterPhotos[chapter.id] || []).map((cp, idx) => (
                        <SortablePhotoChapter
                          key={cp.id}
                          id={cp.id} // dnd-kit 용
                          photoId={cp.photo_id} // 삭제용
                          chapterId={chapter.id}
                          imageUrl={cp.image_url}
                          onRemove={handleRemovePhoto}
                          onClick={() => {
                            setCurrentChapterPhotos(chapterPhotos[chapter.id] || []);
                            setSelectedPhotoIndex(idx);
                          }}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
                <button
                  onClick={() => setShowPhotoSelector(showPhotoSelector === chapter.id ? null : chapter.id)}
                  className="text-xs text-gray-400 hover:text-black border px-3 py-1 rounded"
                >
                  {t('story.addPhotos')}
                </button>

                {/* 사진 선택기 */}
                {showPhotoSelector === chapter.id && (
                  <div className="mt-3 p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-500 mb-2">{t('story.selectPhotos')}:</p>
                    
                    <div className="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto pr-2">
                      {allPhotos.map(photo => {
                        const isAdded = (chapterPhotos[chapter.id] || []).some(cp => cp.photo_id === photo.id)
                        return (
                          <div
                            key={photo.id}
                            // 👇 수정됨: 여기서 aspect-[3/2]를 빼고 안쪽 이미지에 넘겨줍니다. 배경색을 추가해 깔끔하게 보이게 합니다.
                            className={`relative cursor-pointer rounded overflow-hidden bg-gray-100 ${isAdded ? 'opacity-40' : 'hover:opacity-80'}`}
                            onClick={() => !isAdded && handleAddPhoto(chapter.id, photo.id)}
                          >
                            {/* 👇 수정됨: absolute를 빼고, w-full aspect-[3/2] object-contain을 이미지 자체에 직접 줍니다. */}
                            <img 
                              src={photo.image_url} 
                              alt={photo.caption || ''} 
                              className="w-full aspect-[3/2] object-contain block" 
                            />
                            
                            {/* 이미 추가된 사진 표시 (체크 마크) */}
                            {isAdded && (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/30 z-10">
                                <span className="text-green-600 text-3xl font-bold drop-shadow-md">✓</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    
                    <button
                      onClick={() => setShowPhotoSelector(null)}
                      className="mt-3 text-xs text-gray-500 hover:text-black border border-gray-300 px-3 py-1 rounded bg-white"
                    >
                      {t('common.close')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
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