#!/bin/bash

# GitHub Actions Secrets 등록 스크립트
# 저장소 루트에서 실행: bash scripts/set-github-secrets.sh

echo "GitHub Actions Secrets 등록을 시작합니다..."

# 시크릿 값 설정
SESSION_SECRET="[YOUR_SESSION_SECRET]"
OPENAI_API_KEY="[YOUR_OPENAI_API_KEY]"
DATABASE_URL="[YOUR_DATABASE_URL]"
PGDATABASE="neondb"
PGHOST="[YOUR_PG_HOST]"
PGPORT="5432"
PGUSER="[YOUR_PG_USER]"
PGPASSWORD="[YOUR_PG_PASSWORD]"
VITE_FIREBASE_API_KEY="[YOUR_FIREBASE_API_KEY]"
VITE_FIREBASE_APP_ID="[YOUR_FIREBASE_APP_ID]"
VITE_FIREBASE_PROJECT_ID="[YOUR_FIREBASE_PROJECT_ID]"
FIREBASE_DATABASE_URL="[YOUR_FIREBASE_DB_URL]"
PUBMED_API_KEY="[YOUR_PUBMED_API_KEY]"
GITHUB_TOKEN="[YOUR_GITHUB_TOKEN]"
HF_TOKEN="[YOUR_HF_TOKEN]"
HUGGINGFACE_TOKEN="[YOUR_HUGGINGFACE_TOKEN]"
HUGGINGFACE_API_KEY="[YOUR_HUGGINGFACE_API_KEY]"
KAKAO_MAP_API_KEY="[YOUR_KAKAO_MAP_API_KEY]"
VERCEL_TOKEN="[YOUR_VERCEL_TOKEN]"

# Vercel 정보 - khs0927s-projects/not-today 프로젝트의 ID 값 (추후 수정 필요)
VERCEL_ORG_ID="[YOUR_VERCEL_ORG_ID]"
VERCEL_PROJECT_ID="[YOUR_VERCEL_PROJECT_ID]"

# GitHub CLI로 시크릿 등록
if command -v gh &> /dev/null; then
    echo "GitHub CLI를 사용하여 시크릿을 등록합니다..."
    
    gh secret set SESSION_SECRET --body "$SESSION_SECRET"
    gh secret set OPENAI_API_KEY --body "$OPENAI_API_KEY"
    gh secret set DATABASE_URL --body "$DATABASE_URL"
    gh secret set PGDATABASE --body "$PGDATABASE"
    gh secret set PGHOST --body "$PGHOST"
    gh secret set PGPORT --body "$PGPORT"
    gh secret set PGUSER --body "$PGUSER"
    gh secret set PGPASSWORD --body "$PGPASSWORD"
    gh secret set VITE_FIREBASE_API_KEY --body "$VITE_FIREBASE_API_KEY"
    gh secret set VITE_FIREBASE_APP_ID --body "$VITE_FIREBASE_APP_ID"
    gh secret set VITE_FIREBASE_PROJECT_ID --body "$VITE_FIREBASE_PROJECT_ID"
    gh secret set FIREBASE_DATABASE_URL --body "$FIREBASE_DATABASE_URL"
    gh secret set PUBMED_API_KEY --body "$PUBMED_API_KEY"
    gh secret set GITHUB_TOKEN --body "$GITHUB_TOKEN"
    gh secret set HF_TOKEN --body "$HF_TOKEN"
    gh secret set HUGGINGFACE_TOKEN --body "$HUGGINGFACE_TOKEN"
    gh secret set HUGGINGFACE_API_KEY --body "$HUGGINGFACE_API_KEY"
    gh secret set KAKAO_MAP_API_KEY --body "$KAKAO_MAP_API_KEY"
    gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN"
    gh secret set VERCEL_ORG_ID --body "$VERCEL_ORG_ID"
    gh secret set VERCEL_PROJECT_ID --body "$VERCEL_PROJECT_ID"
    
    echo "✅ 모든 시크릿이 GitHub Actions에 등록되었습니다."
else
    echo "❌ GitHub CLI(gh)가 설치되어 있지 않습니다. 시크릿 등록을 수동으로 진행하세요."
    echo "GitHub CLI 설치: https://cli.github.com/manual/installation"
    
    echo "시크릿 목록 (GitHub 저장소 Settings -> Secrets -> Actions -> New repository secret 에서 등록):"
    echo "SESSION_SECRET: [시크릿 값을 직접 입력하세요]"
    echo "OPENAI_API_KEY: [시크릿 값을 직접 입력하세요]"
    echo "DATABASE_URL: [시크릿 값을 직접 입력하세요]"
    # 나머지 시크릿 정보 출력...
fi

echo "GitHub 파이프라인 실행을 위해 깃 커밋 및 푸시를 진행하세요." 