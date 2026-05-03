# 클로드 코드 작업 지시서
## Racconto — 모바일 UI/UX 전환 (데스크톱 코드 무수정 원칙)
**v2 — Projects.tsx 분석 반영 / MobileStoryViewer 추가 / Phase 2 DnD 구체화**

---

## 핵심 원칙

> **기존 파일은 단 한 줄도 수정하지 않는다.**
> 모바일 전용 파일을 새로 만들고, 진입점(라우터/앱 루트)에서 OS 감지 후 자동 분기한다.
> 기존 파일은 import 대상 또는 로직 복사의 참고 대상으로만 사용한다.

---

## 0. 사전 준비

### 0-1. OS 감지 유틸리티 생성

**파일:** `src/utils/deviceDetect.ts` (신규)

```ts
export const isMobileDevice = (): boolean =>
  /Android.*Mobile|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i
    .test(navigator.userAgent)

export const isTablet = (): boolean =>
  /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent)
```

### 0-2. 모바일 전용 Context 생성

**파일:** `src/context/MobileLayoutContext.tsx` (신규)

`useMobileLayout()` 훅 제공. 아래 값을 전역으로 관리한다.

- `bottomSheetContent: ReactNode | null` — 하단 Sheet에 표시할 동적 컨텐츠
- `setBottomSheetContent(node)` — 각 모바일 페이지에서 주입
- `fabAction: (() => void) | null` — 우하단 FAB 버튼의 동작
- `setFabAction(fn)` — 탭별 FAB 동작 등록

기존 `ElectronSidebarContext`의 `setSidebarContent` 역할을 모바일에서 대체하되,
`ElectronSidebarContext` 자체는 수정하지 않는다.

---

## 1. 라우터/앱 진입점 분기

**파일:** `src/AppRouter.tsx` (신규)

```tsx
import { isMobileDevice } from './utils/deviceDetect'
import App from './App'             // 기존 데스크톱 앱 — 수정 없음
import MobileApp from './MobileApp' // 신규 모바일 앱

export default function AppRouter() {
  if (isMobileDevice()) return <MobileApp />
  return <App />
}
```

**`main.tsx` 허용 변경 (1줄만):**
```tsx
// 변경 전: import App from './App'  →  <App />
// 변경 후: import AppRouter from './AppRouter'  →  <AppRouter />
```

---

## 2. 모바일 앱 루트

**파일:** `src/MobileApp.tsx` (신규)

- 기존 `App.tsx` 라우팅 구조 참고, 모든 경로를 모바일 전용 페이지로 매핑
- `MobileLayoutContext.Provider`로 앱 전체를 감싼다
- 기존 `AuthContext`, `ElectronSidebarContext` 등은 그대로 import하여 사용

```
/               → MobileHome (신규, 또는 /projects로 redirect)
/projects       → MobileProjectList (신규)
/projects/:id   → MobileProjectDetail (신규)
/:username      → MobilePublicPortfolio (신규)
/settings       → MobileSettings (신규)
/trash          → MobileTrash (신규, 기존 Trash 컴포넌트 import)
```

---

## 3. 공통 레이아웃 컴포넌트 (신규)

### 3-1. MobileShell

**파일:** `src/components/mobile/MobileShell.tsx` (신규)

```
<div style={{ height: '100dvh', overflow: 'hidden' }}>
  <MobileTopBar />
  <main style={{ overflowY: 'auto', flex: 1 }}>
    {children}
  </main>
  <MobileBottomNav />
  <MobileBottomSheet />
  <MobileFAB />
</div>
```

모든 고정 요소에 safe area 적용:
```css
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
```

### 3-2. MobileBottomNav

**파일:** `src/components/mobile/MobileBottomNav.tsx` (신규)

탭 구성: Dashboard · Projects · Portfolio · Settings
- 각 탭 최소 터치 영역: `min-h-[56px]`
- lucide-react 아이콘(기존 사용 아이콘 재사용) + 짧은 레이블
- `useLocation()`으로 현재 경로 기반 활성 탭 표시
- 아이콘: `LayoutDashboard`, `Camera`, `Aperture`, `Settings` (기존 `ElectronSidebar` 참고)

### 3-3. MobileTopBar

**파일:** `src/components/mobile/MobileTopBar.tsx` (신규)

Props: `title: string`, `showBack?: boolean`, `rightAction?: ReactNode`
- 뒤로가기: `useNavigate(-1)`
- 높이 56px + `padding-top: env(safe-area-inset-top)`

### 3-4. MobileBottomSheet

**파일:** `src/components/mobile/MobileBottomSheet.tsx` (신규)

