# 클로드 코드 작업 지시서
## Racconto — 모바일/태블릿 UI/UX 전환 (데스크톱 코드 무수정 원칙)
**v3 — 태블릿 분기 추가 / 모바일 편집 환경 구체화 / PublicPortfolio 모바일 최적화**

---

## 핵심 원칙

> **기존 파일은 단 한 줄도 수정하지 않는다.**
> 모바일/태블릿 전용 파일을 새로 만들고, 진입점(라우터/앱 루트)에서 디바이스 감지 후 자동 분기한다.
> 기존 파일은 import 대상 또는 로직 복사의 참고 대상으로만 사용한다.
>
> **예외:** `main.tsx` 1줄 (AppRouter import 교체)

---

## 0. 사전 준비

### 0-1. 디바이스 감지 유틸리티

**파일:** `src/utils/deviceDetect.ts` (신규)

```ts
export const isMobileDevice = (): boolean =>
  /Android.*Mobile|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i
    .test(navigator.userAgent)

export const isTabletDevice = (): boolean =>
  /iPad/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
  (/Android/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent))

// SSR / 테스트 환경 대비
const safeNavigator = typeof navigator !== 'undefined' ? navigator : null

export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  if (!safeNavigator) return 'desktop'
  if (isMobileDevice()) return 'mobile'
  if (isTabletDevice()) return 'tablet'
  return 'desktop'
}
```

### 0-2. 모바일 전용 Context

**파일:** `src/context/MobileLayoutContext.tsx` (신규)

`useMobileLayout()` 훅 제공. 아래 값을 전역으로 관리한다.

- `bottomSheetContent: ReactNode | null`
- `setBottomSheetContent(node)`
- `fabAction: (() => void) | null`
- `setFabAction(fn)`

기존 `ElectronSidebarContext`와 충돌하지 않도록, 이 Context는 MobileApp/TabletApp 하위에서만 제공한다.

---

## 1. 라우터/앱 진입점 분기

**파일:** `src/AppRouter.tsx` (신규)

```tsx
import { getDeviceType } from './utils/deviceDetect'
import App from './App'
import MobileApp from './MobileApp'
import TabletApp from './TabletApp'

export default function AppRouter() {
  const device = getDeviceType()
  if (device === 'mobile') return <MobileApp />
  if (device === 'tablet') return <TabletApp />
  return <App />
}
```

**`main.tsx` 허용 변경 (1줄만):**
```tsx
// 변경 전: import App from './App'  →  <App />
// 변경 후: import AppRouter from './AppRouter'  →  <AppRouter />
```

---

## 2. 태블릿 앱 (TabletApp)

### 2-1. 기본 전략

태블릿은 데스크톱 `App` 레이아웃을 그대로 사용하되, hover 의존 UI에 터치 이벤트를 병행 추가하는 래퍼 레이어를 적용한다. 완전히 새로 만들지 않는다.

**파일:** `src/TabletApp.tsx` (신규)

```tsx
import App from './App'
import { TabletTouchProvider } from './context/TabletTouchContext'

export default function TabletApp() {
  return (
    <TabletTouchProvider>
      <App />
    </TabletTouchProvider>
  )
}
```

### 2-2. TabletTouchContext

**파일:** `src/context/TabletTouchContext.tsx` (신규)

전역 CSS 클래스 `.tablet-mode`를 `<html>`에 주입하여, 태블릿 전용 CSS 오버라이드를 가능하게 한다.

```tsx
export function TabletTouchProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('tablet-mode')
    return () => document.documentElement.classList.remove('tablet-mode')
  }, [])
  return <>{children}</>
}
```

### 2-3. 태블릿 터치 보완 대상

아래 요소들은 hover에만 의존하므로, `.tablet-mode` CSS 및 전용 래퍼 컴포넌트로 터치 접근성을 보완한다.

#### PhotoCard hover 오버레이

**파일:** `src/components/tablet/TabletPhotoCard.tsx` (신규)

기존 `PhotoCard` Props 타입 재사용.

