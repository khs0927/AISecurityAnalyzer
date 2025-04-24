#!/bin/bash

# 데이터베이스 마이그레이션 스크립트
# 사용법: ./migrate.sh [환경]
# 예시: ./migrate.sh production

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 환경 변수 설정
ENV=${1:-staging}
echo -e "${BLUE}마이그레이션 환경: ${ENV}${NC}"

# 디렉토리 확인
if [ ! -d "server" ]; then
  echo -e "${RED}Error: 프로젝트 루트 디렉토리에서 실행해주세요.${NC}"
  exit 1
fi

# 환경 변수 파일 확인
if [ ! -f ".env.serverless" ]; then
  echo -e "${RED}Error: .env.serverless 파일을 찾을 수 없습니다.${NC}"
  exit 1
fi

# 1. 환경 변수 설정
echo -e "${YELLOW}1. 환경 변수 설정 중...${NC}"
cp .env.serverless server/.env
if [ $? -ne 0 ]; then
  echo -e "${RED}환경 변수 설정 실패${NC}"
  exit 1
fi
echo -e "${GREEN}환경 변수 설정 완료${NC}"

# 2. 종속성 설치
echo -e "${YELLOW}2. 종속성 설치 중...${NC}"
pnpm install
if [ $? -ne 0 ]; then
  echo -e "${RED}종속성 설치 실패${NC}"
  exit 1
fi
echo -e "${GREEN}종속성 설치 완료${NC}"

# 3. 마이그레이션 실행
echo -e "${YELLOW}3. 데이터베이스 마이그레이션 실행 중...${NC}"
cd server && pnpm supabase db migration list
echo -e "${BLUE}적용할 마이그레이션 목록입니다. 계속하시겠습니까? (y/n)${NC}"
read -r answer
if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
  echo -e "${YELLOW}마이그레이션이 취소되었습니다.${NC}"
  exit 0
fi

cd server && pnpm supabase db migrate
if [ $? -ne 0 ]; then
  echo -e "${RED}마이그레이션 실패${NC}"
  exit 1
fi
echo -e "${GREEN}마이그레이션 완료${NC}"

# 4. 데이터 시드 옵션
echo -e "${BLUE}4. 샘플 데이터를 시드하시겠습니까? (y/n)${NC}"
read -r seed_answer
if [[ "$seed_answer" == "y" || "$seed_answer" == "Y" ]]; then
  echo -e "${YELLOW}데이터 시드 실행 중...${NC}"
  cd server && pnpm supabase db seed
  if [ $? -ne 0 ]; then
    echo -e "${RED}데이터 시드 실패${NC}"
    exit 1
  fi
  echo -e "${GREEN}데이터 시드 완료${NC}"
else
  echo -e "${YELLOW}데이터 시드를 건너뜁니다.${NC}"
fi

echo -e "${BLUE}데이터베이스 마이그레이션이 성공적으로 완료되었습니다!${NC}"
exit 0 