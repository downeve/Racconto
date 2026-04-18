#!/bin/bash
echo "🧹 이전 프로세스 정리 중..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

echo "📦 1. Docker DB를 시작합니다..."
docker start racconto_db

echo "🐍 2. 백엔드(FastAPI) 서버를 시작합니다..."
cd ~/Racconto/backend
source venv/bin/activate
uvicorn app.main:app --reload &
BACKEND_PID=$!

echo "⚛️ 3. 프론트엔드(React) 서버를 시작합니다..."
cd ~/Racconto/frontend
npm run dev &
FRONTEND_PID=$!

trap "echo '🛑 개발 서버를 모두 종료합니다...'; kill -- -$BACKEND_PID -$FRONTEND_PID 2>/dev/null; lsof -ti:8000 | xargs kill -9 2>/dev/null || true; lsof -ti:5173 | xargs kill -9 2>/dev/null || true; exit" SIGINT SIGTERM EXIT

wait