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

# 백엔드 테스트
cd backend && pytest

# 프론트엔드 빌드
cd frontend && npm run build

# Electron 개발 실행 (프론트엔드 dev 서버 먼저 실행 필요)
cd electron && npm run dev

# Electron macOS 패키징
cd electron && npm run package:mac
```

## 아키텍처

Racconto는 사진작가용 포트폴리오·납품 관리 앱으로, 세 개의 독립 레이어로 구성된다.

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
