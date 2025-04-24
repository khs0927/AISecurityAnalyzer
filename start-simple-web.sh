#!/bin/bash
# 모바일 앱을 위한 정적 웹 페이지 서버 실행 스크립트

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 사용할 포트
PORT=4000

# 디렉토리 확인
echo -e "${BLUE}[1/3]${NC} 📁 앱 디렉토리 확인 중..."
mkdir -p expo-mobile-app/assets
cd expo-mobile-app || { echo -e "${RED}❌ 디렉토리 생성 실패${NC}"; exit 1; }

# 실행 중인 프로세스 종료
echo -e "${BLUE}[2/3]${NC} 🔍 실행 중인 서버 프로세스 확인 및 종료 중..."
pgrep -f "http-server" | xargs kill -9 2>/dev/null || true

# 서버 시작
echo -e "${BLUE}[3/3]${NC} 🚀 모바일 앱 데모 웹 서버 시작 중... (포트: ${PORT})"
echo -e "${GREEN}✅ 서버가 시작되면 다음 URL로 접속하세요:${NC}"
echo -e "${GREEN}   https://expo-mobile-app-${PORT}.repl.co/fallback.html${NC}"

# 먼저 http-server가 설치되어 있는지 확인하고 없으면 설치
if ! npm list -g http-server 2>/dev/null | grep -q http-server; then
    echo -e "${YELLOW}⚠️  http-server를 설치합니다...${NC}"
    npm install -g http-server --legacy-peer-deps
fi

# HTTP 서버 실행
echo -e "${BLUE}💻 서버 시작 중...${NC}"
npx http-server . -p ${PORT} --cors