변경 사항:
- hover 오버레이를 `onMouseEnter` + `onTouchStart` 병행으로 처리
- 롱프레스(500ms) → 오버레이 고정 표시 (탭으로 해제)
- 컬러 라벨 크기: `w-4 h-4` (기존 `w-2.5`에서 확대)
- 터치 타겟: 편집/삭제 버튼 `min-w-[44px] min-h-[44px]`

```ts
const longPressTimer = useRef<ReturnType<typeof setTimeout>>()
const [overlayLocked, setOverlayLocked] = useState(false)

const handleTouchStart = () => {
  longPressTimer.current = setTimeout(() => setOverlayLocked(true), 500)
}
const handleTouchEnd = () => clearTimeout(longPressTimer.current)
const handleTouchMove = () => clearTimeout(longPressTimer.current)
```

#### Story 블록 hover 툴바

**파일:** `src/components/tablet/TabletStoryBlock.tsx` (신규)

변경 사항:
- 드래그 핸들: `-left-5` 위치 제거 → 블록 상단 헤더 행에 항상 노출
- 레이아웃 전환 버튼 (grid/wide/single): hover 툴바 제거 → 블록 헤더에 항상 노출된 세그먼트 버튼
- 텍스트 편집: 탭 시 편집 가능 (기존 click과 동일)
- DnD: `PointerSensor` 유지 (iPad에서 Apple Pencil/마우스 지원)

#### 사이드바 hover 버튼

**파일:** `src/components/tablet/TabletSidebar.tsx` (신규)

변경 사항:
- hover에서만 보이던 액션 버튼을 항상 노출 (`opacity-100` 고정)
- 터치 타겟 `min-h-[44px]` 보장

#### Safe Area (태블릿)

```css
/* tablet-mode에서 적용 */
.tablet-mode {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

## 3. 모바일 앱 루트

**파일:** `src/MobileApp.tsx` (신규)

- 기존 `App.tsx` 라우팅 구조 참고, 모든 경로를 모바일 전용 페이지로 매핑
- `MobileLayoutContext.Provider`로 앱 전체를 감싼다
- 기존 `AuthContext` 등은 그대로 import하여 사용

```
/               → /projects로 redirect
/projects       → MobileProjectList (신규)
/projects/:id   → MobileProjectDetail (신규)
/:username      → MobilePublicPortfolio (신규)
/settings       → MobileSettings (신규)
/trash          → MobileTrash (신규)
```

---

## 4. 공통 레이아웃 컴포넌트 (신규)

### 4-1. MobileShell

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
padding-left: env(safe-area-inset-left);
padding-right: env(safe-area-inset-right);
```

### 4-2. MobileBottomNav

**파일:** `src/components/mobile/MobileBottomNav.tsx` (신규)

탭 구성: Projects · Portfolio · Settings
- 각 탭 최소 터치 영역: `min-h-[56px]`
- lucide-react 아이콘 + 짧은 레이블
- `useLocation()`으로 현재 경로 기반 활성 탭 표시
- 아이콘: `Camera`, `Aperture`, `Settings` (기존 `ElectronSidebar` 참고)

### 4-3. MobileTopBar

**파일:** `src/components/mobile/MobileTopBar.tsx` (신규)

Props: `title: string`, `showBack?: boolean`, `rightAction?: ReactNode`
- 뒤로가기: `useNavigate(-1)`
- 높이 56px + `padding-top: env(safe-area-inset-top)`

### 4-4. MobileBottomSheet

**파일:** `src/components/mobile/MobileBottomSheet.tsx` (신규)

- `MobileLayoutContext`의 `bottomSheetContent` 구독
- `null`이면 미표시, 값 있으면 슬라이드업 표시
- 배경 딤(dim) 탭 시 닫힘
- 최대 높이 `80dvh`, 내부 스크롤 가능
- 드래그 다운으로 닫기:

```ts
const sheetStartY = useRef(0)  // ← useRef 필수, 클로저 변수 사용 금지

const handleTouchStart = (e: React.TouchEvent) => {
  sheetStartY.current = e.touches[0].clientY
}
const handleTouchMove = (e: React.TouchEvent) => {
  if (e.touches[0].clientY - sheetStartY.current > 80) close()
}
```

