#!/bin/bash

# 배포 스크립트
# 사용법: ./deploy.sh [환경]
# 예시: ./deploy.sh production

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 환경 변수 설정
ENV=${1:-staging}
echo -e "${BLUE}배포 환경: ${ENV}${NC}"

# 디렉토리 확인
if [ ! -d "server" ] || [ ! -d "client" ]; then
  echo -e "${RED}Error: 프로젝트 루트 디렉토리에서 실행해주세요.${NC}"
  exit 1
fi

# 환경 변수 파일 확인
if [ ! -f ".env.serverless" ]; then
  echo -e "${RED}Error: .env.serverless 파일을 찾을 수 없습니다.${NC}"
  exit 1
fi

# 1. 종속성 설치
echo -e "${YELLOW}1. 종속성 설치 중...${NC}"
pnpm install
if [ $? -ne 0 ]; then
  echo -e "${RED}종속성 설치 실패${NC}"
  exit 1
fi
echo -e "${GREEN}종속성 설치 완료${NC}"

# 2. 환경 변수 설정
echo -e "${YELLOW}2. 환경 변수 설정 중...${NC}"
cp .env.serverless server/.env.production
cp .env.serverless client/.env.production
if [ $? -ne 0 ]; then
  echo -e "${RED}환경 변수 설정 실패${NC}"
  exit 1
fi
echo -e "${GREEN}환경 변수 설정 완료${NC}"

# 3. 클라이언트 빌드
echo -e "${YELLOW}3. 클라이언트 빌드 중...${NC}"
pnpm --filter client build
if [ $? -ne 0 ]; then
  echo -e "${RED}클라이언트 빌드 실패${NC}"
  exit 1
fi
echo -e "${GREEN}클라이언트 빌드 완료${NC}"

# 4. 서버 빌드
echo -e "${YELLOW}4. 서버 빌드 중...${NC}"
pnpm --filter server build
if [ $? -ne 0 ]; then
  echo -e "${RED}서버 빌드 실패${NC}"
  exit 1
fi
echo -e "${GREEN}서버 빌드 완료${NC}"

# 5. 서버 배포 번들 준비
echo -e "${YELLOW}5. 서버 배포 번들 준비 중...${NC}"
mkdir -p deploy
cp -r server/dist deploy/
cp server/package.json deploy/
cp server/.env.production deploy/
cd deploy && tar -czf ../server-deploy.tar.gz .
cd ..
if [ $? -ne 0 ]; then
  echo -e "${RED}서버 배포 번들 준비 실패${NC}"
  exit 1
fi
echo -e "${GREEN}서버 배포 번들 준비 완료${NC}"

# 6. Netlify 클라이언트 배포 확인
echo -e "${YELLOW}6. Netlify CLI 확인 중...${NC}"
if ! command -v netlify &> /dev/null; then
  echo -e "${BLUE}Netlify CLI 설치 중...${NC}"
  npm install -g netlify-cli
fi
echo -e "${GREEN}Netlify CLI 확인 완료${NC}"

# 7. Netlify에 클라이언트 배포
echo -e "${YELLOW}7. Netlify에 클라이언트 배포 중...${NC}"
if [ "$ENV" = "production" ]; then
  netlify deploy --dir=client/dist --prod
else
  netlify deploy --dir=client/dist
fi
if [ $? -ne 0 ]; then
  echo -e "${RED}Netlify 배포 실패${NC}"
  exit 1
fi
echo -e "${GREEN}Netlify 배포 완료${NC}"

# 8. 서버에 배포 번들 전송 안내
echo -e "${BLUE}8. 서버 배포 준비 완료${NC}"
echo -e "${YELLOW}다음 단계로 서버에 배포 번들(server-deploy.tar.gz)을 전송하고 배포해야 합니다.${NC}"
echo -e "${YELLOW}다음 명령어를 실행하여 서버에 배포할 수 있습니다:${NC}"
echo -e "${GREEN}scp server-deploy.tar.gz username@your-server:/tmp/${NC}"
echo -e "${GREEN}ssh username@your-server \"mkdir -p ~/nottoday-server && cd ~/nottoday-server && tar -xzf /tmp/server-deploy.tar.gz -C . && npm install --production && pm2 restart nottoday-api || pm2 start dist/index.js --name nottoday-api\"${NC}"

echo -e "${BLUE}배포 준비 완료!${NC}"
exit 0 