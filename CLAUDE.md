# Racconto Project Guide

## 기술 스택
- **Backend**: FastAPI (Python), PostgreSQL, Docker
- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Desktop**: Electron (Main/Preload/Queue/FolderMap)
- **Image/Auth**: Cloudflare Images, JWT, Brevo (Email)

## 주요 명령어
- **로컬 실행**: `./dev.sh` (루트에서 실행)
- **백엔드 테스트**: `pytest`
- **프론트엔드 빌드**: `npm run build` (frontend 폴더)
- **Electron 실행**: `npm run dev` (electron 폴더)
- **Electron 패키지**: `npm run package:mac` (electron 폴더)

## 코드 스타일 가이드
- **Python**: Type hints 필수, `app.models`의 ORM 기반 작업.
- **TypeScript**: 인터페이스 선언 우선, Tailwind CSS 사용.
- **다국어**: `react-i18next`를 사용하며 한국어/영어 동시 지원 확인 필수.

## 주의사항
- 사진 삭제 시 `delete_cf_files_parallel` 함수를 사용하여 Cloudflare 이미지를 함께 삭제해야 함.
- Electron 앱 수정 시 `IPC 브릿지(preload.js)` 보안 규칙 준수.

## 📔 개발 일지 업데이트

작업 완료 시 아래 경로의 Obsidian 파일을 직접 업데이트할 것.
iCloud 동기화 중이므로 파일 경로 그대로 읽고 쓰면 됨.

### 파일 경로

- **개발 일지:** `/Users/dawoon/Library/Mobile Documents/iCloud~md~obsidian/Documents/Dawoon's Notes/1. 공부/0) Racconto 프로젝트/Racconto 개발 일지 (최신).md`
- **기술 스택:** `/Users/dawoon/Library/Mobile Documents/iCloud~md~obsidian/Documents/Dawoon's Notes/1. 공부/0) Racconto 프로젝트/Racconto 기술 스택 및 정보 (최신).md`

### 개발 일지 작성 규칙

- 날짜 헤더: `## 2026-MM-DD (N차)` — 같은 날 여러 작업 시 차수 증가
- 작업 내용 헤더: `### 작업 내용: [간단한 제목]`
- 완료 항목: `- [x] 설명` / 미완료: `- [ ] 설명`
- 파일/함수명은 백틱 표기: `main.py`, `delete_cf_files_parallel()`
- 업데이트 타이밍: 기능 완료, 버그 수정 완료, 커밋 직전
- 파일 끝에 추가 (기존 내용 수정 금지)

### 기술 스택 파일 업데이트 규칙

- 새 기능 완성 시 `### 완성된 기능` 체크박스에 추가
- 폴더 구조 변경 시 해당 섹션 반영
- DB 구조/CASCADE 변경 시 해당 섹션 반영
- 진행 중/예정 항목은 `### 진행 중 / 예정` 섹션 관리