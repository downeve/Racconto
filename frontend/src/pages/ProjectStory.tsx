import { useEffect, useState } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'

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
  id: string; 
  imageUrl: string;
  photoId: string;
  chapterId: string;
  caption: string | null; // 👇 [추가] 캡션 데이터
  onRemove: (chapterId: string, photoId: string) => void;
  onClick: () => void;
  onEditCaption: (photoId: string, currentCaption: string) => void; // 👇 [추가] 캡션 편집 이벤트
}

function SortablePhotoChapter({ id, imageUrl, photoId, chapterId, caption, onRemove, onClick, onEditCaption }: SortablePhotoChapterProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    // 👇 [수정] 최상위를 flex-col로 변경하여 이미지는 고정하고 텍스트만 아래로 늘어나게 설정 (제안 B)
    <div ref={setNodeRef} style={style} className="flex flex-col w-full h-full">
      
      {/* 1. 이미지 컨테이너 (3:2 비율 유지) */}
      <div className="relative group rounded overflow-hidden aspect-[3/2] shadow-sm">
        <img
          src={imageUrl}
          alt={caption || ''}
          className="absolute inset-0 w-full h-full object-contain cursor-pointer"
          onClick={onClick}
        />

        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" />

        {/* 2. 드래그 핸들 */}
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

        {/* 3. 삭제 버튼 */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(chapterId, photoId); }}
          className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20"
        >
          ×
        </button>

        {/* 👇 [추가] 4. 캡션 편집(물방울) 버튼 */}
        <button
          onClick={(e) => { e.stopPropagation(); onEditCaption(photoId, caption || ''); }}
          className="absolute bottom-2 right-2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
          title="캡션 추가/수정"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      </div>

      {/* 👇 [추가] 5. 이미지 하단 캡션 노출 영역 (ProjectDetail과 연동) */}
      {caption && (
        <div className="mt-2 px-1 pb-2">
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed whitespace-pre-wrap">
            {caption}
          </p>
        </div>
      )}
    </div>
  );
}