### 4-5. MobileFAB

**파일:** `src/components/mobile/MobileFAB.tsx` (신규)

- `MobileLayoutContext`의 `fabAction` 구독, `null`이면 미표시
- 위치: `fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-5`
- 크기: `56px × 56px`, `+` 아이콘

### 4-6. MobileSegmentTabs

**파일:** `src/components/mobile/MobileSegmentTabs.tsx` (신규)

Props: `tabs: { key: string; label: string; icon?: LucideIcon }[]`, `activeTab: string`, `onChange: (key: string) => void`
- `position: sticky; top: 0; z-index: 10`
- 탭 높이 44px, 각 탭 `flex: 1`
- `icon`은 옵셔널 — 아이콘 없이 텍스트만으로도 사용 가능

---

## 5. 모바일 페이지 (신규)

### 5-1. MobileProjectList

**파일:** `src/pages/mobile/MobileProjectList.tsx` (신규)

**`Projects.tsx`에서 복사할 로직:**
- `Project` 인터페이스 전체
- `fetchProjects()` — `axios.get('/projects/')`
- `handleDelete()` — confirm 모달 → `axios.delete` → `setProjects(prev.filter(...))` → `triggerRefresh()`
- `handleSubmit()` — 새 프로젝트 생성 (PROJECT_LIMIT_EXCEEDED 에러 처리 포함)
- `toast` / `confirmModal` 상태 관리
- 순서 변경: Phase 1에서는 "위로/아래로" 버튼으로 구현, DnD는 Phase 2

**상태값:**

| 값 | i18n 키 | 색상 배지 |
|---|---|---|
| `in_progress` | `t('project.statusInProgress')` | `bg-purple-400` |
| `completed` | `t('project.statusCompleted')` | `bg-green-500` |
| `published` | `t('project.statusPublished')` | `bg-blue-400` |
| `archived` | `t('project.statusArchived')` | `bg-stone-300` |

`isPublic` 값은 문자열 `'true'` / `'false'` (boolean 아님, Projects.tsx 기준 그대로)

**모바일 UI:**
- 단일 컬럼 리스트 (`flex-col`)
- 카드: 커버 이미지(좌, `w-20 h-20`) + 제목·상태배지·장소(우) 수평 배치
- 편집/삭제: 카드 우측 `⋮` 버튼 → Bottom Sheet
- 새 프로젝트: FAB(+) → 전체화면 슬라이드업 모달
  - 폼 필드: title, description, location, status, is_public
  - `title_en`, `description_en`: 기존 방식 그대로 (빈 문자열 전송)
- `ConfirmModal`, `ToastNotification` 기존 컴포넌트 재사용

### 5-2. MobileProjectDetail

**파일:** `src/pages/mobile/MobileProjectDetail.tsx` (신규)

기존 `ProjectDetail.tsx`의 state 및 API 호출 로직 그대로 복사, JSX만 모바일로 재작성.

**탭 구성 (`MobileSegmentTabs` 사용):** Photos / Story / Notes

**Photos 탭:**
- 그리드: 기본 2열 (`grid-cols-2`), 사용자 설정 1열/2열/3열
- 필터·업로드: FAB(+) → `setBottomSheetContent`로 Sheet에 주입
- `MobilePhotoCard` 사용
- 다중 선택 하단 바: `padding-bottom: env(safe-area-inset-bottom)` 적용

**Story 탭:**
- `MobileStoryTab` 사용 (6절 참조)

**Notes 탭:**
- `ProjectNotes` 컴포넌트 그대로 import하여 렌더링
- 새 노트 FAB 등록: `setFabAction(() => openNewNoteModal())`

### 5-3. MobilePublicPortfolio

**파일:** `src/pages/mobile/MobilePublicPortfolio.tsx` (신규)

기존 `PublicPortfolio.tsx` 데이터 fetching/state 로직 복사.

**renderRow 모바일 최적화:**