- `MobileLayoutContext`의 `bottomSheetContent` 구독
- `null`이면 미표시, 값 있으면 슬라이드업 표시
- 배경 딤(dim) 탭 시 닫힘
- 최대 높이 `80dvh`, 내부 스크롤 가능
- 드래그 다운으로 닫기:
  ```ts
  onTouchStart: sheetStartY = e.touches[0].clientY
  onTouchMove: if (e.touches[0].clientY - sheetStartY > 80) close()
  ```

### 3-5. MobileFAB

**파일:** `src/components/mobile/MobileFAB.tsx` (신규)

- `MobileLayoutContext`의 `fabAction` 구독, `null`이면 미표시
- 위치: `fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-5`
- 크기: `56px × 56px`, `+` 아이콘

### 3-6. MobileSegmentTabs

**파일:** `src/components/mobile/MobileSegmentTabs.tsx` (신규)

Props: `tabs: { key: string; label: string; icon: LucideIcon }[]`, `activeTab: string`, `onChange: (key: string) => void`
- `position: sticky; top: 0; z-index: 10`
- 탭 높이 44px, 각 탭 `flex: 1`
- 기존 `ElectronSidebar`의 탭 스타일 참고

---

## 4. 모바일 페이지 (신규)

### 4-1. MobileProjectList ← Projects.tsx 분석 반영

**파일:** `src/pages/mobile/MobileProjectList.tsx` (신규)

**`Projects.tsx`에서 복사할 로직:**
- `Project` 인터페이스 전체 (id, slug, title, title_en, description, status, location, cover_image_url, is_public, created_at, updated_at)
- `fetchProjects()` — `axios.get('/projects/')`
- `handleDelete()` — confirm 모달 → `axios.delete` → `setProjects(prev.filter(...))` → `triggerRefresh()`
- `handleSubmit()` — 새 프로젝트 생성 폼 제출 로직 전체 (`PROJECT_LIMIT_EXCEEDED` 에러 처리 포함)
- `toast` / `confirmModal` 상태 관리
- `sensors` / `handleDragEnd()` 로직 — **단, 모바일에서는 DnD 대신 "위로/아래로" 버튼으로 순서 변경 구현 (Phase 1)**. DnD는 Phase 2에서 `TouchSensor`로 추가.

**상태값 (Projects.tsx 기준 그대로 사용):**

| 값 | i18n 키 | 색상 배지 |
|---|---|---|
| `in_progress` | `t('project.statusInProgress')` | `bg-purple-400` |
| `completed` | `t('project.statusCompleted')` | `bg-green-500` |
| `published` | `t('project.statusPublished')` | `bg-blue-400` |
| `archived` | `t('project.statusArchived')` | `bg-stone-300` |

공개 여부: `isPublic` 값은 문자열 `'true'` / `'false'` (Projects.tsx 기준 그대로)

**모바일 UI 재작성:**
- 프로젝트 카드: 단일 컬럼 리스트 (`flex-col`)
- 카드 구성: 커버 이미지(좌, `w-20 h-20`) + 제목·상태배지·장소(우) 수평 배치
- 편집/삭제: 카드 우측 `⋮` 버튼 → Bottom Sheet (hover 없이 항상 접근 가능)
- 새 프로젝트 생성: FAB(+) → 전체화면 슬라이드업 모달 폼
  - 폼 필드: 제목(`title`), 설명(`description`), 장소(`location`), 상태(`status`), 공개 여부(`is_public`)
  - **`title_en`, `description_en` 필드는 폼에서 생략** (서버에는 빈 문자열로 전송)
- `ConfirmModal`, `ToastNotification` 기존 컴포넌트 import하여 재사용

### 4-2. MobileProjectDetail

**파일:** `src/pages/mobile/MobileProjectDetail.tsx` (신규)

기존 `ProjectDetail.tsx`의 state 및 API 호출 로직 그대로 복사, JSX만 모바일로 재작성.

**탭 구성 (`MobileSegmentTabs` 사용):** Photos / Story / Notes

**Photos 탭:**
- 그리드: 기본 2열 (`grid-cols-2`), 사용자 설정 1열/2열/3열
- 필터·업로드: FAB(+) → `setBottomSheetContent`로 Sheet에 주입
  (기존 `setSidebarContent`로 주입하던 JSX 그대로 이동)
- `PhotoCard` → `MobilePhotoCard` 사용
- 다중 선택 하단 바: `padding-bottom: env(safe-area-inset-bottom)` 적용