export default function ProjectStory({ 
  projectId, 
  allPhotos, 
  onChapterChange, 
  onPhotoUpdate 
}: { 
  projectId: string, 
  allPhotos: Photo[], 
  onChapterChange?: (count: number) => void,
  onPhotoUpdate?: () => void // 👈 바로 이 부분(타입 정의)이 없어서 빨간 줄이 났던 것입니다!
}) {
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

  // 👇 [추가] 캡션(코멘트) 편집 상태
  const [editingCaptionPhotoId, setEditingCaptionPhotoId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');

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

  // 👇 [수정] 캡션 저장 로직 (PUT 방식으로 변경)
  const handleSaveCaption = async () => {
    if (!editingCaptionPhotoId) return;
    try {
      // 1. 전체 사진 목록(allPhotos)에서 현재 수정 중인 원본 사진 데이터를 찾습니다.
      const originalPhoto = allPhotos.find(p => p.id === editingCaptionPhotoId);
      if (!originalPhoto) throw new Error("원본 사진 데이터를 찾을 수 없습니다.");

      // 2. patch 대신 put을 사용하고, 기존 사진 데이터에 caption만 새것으로 교체하여 서버에 전체를 보냅니다.
      await axios.put(`${API}/photos/${editingCaptionPhotoId}`, { 
        ...originalPhoto, 
        caption: captionDraft 
      });
      
      // 화면에 즉시 반영되도록 상태 업데이트
      setChapterPhotos(prev => {
        const next = { ...prev };
        for (const [chId, photos] of Object.entries(next)) {
          next[chId] = photos.map(p => 
            p.photo_id === editingCaptionPhotoId ? { ...p, caption: captionDraft } : p
          );
        }
        return next;
      });

      setEditingCaptionPhotoId(null);
      setCaptionDraft('');

      if (onPhotoUpdate) {
        onPhotoUpdate();
      }
    } catch (error) {
      console.error("캡션 저장 실패:", error);
      alert("저장에 실패했습니다.");
    }
  };

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

// 💡 사진이 있으면 챕터에서 삭제하고, 없으면 추가하는 토글 함수
  const handleAddPhoto = async (chapterId: string, photoId: string, isAdded: boolean) => {
    try {
      if (isAdded) {
        // 이미 추가된 사진이면 제거
        await axios.delete(`${API}/chapters/${chapterId}/photos/${photoId}`)
      } else {
        // 없는 사진이면 추가
        await axios.post(`${API}/chapters/${chapterId}/photos`, { photo_id: photoId })
      }
      fetchChapterPhotos(chapterId) // 화면 즉시 새로고침
    } catch (error) {
      console.error(error)
      alert('사진 상태 변경에 실패했습니다.')
    }
  }
  
  const handleRemovePhoto = async (chapterId: string, photoId: string) => {
    await axios.delete(`${API}/chapters/${chapterId}/photos/${photoId}`)
    fetchChapterPhotos(chapterId)
  }

  const handleMoveChapter = async (chapterId: string, direction: 'up' | 'down') => {
      const currentChapter = chapters.find(c => c.id === chapterId)
      if (!currentChapter) return

      const siblings = chapters
        .filter(c => (c.parent_id || null) === (currentChapter.parent_id || null))
        .sort((a, b) => a.order_num - b.order_num)

      const currentIndex = siblings.findIndex(c => c.id === chapterId)
      if (currentIndex === -1) return

      if (direction === 'up' && currentIndex === 0) return
      if (direction === 'down' && currentIndex === siblings.length - 1) return

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      
      const newSiblings = [...siblings]
      const [movedItem] = newSiblings.splice(currentIndex, 1)
      newSiblings.splice(targetIndex, 0, movedItem)

      try {
        const chapterIds = newSiblings.map(c => c.id)
        await axios.put(`${API}/chapters/reorder`, { chapter_ids: chapterIds })
        fetchChapters()
      } catch (error) {
        console.error('Failed to reorder chapters:', error)
        alert('순서 변경에 실패했습니다.')
      }
    }

  // 💡 [추가] 휴지통에 가지 않은(allPhotos에 존재하는) 챕터 사진만 걸러내는 함수
    const getVisibleChapterPhotos = (chapterId: string) => {
      return (chapterPhotos[chapterId] || []).filter(cp => 
        allPhotos.some(p => p.id === cp.photo_id)
      );
    };

    // 1. 화면에 보이는 순서대로 모든 사진을 연결하는 함수 (수정됨)
    const getFlattenedPhotos = () => {
      let flat: ChapterPhoto[] = [];
      const mainChapters = chapters.filter(c => !c.parent_id); 
      
      mainChapters.forEach(mainChap => {
        flat = flat.concat(getVisibleChapterPhotos(mainChap.id)); // 수정됨
        const subChapters = chapters.filter(c => c.parent_id === mainChap.id);
        subChapters.forEach(subChap => {
          flat = flat.concat(getVisibleChapterPhotos(subChap.id)); // 수정됨
        });
      });
      return flat;
    };

    // 👇 [추가 2] 라이트박스에서 'Chapter 1.1 - 제목' 형태로 정확히 표시해 주는 함수
    const getChapterDisplayTitle = (chapterId: string) => {
      const chapter = chapters.find(c => c.id === chapterId);
      if (!chapter) return '';

      const mainChapters = chapters.filter(c => !c.parent_id);

      if (chapter.parent_id) {
        // 서브 챕터인 경우 (예: Chapter 1.1)
        const parentIndex = mainChapters.findIndex(c => c.id === chapter.parent_id);
        const subChapters = chapters.filter(c => c.parent_id === chapter.parent_id);
        const subIndex = subChapters.findIndex(c => c.id === chapterId);
        return `Chapter ${parentIndex + 1}.${subIndex + 1} - ${chapter.title}`;
      } else {
        // 최상위 챕터인 경우 (예: Chapter 1)
        const mainIndex = mainChapters.findIndex(c => c.id === chapterId);
        return `Chapter ${mainIndex + 1}. ${chapter.title}`;
      }
    };

  return (
    <div className="flex gap-6 relative">
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
              {t('story.addChapter')}
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
                          <span className="text-xs text-gray-400 mr-2">{t('story.chapter')} {idx + 1}</span>
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

                  {/* 챕터 사진 */}
                  <div className="p-4">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, chapter.id)}>
                      <SortableContext items={getVisibleChapterPhotos(chapter.id).map(p => p.id)} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {getVisibleChapterPhotos(chapter.id).map(cp => (
                            <SortablePhotoChapter
                              // ... (이 안에 들어가는 key, id 등의 props는 기존 그대로 둡니다)                              
                              key={cp.id}
                              id={cp.id}
                              imageUrl={cp.image_url}
                              photoId={cp.photo_id}
                              chapterId={chapter.id}
                              caption={cp.caption} // 👇 연동
                              onRemove={handleRemovePhoto}
                              onClick={() => {
                                const flatPhotos = getFlattenedPhotos(); // 1. 전체 사진 목록 가져오기
                                const globalIndex = flatPhotos.findIndex(p => p.id === cp.id); // 2. 전체 목록에서 내가 클릭한 사진의 번호 찾기
                                setCurrentChapterPhotos(flatPhotos); // 3. 라이트박스에 전체 사진 전달
                                setSelectedPhotoIndex(globalIndex); // 4. 라이트박스 시작 번호 설정
                              }}
                                onEditCaption={(photoId, caption) => {
                                setEditingCaptionPhotoId(photoId);
                                setCaptionDraft(caption);
                              }} // 👇 물방울 클릭 시 모달 열기
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
                        {allPhotos
                          // 💡 1. 여기서 이미 추가된 사진을 걸러냅니다 (숨김 처리)
                          .filter(photo => {
                            const isAdded = chapterPhotos[showPhotoSelector]?.some(cp => cp.photo_id === photo.id)
                            return !isAdded; // 추가 안 된 사진만 남김
                          })
                          // 💡 2. 남은 사진만 화면에 그립니다
                          .map(photo => (
                            <div
                              key={photo.id}
                              className="relative w-24 h-24 shrink-0 bg-gray-100 rounded overflow-hidden cursor-pointer transition hover:opacity-80"
                              // 여기서는 추가(isAdded = false)만 일어납니다.
                              onClick={() => handleAddPhoto(showPhotoSelector, photo.id, false)}
                            >
                              <img src={photo.image_url} alt="photo" className="w-full h-full object-cover" />
                            </div>
                          ))
                        }
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
                            <span className="text-xs text-blue-500 mr-2">Chapter {idx + 1}.{subIdx + 1}</span>
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
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, subChapter.id)}>
                        <SortableContext items={getVisibleChapterPhotos(chapter.id).map(p => p.id)} strategy={rectSortingStrategy}>
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            {getVisibleChapterPhotos(subChapter.id).map(cp => (
                              <SortablePhotoChapter
                                // ... (이 안에 들어가는 key, id 등의 props는 기존 그대로 둡니다)
                                key={cp.id}
                                id={cp.id}
                                imageUrl={cp.image_url}
                                photoId={cp.photo_id}
                                chapterId={subChapter.id}
                                caption={cp.caption} // 👇 연동
                                onRemove={handleRemovePhoto}
                                onClick={() => {
                                  const flatPhotos = getFlattenedPhotos(); // 1. 전체 사진 목록 가져오기
                                  const globalIndex = flatPhotos.findIndex(p => p.id === cp.id); // 2. 전체 목록에서 내가 클릭한 사진의 번호 찾기
                                  setCurrentChapterPhotos(flatPhotos); // 3. 라이트박스에 전체 사진 전달
                                  setSelectedPhotoIndex(globalIndex); // 4. 라이트박스 시작 번호 설정
                                }}
                                onEditCaption={(photoId, caption) => {
                                  setEditingCaptionPhotoId(photoId);
                                  setCaptionDraft(caption);
                                }} // 👇 연동
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
                            {allPhotos
                            // 💡 1. 여기서 이미 추가된 사진을 걸러냅니다 (숨김 처리)
                            .filter(photo => {
                              const isAdded = chapterPhotos[showPhotoSelector]?.some(cp => cp.photo_id === photo.id)
                              return !isAdded; // 추가 안 된 사진만 남김
                            })
                            // 💡 2. 남은 사진만 화면에 그립니다
                            .map(photo => (
                              <div
                                key={photo.id}
                                className="relative w-24 h-24 shrink-0 bg-gray-100 rounded overflow-hidden cursor-pointer transition hover:opacity-80"
                                // 여기서는 추가(isAdded = false)만 일어납니다.
                                onClick={() => handleAddPhoto(showPhotoSelector, photo.id, false)}
                              >
                                <img src={photo.image_url} alt="photo" className="w-full h-full object-cover" />
                              </div>
                            ))
                          }
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
          <div className="flex-1 flex flex-col items-center justify-center p-4 relative w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            
            {/* 💡 1. 이미지 박스의 높이를 기존 80vh에서 70vh(모바일은 65vh)로 줄여 텍스트가 들어갈 '안전 공간'을 확보합니다. */}
            <div className="relative flex items-center justify-center w-full h-[65vh] sm:h-[70vh]">
              <img 
                src={currentChapterPhotos[selectedPhotoIndex].image_url} 
                alt={currentChapterPhotos[selectedPhotoIndex].caption || ''} 
                className="max-w-full max-h-full object-contain shadow-lg" 
              />
              
              {/* 💡 2. 텍스트 영역 (이미지 바로 아래에 위치) */}
              <div className="absolute top-full mt-2 left-0 w-full flex flex-col items-center">
                {/* 캡션 (만약 글이 너무 길어질 경우를 대비해 스크롤이 생기도록 안전장치 max-h 추가) */}
                {currentChapterPhotos[selectedPhotoIndex].caption && (
                  <p className="text-white text-sm text-center max-w-3xl px-4 max-h-[15vh] overflow-y-auto custom-scrollbar">
                    {currentChapterPhotos[selectedPhotoIndex].caption}
                  </p>
                )}

                {/* 챕터 이름 + 페이지 번호 */}
                <div className="flex items-center justify-center gap-2 mt-2 text-xs">
                  <span className="text-gray-400">
                    {getChapterDisplayTitle(currentChapterPhotos[selectedPhotoIndex].chapter_id)}
                  </span>
                  <span className="text-gray-600">|</span>
                  <span className="text-gray-500">
                    {selectedPhotoIndex + 1} / {currentChapterPhotos.length}
                  </span>
                </div>
              </div>
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

      {/* 👇 [핵심 추가] 캡션 편집 모달 창 (DeliveryPage 스타일 적용) */}
      {editingCaptionPhotoId && (
        <div
          className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setEditingCaptionPhotoId(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold mb-3 text-gray-900">{t('photo.addCaption')}</h3>
            <textarea
              className="w-full h-28 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder={t('photo.addCaptionDesc')}
              value={captionDraft}
              onChange={e => setCaptionDraft(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setEditingCaptionPhotoId(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveCaption}
                className="px-4 py-2 text-sm rounded-lg bg-gray-900 hover:bg-gray-700 text-white font-medium shadow-sm"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}