기존 데스크톱의 `renderRow`는 `PORTFOLIO_WIDTH` 고정값 기반 px 계산으로 이미지 너비를 결정한다.
모바일에서는 이를 flex 비율 기반으로 전환한다.

```tsx
// 변경 전 (px 고정)
style={{ width: `${rowHeight * ratios[j]}px`, height: `${rowHeight}px` }}

// 변경 후 (flex 비율 기반)
style={{ flex: ratios[j], aspectRatio: `${ratios[j] * 100} / 100` }}
```

`ResizeObserver`로 컨테이너 실측 너비 측정 후 `MobilePortfolioChapterItems`에 전달:
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

**행 높이 조정:**
- 데스크톱 기본 행 높이를 모바일에서 그대로 쓰면 사진이 너무 작아짐
- 모바일 기본 행 높이: `containerWidth * 0.45` (화면 너비의 약 45%)로 동적 계산
- `containerWidth < 480`이면 Side-by-Side 블록을 `flex-col` 세로 스택으로 자동 전환

**기타 UI:**
- 프로젝트 목록: 단일 컬럼 카드 (커버 이미지 + 제목 + 위치)
- 라이트박스: `MobileLightbox` 사용
- 다크모드 토글: 터치 영역 `p-3` 이상

### 5-4. MobileSettings

기존 `Settings` 컴포넌트를 `MobileShell` 안에서 그대로 렌더링. 별도 재작성 불필요.

### 5-5. MobileTrash

기존 `Trash` 컴포넌트를 `MobileShell` 안에서 그대로 렌더링. 별도 재작성 불필요.

---

## 6. Story 탭 — MobileStoryTab

### 6-1. 전체 구조

**파일:** `src/components/mobile/story/MobileStoryTab.tsx` (신규)

Story 탭은 **편집 모드**와 **미리보기 모드**를 세그먼트 토글로 전환한다.

```
┌────────────────────────────┐
│  [편집]        [미리보기]   │  ← 상단 고정 세그먼트 토글
├────────────────────────────┤
│  편집 모드: MobileStoryEditor  │
│  미리보기: MobileStoryViewer   │
└────────────────────────────┘
```

FAB 동작:
- 편집 모드: TEXT 블록 추가
- 미리보기 모드: FAB 숨김

### 6-2. MobileStoryEditor (편집 모드 — 블록 목록)

**파일:** `src/components/mobile/story/MobileStoryEditor.tsx` (신규)

블록 목록을 세로로 나열하고, 순서 변경 및 블록 탭 시 전체화면 편집으로 진입.

**블록 카드 구성:**

```
┌──────────────────────────────────────┐
│ [≡] PHOTO 블록  또는  TEXT 블록  [⋮] │  ← 헤더 행 (드래그 핸들 항상 노출)
├──────────────────────────────────────┤
│ PHOTO: 고정 그리드 + +N 배지          │
│ TEXT:  텍스트 미리보기 2줄            │
└──────────────────────────────────────┘
```

**PHOTO 블록 카드 — 고정 그리드 + +N 배지:**
- 앞 3장을 `3×1` 가로 그리드로 표시
- 사진 순서는 블록 내 편집 순서 기준 (서버에서 받은 `order` 기준 정렬 후 표시)
- 4장 이상이면 3번째 슬롯에 `+N` 오버레이 표시 (N = 전체 장수 - 2)
- 총 3장 이하면 빈 슬롯 없이 있는 만큼만 표시

```tsx
const displayPhotos = photos.slice(0, 3)
const remainCount = photos.length - 2  // 3번째 슬롯에 +N 표시용

<div className="grid grid-cols-3 gap-1">
  {displayPhotos.map((photo, i) => (
    <div key={photo.id} className="aspect-[3/2] relative overflow-hidden rounded">
      <img src={photo.image_url} className="w-full h-full object-cover" />
      {i === 2 && remainCount > 1 && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <span className="text-white text-sm font-semibold">+{remainCount}</span>
        </div>
      )}
    </div>
  ))}
</div>
```