**Story 탭:**
- `MobileStoryViewer` 사용 (5-5 참조) — 읽기 전용 2열 뷰어
- 챕터 목록 네비게이션: `setBottomSheetContent`로 Sheet에 주입

**Notes 탭:**
- `ProjectNotes` 컴포넌트 그대로 import하여 렌더링
- 새 노트 FAB 등록: `setFabAction(() => openNewNoteModal())`

### 4-3. MobilePublicPortfolio

**파일:** `src/pages/mobile/MobilePublicPortfolio.tsx` (신규)

- 기존 `PublicPortfolio.tsx` 데이터 fetching/state 로직 복사
- `ResizeObserver`로 컨테이너 실측 너비 측정 후 `MobilePortfolioChapterItems`에 전달:
  ```tsx
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width)
    })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])
  ```
- 프로젝트 목록: 단일 컬럼 카드 (커버 이미지 + 제목 + 위치)
- 라이트박스: `MobileLightbox` 사용
- 다크모드 토글: 터치 영역 `p-3` 이상

### 4-4. MobileSettings

**파일:** `src/pages/mobile/MobileSettings.tsx` (신규)

기존 `Settings` 컴포넌트를 `MobileShell` 안에서 그대로 렌더링. 별도 재작성 불필요.

---

## 5. 모바일 전용 컴포넌트 (신규)

### 5-1. MobilePhotoCard

**파일:** `src/components/mobile/MobilePhotoCard.tsx` (신규)

기존 `PhotoCard`의 Props 타입 재사용 (import).

변경 사항:
- hover 오버레이 제거
- 롱프레스(500ms) → `MobilePhotoActionSheet` 노출
  ```ts
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>()
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => setShowActionSheet(true), 500)
  }
  const handleTouchEnd = () => clearTimeout(longPressTimer.current)
  const handleTouchMove = () => clearTimeout(longPressTimer.current) // 스크롤 중 취소
  ```
- 일반 탭 → `onOpenLightbox` (기존과 동일)
- 컬러 라벨: `w-4 h-4` 이상 (기존 `w-2.5`에서 확대)
- 선택 모드 체크박스: 기존 로직 유지

### 5-2. MobilePhotoActionSheet

**파일:** `src/components/mobile/MobilePhotoActionSheet.tsx` (신규)

Props: `photo`, `onSetCover`, `onDelete`, `onSetRating`, `onSetColorLabel`, `onAddToChapter`, `chapters`, `onClose`

구성:
- 별점 5개 — 각 `min-h-[44px] min-w-[44px]`
- 컬러 라벨 5개 — `w-8 h-8` 원형
- 커버로 지정 버튼
- 챕터 추가 → 챕터 목록 Sub-Sheet
- 삭제 버튼 (빨간색)
- 취소 버튼

### 5-3. MobileLightbox

**파일:** `src/components/mobile/MobileLightbox.tsx` (신규)

기존 `Lightbox`의 Props 타입 재사용.

변경 사항:
- 상단: 닫기(✕) + `n / total` 인덱스만 표시
- 이미지: `width: 100%; height: 100dvh; object-fit: contain`
- 좌우 이동: 스와이프 제스처
  ```ts
  const touchStartX = useRef(0)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (delta < -50 && idx < photos.length - 1) onNavigate(photos[idx + 1])
    if (delta > 50 && idx > 0) onNavigate(photos[idx - 1])
  }
  ```
- 하단 고정 바 (`position: fixed; bottom: 0`): 별점·컬러라벨·챕터·노트·회전 아이콘 배치
- 챕터 선택, 노트 패널: Bottom Sheet로 노출
- 키보드 이벤트 유지 (기존 로직 복사)
- EXIF: 하단 바 내 접힘/펼침 토글

### 5-4. MobilePortfolioChapterItems

**파일:** `src/components/mobile/MobilePortfolioChapterItems.tsx` (신규)

기존 `PortfolioChapterItems.tsx`의 Props 타입 재사용.
**`PORTFOLIO_WIDTH` 고정값 사용 금지. `containerWidth` prop 필수.**

핵심 변경:
```tsx
// 변경 전 (px 고정)
style={{ width: `${rowHeight * ratios[j]}px`, height: `${rowHeight}px` }}

// 변경 후 (flex 비율 기반)
style={{ flex: ratios[j], aspectRatio: `${ratios[j] * 100} / 100` }}
```
- `width: effectiveWidth + 'px'` 모두 `width: '100%'`로 교체
- Side-by-Side 블록: `containerWidth < 480`이면 `flex-col` 세로 스택으로 자동 전환

### 5-5. MobileStoryViewer ← 신규

