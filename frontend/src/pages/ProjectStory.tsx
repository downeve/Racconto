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
import type { DragEndEvent } from '@dnd-kit/core'; 

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

// 개별 사진 드래그 컴포넌트
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

      {/* 3. [신규 추가] 호버 오버레이 (ProjectDetail 스타일) */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" />

      {/* 4. 드래그 핸들 */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1.5 left-1.5 p-1.5 rounded cursor-grab opacity-0 group-hover:opacity-100 transition-opacity z-20"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 3C6 3.55228 5.55228 4 5 4C4.44772 4 4 3.55228 4 3C4 2.44772 4.44772 2 5 2C5.55228 2 6 2.44772 6 3Z" fill="white"/>
          <path d="M6 8C6 8.55228 5.55228 9 5 9C4.44772 9 4 8.55228 4 8C4 7.44772 4.44772 7 5 7C5.55228 7 6 7.44772 6 8Z" fill="white"/>
          <path d="M6 13C6 13.5523 5.55228 14 5 14C4.44772 14 4 13.5523 4 13C4 12.4477 4.44772 12 5 12C5.55228 12 6 12.4477 6 13Z" fill="white"/>
          <path d="M12 3C12 3.55228 11.5523 4 11 4C10.4477 4 10 3.55228 10 3C10 2.44772 10.4477 2 11 2C11.5523 2 12 2.44772 12 3Z" fill="white"/>
          <path d="M12 8C12 8.55228 11.5523 9 11 9C10.4477 9 10 8.55228 10 8C10 7.44772 10.4477 7 11 7C11.5523 7 12 7.44772 12 8Z" fill="white"/>
          <path d="M12 13C12 13.5523 11.5523 14 11 14C10.4477 14 10 13.5523 10 13C10 12.4477 10.4477 12 11 12C11.5523 12 12 12.4477 12 13Z" fill="white"/>
        </svg>
      </div>

      {/* 5. 삭제 버튼 */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(chapterId, photoId); }}
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
      
      Promise.all(newPhotos.map((photo, index) => 
        axios.put(`${API}/chapters/${chapterId}/photos/${photo.photo_id}`, {
          order_num: index 
        })
      )).catch(err => console.error("챕터 사진 순서 업데이트 실패:", err));
      
      return { ...prev, [chapterId]: newPhotos };
    });
  };

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

  // 라이트박스 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedPhotoIndex === null || !currentChapterPhotos.length) return;

      const lastIndex = currentChapterPhotos.length - 1;

      if (e.key === 'ArrowRight') {
        if (selectedPhotoIndex < lastIndex) {
          setSelectedPhotoIndex(prev => prev! + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (selectedPhotoIndex > 0) {
          setSelectedPhotoIndex(prev => prev! - 1);
        }
      } else if (e.key === 'Escape') {
        setSelectedPhotoIndex(null); 
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
      parent_id: addingSubChapterTo
    })
    setNewTitle('')
    setNewDesc('')
    setShowAddChapter(false)
    setAddingSubChapterTo(null) 
    fetchChapters()
  }

  const handleUpdateChapter = async (chapter: Chapter) => {
    await axios.put(`${API}/chapters/${chapter.id}`, {
      title: editTitle,
      description: editDesc,
      order_num: chapter.order_num,
      parent_id: chapter.parent_id,
      project_id: chapter.project_id
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
      const currentChapter = chapters.find(c => c.id === chapterId)
      if (!currentChapter) return

      // 1. 같은 부모를 가진 형제들만 모아서 순서대로 정렬
      const siblings = chapters
        .filter(c => (c.parent_id || null) === (currentChapter.parent_id || null))
        .sort((a, b) => a.order_num - b.order_num)

      const currentIndex = siblings.findIndex(c => c.id === chapterId)
      if (currentIndex === -1) return

      // 2. 이동 불가능한 경계 조건 확인
      if (direction === 'up' && currentIndex === 0) return
      if (direction === 'down' && currentIndex === siblings.length - 1) return

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      
      // 3. 로컬 배열에서 위치 변경 (Immutability 유지)
      const newSiblings = [...siblings]
      const [movedItem] = newSiblings.splice(currentIndex, 1)
      newSiblings.splice(targetIndex, 0, movedItem)

      try {
        // 4. [핵심] 변경된 전체 순서의 ID 배열만 추출하여 백엔드에 딱 한 번 전송
        const chapterIds = newSiblings.map(c => c.id)
        await axios.put(`${API}/chapters/reorder`, { chapter_ids: chapterIds })
        
        // 5. 성공 후 목록 새로고침
        fetchChapters()
      } catch (error) {
        console.error('Failed to reorder chapters:', error)
        alert('순서 변경에 실패했습니다.')
      }
    }

  return (
    <div className="flex gap-6">
      {/* 챕터 목록 */}
      <div className="flex-1">
        {/* 챕터 추가 버튼 */}
        <div className="mb-6">
          {showAddChapter && !addingSubChapterTo ? (
            <div className="bg-white rounded-lg shadow p-4">
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
                    setAddingSubChapterTo(null)
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
                setAddingSubChapterTo(null) 
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
          .filter(c => !c.parent_id) 
          .map((chapter, idx) => {
            const subChapters = chapters.filter(c => c.parent_id === chapter.id) 
            
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
                          <button
                            onClick={() => {
                              setShowAddChapter(true)
                              setAddingSubChapterTo(chapter.id)
                              setNewTitle('') 
                              setNewDesc('')
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
                    
                    {/* 👇 [핵심 수정 1] 일반 img 태그 대신 DND 컴포넌트와 컨텍스트로 교체했습니다. */}
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, chapter.id)}>
                      <SortableContext items={(chapterPhotos[chapter.id] || []).map(p => p.id)} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {(chapterPhotos[chapter.id] || []).map((cp, cpIdx) => (
                            <SortablePhotoChapter
                              key={cp.id}
                              id={cp.id}
                              imageUrl={cp.image_url}
                              photoId={cp.photo_id}
                              chapterId={chapter.id}
                              onRemove={handleRemovePhoto}
                              onClick={() => {
                                // 👇 클릭 시 라이트박스에 현재 챕터 사진들을 전달합니다.
                                setCurrentChapterPhotos(chapterPhotos[chapter.id] || []);
                                setSelectedPhotoIndex(cpIdx);
                              }}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>

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

                {/* 서브 챕터 추가 폼 */}
                {addingSubChapterTo === chapter.id && (
                  <div className="ml-8 mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-inner">
                    <p className="text-xs text-gray-500 mb-2">↳ '{chapter.title}'의 서브 챕터 추가</p>
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
                          setAddingSubChapterTo(null)
                        }} 
                        className="border px-4 py-2 text-sm hover:bg-gray-50"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                )}

                {/* 서브챕터들 (인덴트) */}
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
                              onClick={() => handleMoveChapter(subChapter.id, 'up')}
                              disabled={subIdx === 0}
                              className="text-xs text-gray-400 hover:text-black disabled:opacity-30"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => handleMoveChapter(subChapter.id, 'down')}
                              disabled={subIdx === subChapters.length - 1}
                              className="text-xs text-gray-400 hover:text-black disabled:opacity-30"
                            >
                              ↓
                            </button>

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
                      
                      {/* 👇 [핵심 수정 2] 서브 챕터 사진도 동일하게 DND 컴포넌트로 교체했습니다. */}
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, subChapter.id)}>
                        <SortableContext items={(chapterPhotos[subChapter.id] || []).map(p => p.id)} strategy={rectSortingStrategy}>
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            {(chapterPhotos[subChapter.id] || []).map((cp, cpIdx) => (
                              <SortablePhotoChapter
                                key={cp.id}
                                id={cp.id}
                                imageUrl={cp.image_url}
                                photoId={cp.photo_id}
                                chapterId={subChapter.id}
                                onRemove={handleRemovePhoto}
                                onClick={() => {
                                  // 👇 서브 챕터의 사진도 라이트박스에 잘 전달되도록 연결했습니다.
                                  setCurrentChapterPhotos(chapterPhotos[subChapter.id] || []);
                                  setSelectedPhotoIndex(cpIdx);
                                }}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>

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
            ) 
          })}
          </div>

        {chapters.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-2">{t('story.noChapter')}</p>
          </div>
        )}
      </div>

      {/* 포트폴리오 스타일 다크 테마 라이트박스 */}
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
                  return chapter ? `Chapter ${chapterIndex + 1}. ${chapter.title}` : '';
                })()}
              </p>
              <p className="text-gray-500 text-xs">
                {selectedPhotoIndex + 1} / {currentChapterPhotos.length}
              </p>
            </div>

            {/* 좌우 네비게이션 */}
            {currentChapterPhotos.length > 1 && (
              <>
                <button 
                  disabled={selectedPhotoIndex === 0} 
                  onClick={() => setSelectedPhotoIndex(prev => prev! - 1)} 
                  className="absolute left-6 p-4 text-white text-5xl z-10 select-none 
                             disabled:opacity-20 disabled:cursor-not-allowed hover:enabled:text-gray-300"
                >
                  ‹
                </button>
                
                <button 
                  disabled={selectedPhotoIndex === currentChapterPhotos.length - 1}
                  onClick={() => setSelectedPhotoIndex(prev => prev! + 1)} 
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
    </div>
  )
}