**TEXT 블록 카드:**
- 텍스트 내용 2줄 미리보기 (`line-clamp-2`)
- 내용 없으면 placeholder 표시

**블록 순서 변경:**
- Phase 1: 블록 헤더의 위/아래 버튼으로 순서 변경
- Phase 2: `TouchSensor` DnD로 교체

```ts
// Phase 2 TouchSensor 설정
import { TouchSensor } from '@dnd-kit/core'

const sensors = useSensors(
  useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    }
  })
)
```

**TEXT 블록 생성/삭제:**
- 생성: FAB(+) → 새 TEXT 블록 목록 하단에 추가
- 삭제: 블록 헤더 `⋮` 버튼 → 삭제 확인 → 제거

**블록 탭 → 전체화면 편집 진입:**
- PHOTO 블록 탭: `MobilePhotoBlockEditor` 오픈
- TEXT 블록 탭: `MobileTextEditorModal` 오픈

### 6-3. MobilePhotoBlockEditor (PHOTO 블록 전체화면 편집)

**파일:** `src/components/mobile/story/MobilePhotoBlockEditor.tsx` (신규)

전체화면 모달. Props: `block`, `allBlocks`, `onClose`, `onSave`

**구성:**
- 상단: 닫기(✕) + 블록 제목 + 저장 버튼
- 레이아웃 설정: grid / wide / single 세그먼트 버튼 (항상 노출)
- 사진 목록: 편집 가능한 순서 (위/아래 버튼 또는 Phase 2 DnD)
- 개별 사진 액션 (각 사진 우측 `⋮` 버튼):
  - 다른 블록으로 이동 → `MobileMoveBlockSheet` 오픈
  - 새 블록으로 이동 → `MobileMoveBlockSheet`에서 `+ (새 블록)` 슬롯 선택
  - 블록에서 제거 (사진 삭제 아님)

**블록 내 모든 사진이 이동되면 해당 블록 자동 삭제** — 저장 시 빈 블록 감지 후 제거 처리.

### 6-4. MobileMoveBlockSheet (블록 이동 선택 Sheet)

**파일:** `src/components/mobile/story/MobileMoveBlockSheet.tsx` (신규)

기존 데스크톱의 `ConfirmModal (type: 'moveBlock')`을 Bottom Sheet로 재구현.

데스크톱 기존 구현:
```tsx
// 3열 그리드로 블록 목록 표시, 마지막에 새 블록 슬롯(+) 추가
// block.firstImageUrl로 대표 썸네일 표시
```

모바일 재구현:
- Bottom Sheet 내 3열 그리드 유지 (기존 데스크톱과 동일한 구조)
- 각 슬롯: 대표 썸네일 + `aspect-[3/2]`
- 마지막 슬롯: `+` (새 블록 생성)
- Sheet 높이: `auto` (그리드 크기에 맞춤), 최대 `60dvh`

```tsx
// 데스크톱 ConfirmModal의 moveBlock 로직 그대로 재사용
// onSelect(blockId) → 해당 블록으로 이동
// onSelect('new') → 새 블록으로 이동
```

### 6-5. MobileTextEditorModal (TEXT 블록 전체화면 편집)

**파일:** `src/components/mobile/story/MobileTextEditorModal.tsx` (신규)

- 전체화면 모달
- `textarea` auto-resize (`scrollHeight` 기반)
- `padding-bottom: env(safe-area-inset-bottom)` 적용 (소프트 키보드 safe area)
- `MarkdownRenderer`로 미리보기 토글 가능 (옵션)
- 저장 / 취소 버튼

### 6-6. MobileStoryViewer (미리보기 모드)

**파일:** `src/components/mobile/story/MobileStoryViewer.tsx` (신규)

Story 블록을 읽기 전용으로 렌더링.

**Props:**
```ts
interface MobileStoryViewerProps {
  chapters: Chapter[]
  darkMode?: boolean
  onPhotoClick?: (item: ChapterItem) => void
}
```