**파일:** `src/components/mobile/MobileStoryViewer.tsx` (신규)

`ProjectStory`를 수정하지 않고, Story 블록을 모바일에서 읽기 전용 + 2열 그리드로 보여주는 독립 컴포넌트.

**Props:**
```ts
interface MobileStoryViewerProps {
  chapters: Chapter[]
  darkMode?: boolean
  onPhotoClick?: (item: ChapterItem) => void
}
```

`StoryBlocks.tsx`의 `ChapterItem` 타입은 import하여 재사용 (타입만, 컴포넌트는 사용 안 함).

**사진 블록 (`block_type === 'default'`):**
```tsx
// 기존 grid-cols-3 → grid-cols-2로 변경
<div className="grid grid-cols-2 gap-2">
  {photos.map(photo => (
    <div key={photo.id} className="aspect-[3/2] overflow-hidden rounded">
      <img
        src={photo.image_url}
        className="w-full h-full object-cover cursor-pointer"
        onClick={() => onPhotoClick?.(photo)}
      />
    </div>
  ))}
</div>
```

**텍스트 블록:** `MarkdownRenderer` import하여 그대로 렌더링.

**Side-by-Side 블록 (`block_type === 'side-left'` | `'side-right'`):**
- 모바일에서는 세로 스택으로 표시 (사진 위, 텍스트 아래)
- `flex-col` 고정, 좌/우 방향 무시

**DnD 코드 완전 금지:** `useSortable`, `DndContext`, `SortableContext` 등 일절 사용 안 함.

**편집 불가 안내:** 컴포넌트 하단에 작은 배너 표시
```tsx
<p className="text-center text-xs text-muted py-3">
  {t('story.mobileReadOnly')}
</p>
```

---

## 6. Story 탭 DnD Phase 2 계획

Phase 1 (`MobileStoryViewer`) 안정화 후 진행.

### 6-1. MobileStoryEditor

**파일:** `src/components/mobile/MobileStoryEditor.tsx` (신규, Phase 2)

`PointerSensor` 대신 `TouchSensor` 사용으로 스크롤 충돌 해결:
```ts
import { TouchSensor } from '@dnd-kit/core'

const sensors = useSensors(
  useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,    // 250ms 누르고 있어야 드래그 시작
      tolerance: 5,  // 5px 이상 이동하면 스크롤로 간주, 드래그 취소
    }
  })
)
```

기타 변경:
- 드래그 핸들: 블록 `-left-5` 위치 제거 → 블록 상단 헤더 행에 항상 노출
- 사진 그리드: `grid-cols-2` 유지
- 텍스트 편집: 탭 시 `MobileTextEditorModal` 오픈
- 블록 간 사진 이동: "다른 블록으로 이동" → Bottom Sheet에서 블록 선택
- 레이아웃 전환(grid/wide/single): hover 툴바 제거 → 블록 헤더의 항상 보이는 세그먼트 버튼

### 6-2. MobileTextEditorModal

**파일:** `src/components/mobile/MobileTextEditorModal.tsx` (신규, Phase 2)

- 전체화면 모달
- `textarea` auto-resize (`scrollHeight` 기반)
- `padding-bottom: env(safe-area-inset-bottom)` 적용 (소프트 키보드 safe area)
- 저장 / 취소 버튼

---

## 7. 파일 구조 전체

```
src/
├── AppRouter.tsx                                ← 신규 (OS 분기 진입점)
├── MobileApp.tsx                                ← 신규 (모바일 라우팅 루트)
├── utils/
│   └── deviceDetect.ts                          ← 신규
├── context/
│   └── MobileLayoutContext.tsx                  ← 신규
├── components/mobile/
│   ├── MobileShell.tsx                          ← 신규
│   ├── MobileBottomNav.tsx                      ← 신규
│   ├── MobileTopBar.tsx                         ← 신규
│   ├── MobileBottomSheet.tsx                    ← 신규
│   ├── MobileFAB.tsx                            ← 신규
│   ├── MobileSegmentTabs.tsx                    ← 신규
│   ├── MobilePhotoCard.tsx                      ← 신규
│   ├── MobilePhotoActionSheet.tsx               ← 신규
│   ├── MobileLightbox.tsx                       ← 신규
│   ├── MobilePortfolioChapterItems.tsx          ← 신규
│   ├── MobileStoryViewer.tsx                    ← 신규 (Phase 1)
│   ├── MobileStoryEditor.tsx                    ← 신규 (Phase 2)
│   └── MobileTextEditorModal.tsx                ← 신규 (Phase 2)
└── pages/mobile/
    ├── MobileProjectList.tsx                    ← 신규
    ├── MobileProjectDetail.tsx                  ← 신규
    ├── MobilePublicPortfolio.tsx                ← 신규
    ├── MobileSettings.tsx                       ← 신규
    └── MobileTrash.tsx                          ← 신규
```

