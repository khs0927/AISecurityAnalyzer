#!/bin/bash

echo "병원 데이터 API 연동 스크립트 실행"
echo "====================================="

# API 키 설정 확인
if [ -z "$HIRA_API_KEY" ]; then
  export HIRA_API_KEY="t61l9sApoYD1s94RX8r8mk68mMtGPVT4gsKp7eG3e86b2tzDANPjoHscFR7C/6i0arJe3lMxEUhELK5o6avD3g=="
  echo "기본 API 키를 사용합니다."
else
  echo "환경 변수에서 API 키를 사용합니다."
fi

echo "병원 데이터 가져오기 스크립트 실행 중..."
npx tsx server/scripts/fetch-full-hospital-data.ts

exit 0