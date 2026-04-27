# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 코드 작성 규칙

- **절대 모킹하지 않기**: 실제 동작하는 코드만 작성
- **오버엔지니어링 금지**: 요청된 기능만 구현, 임의로 추가 금지
- **Python**: Type hints 필수, `app.models`의 ORM 기반 작업
- **TypeScript**: 인터페이스 선언 우선, Tailwind CSS 사용
- **다국어**: `react-i18next` 사용, 한국어/영어 동시 지원 확인 필수 (`frontend/src/i18n/locales/ko.json`, `en.json`)
- **답변**: 묻는 것에만 답하기

## 주요 명령어

```bash
# 전체 로컬 개발 (Docker DB + FastAPI + React 동시 실행)
./dev.sh

# 백엔드만 실행
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# 백엔드 테스트 전체
cd backend && pytest
# 백엔드 테스트 단일
cd backend && pytest tests/test_file.py::test_function_name

# 프론트엔드 빌드
cd frontend && npm run build

# Electron 개발 실행 (프론트엔드 dev 서버 먼저 실행 필요)
cd electron && npm run dev

# Electron macOS 패키징
cd electron && npm run package:mac
```

## 아키텍처

Racconto는 모든 사진가를 위한 스토리 창작 앱이며, 세 개의 독립 레이어로 구성된다.

### Backend (`backend/app/`)
FastAPI + SQLAlchemy + PostgreSQL (Docker). `database.py`의 `get_db()`를 DI로 사용.

**라우터 목록** (`main.py`에 모두 등록됨):
- `auth` — JWT 발급/검증, 이메일 인증 (Brevo)
- `projects` — 프로젝트 CRUD, 소프트 삭제 (`deleted_at`)
- `photos` — Cloudflare Images 업로드/삭제
- `chapters` — 챕터 구조 (자기참조 `parent_id`, `order_num`)
- `notes` — 사진 연결 메모 (`photo_id` FK)
- `delivery` — 납품 링크 + 고객 사진 선택
- `portfolio` — 공개 포트폴리오
- `settings` — 사용자 설정 key-value
- `admin` — 관리자 전용

> `Pitch` 모델은 `models.py`에 정의되어 있으나 전용 라우터 없음 — `projects` 라우터 내에서 처리됨.

**핵심 모델 관계**:
```
User → Project(s) → Photo(s)
                  → Chapter(s) → ChapterPhoto
                  → Note(s) [photo_id nullable]
                  → DeliveryLink(s) → DeliverySelection(s)
                  → Pitch(es)
```

`deleted_at` 소프트 삭제: Project, Photo, Note 모두 적용. 휴지통 30일 자동 삭제는 APScheduler로 `main.py`에서 실행.

### Frontend (`frontend/src/`)
React + Vite + TypeScript + Tailwind CSS.

- **Context**: `AuthContext` (JWT + 유저 상태), `ElectronSidebarContext` (Electron 사이드바 상태)
- **Electron 감지**: `window.racconto` 존재 여부로 웹/Electron 분기
- **라우팅**: React Router, 페이지는 `pages/` 디렉터리
- **환경변수**: `frontend/.env` (`VITE_API_URL=http://localhost:8000`), `frontend/.env.production` (`VITE_API_URL=https://racconto.app/api`)

### Electron (`electron/`)
데스크톱 앱. **preload.js의 `contextBridge`를 통해서만 IPC 노출** (보안 규칙).

- `main.js` — BrowserWindow, IPC 핸들러, `chokidar` 파일 감시, Cloudflare 업로드
- `preload.js` — `window.racconto.*` API 노출 (contextBridge)
- `queue.js` — 오프라인 업로드 큐 (`userData/upload_queue.json`에 영속화)
- `folderMap.js` — 로컬 폴더 ↔ 프로젝트 매핑 (`userData/folder_map.json`에 영속화)

API 베이스: dev는 `http://localhost:8000`, 패키징 후는 `https://racconto.app/api`

## 주의사항

- **사진 삭제 시**: `photos.py`의 `delete_cf_files_parallel()` 사용 필수 (Cloudflare Images 동시 삭제)
- **Electron IPC 추가 시**: `preload.js`의 `contextBridge`에도 반드시 노출 등록
- **User 한도**: `photo_limit`(기본 1000), `project_limit`(기본 3) — 라우터에서 초과 검사
- **환경변수**: 백엔드는 `backend/.env`의 `DATABASE_URL` 필수

## 개발 일지 업데이트

작업 완료 시 아래 Obsidian 파일을 직접 업데이트할 것 (iCloud 동기화 중).