**사진 블록 (`block_type === 'default'`):**
```tsx
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

**Side-by-Side 블록:** 모바일에서 세로 스택 (`flex-col` 고정, 좌/우 방향 무시).

**DnD 코드 완전 금지:** `useSortable`, `DndContext`, `SortableContext` 등 일절 사용 안 함.

---

## 7. 모바일 전용 컴포넌트 (신규)

### 7-1. MobilePhotoCard

**파일:** `src/components/mobile/MobilePhotoCard.tsx` (신규)

기존 `PhotoCard` Props 타입 재사용.

변경 사항:
- hover 오버레이 제거
- 롱프레스(500ms) → `MobilePhotoActionSheet` 노출
- 스크롤 중 롱프레스 취소 (`onTouchMove`에서 clearTimeout)
- 일반 탭 → `onOpenLightbox`
- 컬러 라벨: `w-4 h-4` 이상
- 선택 모드 체크박스: 기존 로직 유지

```ts
const longPressTimer = useRef<ReturnType<typeof setTimeout>>()
const handleTouchStart = () => {
  longPressTimer.current = setTimeout(() => setShowActionSheet(true), 500)
}
const handleTouchEnd = () => clearTimeout(longPressTimer.current)
const handleTouchMove = () => clearTimeout(longPressTimer.current)
```

### 7-2. MobilePhotoActionSheet

**파일:** `src/components/mobile/MobilePhotoActionSheet.tsx` (신규)

Props: `photo`, `onSetCover`, `onDelete`, `onSetRating`, `onSetColorLabel`, `onAddToChapter`, `chapters`, `onClose`

구성:
- 별점 5개 — 각 `min-h-[44px] min-w-[44px]`
- 컬러 라벨 5개 — `w-8 h-8` 원형
- 커버로 지정 버튼
- 챕터 추가 → 챕터 목록 Sub-Sheet
- 삭제 버튼 (빨간색)
- 취소 버튼

### 7-3. MobileLightbox

**파일:** `src/components/mobile/MobileLightbox.tsx` (신규)

기존 `Lightbox` Props 타입 재사용.

변경 사항:
- 상단: 닫기(✕) + `n / total` 인덱스만 표시
- 이미지: `width: 100%; height: 100dvh; object-fit: contain`
- 좌우 이동: 스와이프 제스처

```ts
const touchStartX = useRef(0)  // ← useRef 필수

const handleTouchStart = (e: React.TouchEvent) => {
  touchStartX.current = e.touches[0].clientX
}
const handleTouchEnd = (e: React.TouchEvent) => {
  const delta = e.changedTouches[0].clientX - touchStartX.current
  // 오른쪽 스와이프(delta > 50) → 이전 사진
  // 왼쪽 스와이프(delta < -50) → 다음 사진
  if (delta < -50 && idx < photos.length - 1) onNavigate(photos[idx + 1])
  if (delta > 50 && idx > 0) onNavigate(photos[idx - 1])
}
```

- 하단 고정 바 (`position: fixed; bottom: 0`): 별점·컬러라벨·챕터·노트·회전 아이콘
- 챕터 선택, 노트 패널: Bottom Sheet로 노출
- 키보드 이벤트 유지 (기존 로직 복사)
- EXIF: 하단 바 내 접힘/펼침 토글

### 7-4. MobilePortfolioChapterItems

**파일:** `src/components/mobile/MobilePortfolioChapterItems.tsx` (신규)

기존 `PortfolioChapterItems.tsx` Props 타입 재사용.
**`PORTFOLIO_WIDTH` 고정값 사용 금지. `containerWidth` prop 필수.**

핵심 변경:
```tsx
// 변경 전 (px 고정)
style={{ width: `${rowHeight * ratios[j]}px`, height: `${rowHeight}px` }}

