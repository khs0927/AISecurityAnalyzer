#!/bin/bash

# 현재 디렉토리가 저장소 루트인지 확인
if [ ! -d ".git" ]; then
  echo "이 스크립트는 저장소 루트에서 실행해야 합니다."
  exit 1
fi

# GitHub CLI가 설치되어 있는지 확인
if ! command -v gh &> /dev/null; then
  echo "GitHub CLI(gh)가 설치되어 있지 않습니다."
  echo "수동으로 GitHub 저장소에 다음 시크릿을 등록해주세요:"
  cat << EOF
  SESSION_SECRET: your_session_secret_here
  OPENAI_API_KEY: your_openai_api_key_here
  DATABASE_URL: postgresql://user:password@host:port/database
  PGHOST: your_pg_host_here
  PGUSER: your_pg_user_here
  PGPASSWORD: your_pg_password_here
  VITE_FIREBASE_API_KEY: your_firebase_api_key_here
  VITE_FIREBASE_APP_ID: your_firebase_app_id_here
  VITE_FIREBASE_PROJECT_ID: your_firebase_project_id_here
  FIREBASE_DATABASE_URL: your_firebase_db_url_here
  PUBMED_API_KEY: your_pubmed_api_key_here
  GITHUB_TOKEN: your_github_token_here
  HF_TOKEN: your_hf_token_here
  HUGGINGFACE_TOKEN: your_huggingface_token_here
  HUGGINGFACE_API_KEY: your_huggingface_api_key_here
  KAKAO_MAP_API_KEY: your_kakao_map_api_key_here
  VERCEL_TOKEN: your_vercel_token_here
  VERCEL_ORG_ID: your_vercel_org_id_here
  VERCEL_PROJECT_ID: your_vercel_project_id_here
EOF
  exit 1
fi

# GitHub가 로그인되어 있는지 확인
if ! gh auth status &> /dev/null; then
  echo "GitHub CLI에 로그인되어 있지 않습니다. 다음 명령어로 로그인해주세요:"
  echo "gh auth login"
  exit 1
fi

echo "GitHub Actions 시크릿을 등록합니다..."

# 모든 시크릿 정의
declare -A secrets=(
  ["SESSION_SECRET"]="your_session_secret_here"
  ["OPENAI_API_KEY"]="your_openai_api_key_here"
  ["DATABASE_URL"]="postgresql://user:password@host:port/database"
  ["PGHOST"]="your_pg_host_here"
  ["PGUSER"]="your_pg_user_here"
  ["PGPASSWORD"]="your_pg_password_here"
  ["VITE_FIREBASE_API_KEY"]="your_firebase_api_key_here"
  ["VITE_FIREBASE_APP_ID"]="your_firebase_app_id_here"
  ["VITE_FIREBASE_PROJECT_ID"]="your_firebase_project_id_here"
  ["FIREBASE_DATABASE_URL"]="your_firebase_db_url_here"
  ["PUBMED_API_KEY"]="your_pubmed_api_key_here"
  ["GITHUB_TOKEN"]="your_github_token_here"
  ["HF_TOKEN"]="your_hf_token_here"
  ["HUGGINGFACE_TOKEN"]="your_huggingface_token_here"
  ["HUGGINGFACE_API_KEY"]="your_huggingface_api_key_here"
  ["KAKAO_MAP_API_KEY"]="your_kakao_map_api_key_here"
  ["VERCEL_TOKEN"]="your_vercel_token_here"
  ["VERCEL_ORG_ID"]="your_vercel_org_id_here"
  ["VERCEL_PROJECT_ID"]="your_vercel_project_id_here"
)

# 각 시크릿 등록
for key in "${!secrets[@]}"; do
  echo "시크릿 등록: $key"
  gh secret set "$key" -b "${secrets[$key]}"
done

echo "시크릿 등록이 완료되었습니다!"
echo "변경사항을 커밋하고 푸시하여 GitHub 파이프라인을 시작하세요." 