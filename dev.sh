#!/bin/bash

echo "📦 1. Docker DB를 시작합니다..."
docker start fotpm-db

echo "🐍 2. 백엔드(FastAPI) 서버를 시작합니다..."
cd ~/FotoPM/backend
source venv/bin/activate
uvicorn app.main:app --reload &
BACKEND_PID=$!  # 백엔드 프로세스 ID 저장

echo "⚛️ 3. 프론트엔드(React) 서버를 시작합니다..."
cd ~/FotoPM/frontend
npm run dev &
FRONTEND_PID=$! # 프론트엔드 프로세스 ID 저장

# 🛑 꿀팁: Ctrl+C (종료) 누를 때 백엔드/프론트엔드 프로세스 한 번에 죽이기 (포트 꼬임 방지)
trap "echo '🛑 개발 서버를 모두 종료합니다...'; kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT

# 백그라운드 작업들이 끝날 때까지 대기 (이게 있어야 터미널이 안 꺼집니다)
wait