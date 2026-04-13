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