**수정 허용 파일:** `main.tsx` 1줄
**수정 금지 파일:** 그 외 모든 기존 파일

---

## 8. 공통 구현 규칙

### 터치 타겟
- 모든 버튼/탭: `min-width: 44px`, `min-height: 44px`
- 컬러 라벨 점: `w-4 h-4` 이상, Action Sheet 내에서는 `w-8 h-8`

### Safe Area
```css
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
padding-left: env(safe-area-inset-left);
padding-right: env(safe-area-inset-right);
```

### 드롭다운 닫기 이벤트
`mousedown` 단독 사용 금지. `touchstart` 병행:
```ts
document.addEventListener('mousedown', handler)
document.addEventListener('touchstart', handler)
// cleanup에서 둘 다 removeEventListener
```

### 신규 i18n 키
`locales/ko.json`과 `locales/en.json` 양쪽에 추가:
```json
"story": {
  "mobileReadOnly": "편집은 데스크톱에서 가능합니다"
}
```
```json
"story": {
  "mobileReadOnly": "Editing is available on desktop"
}
```

---

## 9. 작업 순서 (Priority)

| 단계 | 작업 | 대상 파일 |
|------|------|-----------|
| **P0-1** | OS 감지 유틸 + AppRouter | `deviceDetect.ts`, `AppRouter.tsx`, `main.tsx` (1줄) |
| **P0-2** | MobileLayoutContext | `MobileLayoutContext.tsx` |
| **P0-3** | 공통 레이아웃 컴포넌트 | `MobileShell`, `MobileTopBar`, `MobileBottomNav`, `MobileBottomSheet`, `MobileFAB` |
| **P0-4** | MobileApp 라우팅 + MobileProjectList | `MobileApp.tsx`, `MobileProjectList.tsx` |
| **P0-5** | MobileProjectDetail Photos 탭 | `MobileProjectDetail.tsx`, `MobilePhotoCard.tsx`, `MobilePhotoActionSheet.tsx` |
| **P0-6** | MobileLightbox | `MobileLightbox.tsx` |
| **P1-1** | MobileStoryViewer (읽기 전용 2열) | `MobileStoryViewer.tsx` |
| **P1-2** | MobileProjectDetail Story/Notes 탭 완성 | `MobileProjectDetail.tsx` |
| **P1-3** | MobilePortfolioChapterItems + MobilePublicPortfolio | `MobilePortfolioChapterItems.tsx`, `MobilePublicPortfolio.tsx` |
| **P1-4** | MobileSettings + MobileTrash + MobileSegmentTabs 고도화 | 해당 파일들 |
| **P2-1** | MobileStoryEditor (TouchSensor DnD) | `MobileStoryEditor.tsx` |
| **P2-2** | MobileTextEditorModal | `MobileTextEditorModal.tsx` |
| **P2-3** | 스와이프 공통 훅 추출 | `src/hooks/useSwipe.ts` (신규) |

---

## 10. 검증 체크리스트

- [ ] `git diff` 기준으로 기존 파일이 수정되지 않았는가
- [ ] `main.tsx`는 AppRouter import 1줄만 변경되었는가
- [ ] iPhone Safari에서 상하단 safe area가 콘텐츠를 가리지 않는가
- [ ] 모든 인터랙티브 요소의 터치 타겟이 44px 이상인가
- [ ] `MobilePortfolioChapterItems`에 고정 px 너비(`848px` 등)가 전달되지 않는가
- [ ] `MobileProjectList`의 상태값이 `Projects.tsx` 기준(`in_progress` 등)과 일치하는가
- [ ] `isPublic` 값이 문자열 `'true'`/`'false'`로 처리되는가 (boolean 아님)
- [ ] `PROJECT_LIMIT_EXCEEDED` 에러 처리가 모바일 폼에도 구현되어 있는가
- [ ] `MobileStoryViewer`에서 `useSortable`, `DndContext` 등 DnD 코드가 없는가
- [ ] `MobileLayoutContext`가 `ElectronSidebarContext`와 충돌하지 않는가
- [ ] Bottom Sheet 드래그 다운 닫기가 iOS/Android 양쪽에서 작동하는가
- [ ] Phase 2 파일(`MobileStoryEditor`)이 Phase 1 완료 전에 작업되지 않았는가