- **개발 일지**: `/Users/dawoon/Library/Mobile Documents/iCloud~md~obsidian/Documents/Dawoon's Notes/1. 공부/0) Racconto 프로젝트/Racconto 개발 일지 (최신).md`
- **기술 스택**: `/Users/dawoon/Library/Mobile Documents/iCloud~md~obsidian/Documents/Dawoon's Notes/1. 공부/0) Racconto 프로젝트/Racconto 기술 스택 및 정보 (최신).md`

**개발 일지 규칙**:
- 날짜 헤더: `## 2026-MM-DD (N차)` — 같은 날 여러 작업 시 차수 증가
- 작업 내용 헤더: `### 작업 내용: [간단한 제목]`
- 완료: `- [x] 설명` / 미완료: `- [ ] 설명`
- 파일/함수명은 백틱: `main.py`, `delete_cf_files_parallel()`
- 타이밍: 기능 완료, 버그 수정 완료, 커밋 직전
- 파일 끝에 추가 (기존 내용 수정 금지)

**기술 스택 파일 규칙**:
- 새 기능 완성 시 `### 완성된 기능` 체크박스에 추가
- 폴더 구조/DB 구조·CASCADE 변경 시 해당 섹션 반영
- 진행 중/예정 항목은 `### 진행 중 / 예정` 섹션 관리

---

## 코딩 가이드라인

### 구현 전 사고

- 가정을 명시적으로 밝힐 것. 불확실하면 먼저 질문.
- 해석이 여러 가지라면 제시할 것 — 묵묵히 선택하지 말 것.
- 더 단순한 접근법이 있으면 말할 것.

### 단순성 우선

- 요청된 기능 외 추가 금지.
- 단일 사용 코드에 추상화 금지.
- "유연성"이나 요청되지 않은 설정 가능성 금지.
- 불가능한 시나리오에 대한 에러 핸들링 금지.

### 수술적 변경

- 필요한 곳만 수정. 인접 코드 정리 금지.
- 깨지지 않은 것 리팩토링 금지.
- 기존 스타일 유지.
- 내 변경이 만든 orphan(미사용 import/변수/함수)은 제거.

### 목표 중심 실행

다단계 작업 시 간단한 계획을 먼저 제시:
```
1. [단계] → 검증: [확인 방법]
2. [단계] → 검증: [확인 방법]
```


## 🎨 디자인 시스템 — 아이콘 규칙

### 이모지 아이콘 사용 금지

UI 컴포넌트에서 이모지를 아이콘 대용으로 절대 사용하지 말 것.
이모지(📁 📝 🗑 💻 📖 👁 ☀️ 🌙 📍 등)는 OS마다 색감·비율·렌더링이
달라서 Racconto의 에디토리얼 톤을 깬다.

**금지 패턴:**
```tsx
// ❌ 이모지 아이콘
<span>📁</span>
<button>🗑 삭제</button>
{isDark ? '🌙' : '☀️'}
```

### Lucide React 아이콘 세트 단일 표준

모든 아이콘은 `lucide-react` 패키드만 사용한다.
이미 설치되어 있으므로 추가 설치 불필요.

**올바른 사용법:**
```tsx
import { Folder, FileText, Trash2, Monitor, BookOpen,
         Eye, Sun, Moon, MapPin } from 'lucide-react'

// 기본 stroke width: 1.5 (Instrument Serif와 잘 맞는 절제된 굵기)
<Trash2 size={16} strokeWidth={1.5} />
<MapPin size={16} strokeWidth={1.5} />
```

**strokeWidth 규칙:**
- 기본값: `1.5` (전체 UI 통일)
- 강조가 필요한 경우만 예외적으로 `2` 허용
- `strokeWidth` 미지정 시 Lucide 기본값(2)이 들어가므로 반드시 명시할 것

**자주 쓰는 아이콘 대응표:**

| 기존 이모지 | Lucide 컴포넌트 |
|------------|----------------|
| 📁 | `<Folder />` |
| 📝 | `<FileText />` |
| 🗑 | `<Trash2 />` |
| 💻 | `<Monitor />` |
| 📖 | `<BookOpen />` |
| 👁 | `<Eye />` |
| ☀️ | `<Sun />` |
| 🌙 | `<Moon />` |
| 📍 | `<MapPin />` |

### 기존 코드 수정 시

작업 중 이모지 아이콘을 발견하면 해당 파일 범위 안에서 함께 교체할 것.
단, 이모지 교체만을 목적으로 한 대규모 리팩토링은 별도 커밋으로 분리한다.

**커밋 메시지 예시:**

style: 이모지 아이콘 → Lucide 아이콘 교체 (ProjectDetail, Navbar)

### 예외

- 실제 텍스트 콘텐츠(캡션, 설명글, 마케팅 카피)의 이모지는 허용
- CLAUDE.md 등 개발 문서 내부의 이모지는 허용
- 사용자가 입력한 텍스트에 포함된 이모지는 그대로 렌더링