// 변경 후 (flex 비율 기반)
style={{ flex: ratios[j], aspectRatio: `${ratios[j] * 100} / 100` }}
```
- `width: effectiveWidth + 'px'` 모두 `width: '100%'`로 교체
- `containerWidth < 480`이면 Side-by-Side 블록 `flex-col` 세로 스택 자동 전환

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

### useRef 규칙
터치 이벤트에서 상태를 추적하는 변수는 반드시 `useRef` 사용. 클로저 변수 사용 금지.
(예: `sheetStartY`, `touchStartX`, `longPressTimer`)

### 신규 i18n 키
`locales/ko.json`과 `locales/en.json` 양쪽에 추가:
```json
"story": {
  "mobileReadOnly": "편집은 데스크톱에서 가능합니다",
  "editMode": "편집",
  "previewMode": "미리보기",
  "addTextBlock": "텍스트 블록 추가",
  "deleteBlock": "블록 삭제"
}
```
```json
"story": {
  "mobileReadOnly": "Editing is available on desktop",
  "editMode": "Edit",
  "previewMode": "Preview",
  "addTextBlock": "Add Text Block",
  "deleteBlock": "Delete Block"
}
```

---

## 9. 파일 구조 전체

```
src/
├── AppRouter.tsx                                      ← 신규 (디바이스 분기 진입점)
├── MobileApp.tsx                                      ← 신규 (모바일 라우팅 루트)
├── TabletApp.tsx                                      ← 신규 (태블릿 래퍼)
├── utils/
│   └── deviceDetect.ts                               ← 신규
├── context/
│   ├── MobileLayoutContext.tsx                        ← 신규
│   └── TabletTouchContext.tsx                         ← 신규
├── components/
│   ├── mobile/
│   │   ├── MobileShell.tsx                           ← 신규
│   │   ├── MobileBottomNav.tsx                       ← 신규
│   │   ├── MobileTopBar.tsx                          ← 신규
│   │   ├── MobileBottomSheet.tsx                     ← 신규
│   │   ├── MobileFAB.tsx                             ← 신규
│   │   ├── MobileSegmentTabs.tsx                     ← 신규
│   │   ├── MobilePhotoCard.tsx                       ← 신규
│   │   ├── MobilePhotoActionSheet.tsx                ← 신규
│   │   ├── MobileLightbox.tsx                        ← 신규
│   │   ├── MobilePortfolioChapterItems.tsx           ← 신규
│   │   └── story/
│   │       ├── MobileStoryTab.tsx                    ← 신규
│   │       ├── MobileStoryEditor.tsx                 ← 신규 (블록 목록 + 순서 변경)
│   │       ├── MobileStoryViewer.tsx                 ← 신규 (읽기 전용 미리보기)
│   │       ├── MobilePhotoBlockEditor.tsx            ← 신규 (PHOTO 블록 전체화면 편집)
│   │       ├── MobileMoveBlockSheet.tsx              ← 신규 (블록 이동 선택)
│   │       └── MobileTextEditorModal.tsx             ← 신규 (TEXT 블록 전체화면 편집)
│   └── tablet/
│       ├── TabletPhotoCard.tsx                       ← 신규
│       ├── TabletStoryBlock.tsx                      ← 신규
│       └── TabletSidebar.tsx                         ← 신규
└── pages/mobile/
    ├── MobileProjectList.tsx                         ← 신규
    ├── MobileProjectDetail.tsx                       ← 신규
    ├── MobilePublicPortfolio.tsx                     ← 신규
    ├── MobileSettings.tsx                            ← 신규
    └── MobileTrash.tsx                               ← 신규
```

**수정 허용 파일:** `main.tsx` 1줄
**수정 금지 파일:** 그 외 모든 기존 파일

---

## 10. 작업 순서 (Priority)

| 단계 | 작업 | 대상 파일 |
|------|------|-----------|
| **P0-1** | 디바이스 감지 유틸 + AppRouter | `deviceDetect.ts`, `AppRouter.tsx`, `main.tsx` (1줄) |
| **P0-2** | MobileLayoutContext + TabletTouchContext | `MobileLayoutContext.tsx`, `TabletTouchContext.tsx` |
| **P0-3** | 공통 모바일 레이아웃 | `MobileShell`, `MobileTopBar`, `MobileBottomNav`, `MobileBottomSheet`, `MobileFAB` |
| **P0-4** | TabletApp + 태블릿 터치 보완 컴포넌트 | `TabletApp.tsx`, `TabletPhotoCard`, `TabletStoryBlock`, `TabletSidebar` |
| **P0-5** | MobileApp 라우팅 + MobileProjectList | `MobileApp.tsx`, `MobileProjectList.tsx` |
| **P0-6** | MobileProjectDetail Photos 탭 | `MobileProjectDetail.tsx`, `MobilePhotoCard`, `MobilePhotoActionSheet` |
| **P0-7** | MobileLightbox | `MobileLightbox.tsx` |
| **P1-1** | MobileStoryTab + MobileStoryEditor (블록 목록, Phase 1 위/아래 버튼) | `MobileStoryTab.tsx`, `MobileStoryEditor.tsx` |
| **P1-2** | MobilePhotoBlockEditor + MobileMoveBlockSheet | `MobilePhotoBlockEditor.tsx`, `MobileMoveBlockSheet.tsx` |
| **P1-3** | MobileTextEditorModal + MobileStoryViewer | `MobileTextEditorModal.tsx`, `MobileStoryViewer.tsx` |
| **P1-4** | MobileProjectDetail Story/Notes 탭 완성 | `MobileProjectDetail.tsx` |
| **P1-5** | MobilePortfolioChapterItems + MobilePublicPortfolio | `MobilePortfolioChapterItems.tsx`, `MobilePublicPortfolio.tsx` |
| **P1-6** | MobileSettings + MobileTrash + MobileSegmentTabs 고도화 | 해당 파일들 |
| **P2-1** | MobileStoryEditor TouchSensor DnD 전환 | `MobileStoryEditor.tsx` |
| **P2-2** | MobileProjectList DnD 전환 | `MobileProjectList.tsx` |
| **P2-3** | 스와이프 공통 훅 추출 | `src/hooks/useSwipe.ts` (신규) |

---

## 11. 검증 체크리스트

### 공통
- [ ] `git diff` 기준으로 기존 파일이 수정되지 않았는가
- [ ] `main.tsx`는 AppRouter import 1줄만 변경되었는가

### 모바일
- [ ] iPhone Safari에서 상하단 safe area가 콘텐츠를 가리지 않는가
- [ ] 모든 인터랙티브 요소의 터치 타겟이 44px 이상인가
- [ ] 터치 이벤트 추적 변수가 `useRef`로 선언되었는가 (클로저 변수 없음)
- [ ] `MobileBottomSheet` 드래그 다운 닫기가 iOS/Android 양쪽에서 작동하는가
- [ ] `MobilePortfolioChapterItems`에 고정 px 너비가 전달되지 않는가
- [ ] `MobileProjectList`의 상태값이 `Projects.tsx` 기준과 일치하는가
- [ ] `isPublic` 값이 문자열 `'true'`/`'false'`로 처리되는가
- [ ] `PROJECT_LIMIT_EXCEEDED` 에러 처리가 모바일 폼에도 구현되어 있는가
- [ ] `MobileStoryViewer`에서 DnD 관련 코드가 없는가
- [ ] PHOTO 블록 카드 미리보기 사진 순서가 블록 내 편집 순서와 일치하는가
- [ ] 블록 내 모든 사진 이동 시 빈 PHOTO 블록이 자동 삭제되는가
- [ ] TEXT 블록 생성/삭제가 모바일에서 동작하는가
- [ ] `MobilePublicPortfolio`의 행 높이가 `containerWidth * 0.45`로 동적 계산되는가

### 태블릿
- [ ] iPad (iOS 13+)에서 `isTabletDevice()`가 올바르게 감지되는가
- [ ] `.tablet-mode` 클래스가 `<html>`에 주입/제거되는가
- [ ] `TabletPhotoCard`에서 롱프레스 오버레이 고정이 작동하는가
- [ ] `TabletStoryBlock`에서 드래그 핸들과 레이아웃 버튼이 항상 노출되는가
- [ ] `TabletSidebar` 액션 버튼 터치 타겟이 44px 이상인가
- [ ] `MobileLayoutContext`가 태블릿 환경에서 활성화되지 않는가
