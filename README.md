# NotToday • Medical‑AI‑Agent — **v3.4 CPU Edition** 🖥️

> **End‑to‑end ECG + consult platform without any discrete GPU**.  
> Uses quantized ≤2B parameter models served by **llama.cpp (GGUF)** and lightweight CNNs.

## 🎯 주요 특징

- **CPU 전용 설계**: GPU 없이 서비스 가능한 경량 모델 아키텍처
- **최적화된 모델**: 최소 600MB에서 최대 2GB 크기의 경량화된 AI 모델
- **실시간 ECG 분석**: ONNX 기반 경량 CNN으로 ECG 부정맥 탐지
- **통합 인프라**: 모든 의료 데이터를 통합 관리하는 플랫폼
- **병렬 모델 추론**: llama.cpp 서버를 통한 최적화된 다중 워커 추론

## 🛠️ 기술 스택

- **프론트엔드**: React 19, Tailwind 4, TypeScript
- **백엔드**: Express 5, FastAPI, pnpm 모노레포
- **모델 서빙**: llama.cpp, ONNX Runtime (CPU)
- **모바일**: React Native (Expo 52)
- **데이터 파이프라인**: ETL, PubMed 임베딩
- **CI/CD**: GitHub Actions, Docker, AWS

## 📑 프로젝트 구조

```
NotToday/
├── apps/                  # 핵심 애플리케이션
│   ├── api/               # Express API 서버
│   ├── agent/             # FastAPI AI 에이전트 서버
│   ├── web/               # React 웹 클라이언트
│   └── mobile/            # React Native 모바일 앱
├── packages/              # 공유 패키지
│   ├── config/            # 구성 파일 (eslint, tsconfig 등)
│   ├── domain/            # 도메인 로직 및 타입
│   └── tests/             # 테스트 유틸리티
├── data/                  # 데이터 파이프라인
│   ├── raw/               # 원시 데이터
│   ├── processed/         # 가공된 데이터
│   └── pipelines/         # ETL 스크립트
├── models/                # 모델 파일 저장소
├── scripts/               # 유틸리티 스크립트
│   └── fetch_models.sh    # 모델 다운로드 스크립트
├── .github/workflows/     # CI/CD 파이프라인
└── infra/                 # 인프라 구성
    └── docker/            # 도커 관련 파일
```

## 💻 설치 및 실행

### 사전 요구 사항

- Node.js 20+
- Python 3.11+
- pnpm 9+
- Poetry 1.8+

### 모델 다운로드

```bash
# 약 4GB 모델 파일을 다운로드합니다
./scripts/fetch_models.sh
```

### 도커 컴포즈로 실행

```bash
# 전체 스택 실행
docker compose up --build

# 개별 서비스 실행
docker compose up llm agent  # 모델 서버만 실행
```

### 개발 모드로 실행

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev
```

## 🔬 모델 세부 정보

| 모델 | 크기 | 기능 |
|-------|------|------|
| TinyLlamaMed-1.1B | ≈1.2 GB | 일반 상담 / 추론 |
| Bio-MiniCPM-2B | ≈2.0 GB | 심층 임상 Q&A |
| BioGPT-350M | ≈0.6 GB | PubMed RAG 인코더 |
| ECGNet-small | ~80 MB | 1-lead ECG 부정맥 |

## 📈 성능 벤치마크

- **추론 시간**: 응답당 0.8-2초 (CPU 환경)
- **메모리 사용량**: 최대 4GB RAM
- **정확도**: 주요 부정맥 F1 점수 0.87

## 라이센스

이 프로젝트는 MIT 라이센스를 따릅니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

# 서버리스 배포 가이드

이 문서는 NotToday 애플리케이션을 서버리스 환경에 배포하는 방법을 설명합니다.

## 프로젝트 구조

```
NotToday/
├── client/            # 프론트엔드 애플리케이션
├── server/            # 백엔드 API 서버
├── mobile/            # 모바일 애플리케이션
├── .env.serverless    # 서버리스 환경 변수
├── .github/workflows/ # GitHub Actions 워크플로우
├── scripts/           # 배포 스크립트
└── Dockerfile         # 서버 컨테이너 이미지 정의
```

## 환경 변수 설정

1. `.env.serverless` 파일에 필요한 환경 변수를 설정합니다.
2. 실제 배포 시에는 GitHub Secrets에 민감한 정보를 저장하여 사용하세요.

## CI/CD 워크플로우

### GitHub Actions 워크플로우

프로젝트에는 다음과 같은 워크플로우 파일이 포함되어 있습니다:

- `.github/workflows/ci.yml`: 지속적 통합 파이프라인 (테스트, 빌드, 코드 검사)
- `.github/workflows/serverless-deploy.yml`: 서버리스 배포 파이프라인

### GitHub Secrets 설정

워크플로우에서 사용되는 다음 시크릿을 GitHub 저장소에 설정해야 합니다:

- `VITE_API_URL`: API 서버 URL
- `VITE_PUSHER_APP_KEY`: Pusher 앱 키
- `VITE_PUSHER_CLUSTER`: Pusher 클러스터
- `API_PORT`: API 서버 포트
- `SUPABASE_URL`: Supabase URL
- `SUPABASE_PUBLIC_KEY`: Supabase 공개 키
- `SUPABASE_SERVICE_KEY`: Supabase 서비스 키
- `SERVER_HOST`: 서버 호스트
- `SERVER_USERNAME`: 서버 사용자 이름
- `SERVER_SSH_KEY`: 서버 SSH 키
- `SERVER_PORT`: 서버 SSH 포트
- `NETLIFY_AUTH_TOKEN`: Netlify 인증 토큰
- `NETLIFY_SITE_ID`: Netlify 사이트 ID

## 수동 배포 방법

### 프론트엔드 배포 (Netlify)

```bash
# Windows
scripts\deploy.sh

# Linux/Mac
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

또는 단계별로 수행:

1. 의존성 설치: `pnpm install`
2. 환경 변수 설정: `.env.serverless` 파일 복사
3. 빌드: `pnpm --filter client build`
4. Netlify 배포: `netlify deploy --dir=client/dist --prod`

### 백엔드 배포 (서버)

1. 서버 빌드: `pnpm --filter server build`
2. 배포 패키지 생성:
   ```bash
   mkdir -p deploy
   cp -r server/dist deploy/
   cp server/package.json deploy/
   cp .env.serverless deploy/.env.production
   cd deploy && tar -czf ../server-deploy.tar.gz .
   ```
3. 서버에 파일 전송 및 배포:
   ```bash
   scp server-deploy.tar.gz username@your-server:/tmp/
   ssh username@your-server "mkdir -p ~/nottoday-server && cd ~/nottoday-server && tar -xzf /tmp/server-deploy.tar.gz -C . && npm install --production && pm2 restart nottoday-api || pm2 start dist/index.js --name nottoday-api"
   ```

### 데이터베이스 마이그레이션

```bash
# Windows
scripts\migrate.sh

# Linux/Mac
chmod +x scripts/migrate.sh
./scripts/migrate.sh
```

또는 직접 실행:

```bash
cd server && pnpm supabase db migrate
```

## Docker 배포

Docker를 사용하여 서버를 배포할 수도 있습니다:

```bash
# 이미지 빌드
docker build -t nottoday-server .

# 컨테이너 실행
docker run -p 8080:8080 -d nottoday-server
```

## 모니터링 및 로깅

서버에 PM2를 사용하여 프로세스를 모니터링하고 로그를 확인할 수 있습니다:

```bash
# 상태 확인
pm2 status nottoday-api

# 로그 확인
pm2 logs nottoday-api

# 프로세스 재시작
pm2 restart nottoday-api
```

## 문제 해결

- **배포 실패**: 워크플로우 로그와 서버 로그를 확인하여 오류를 파악합니다.
- **환경 변수 문제**: `.env.serverless` 파일과 GitHub Secrets 설정을 확인합니다.
- **데이터베이스 연결 오류**: Supabase 연결 정보가 올바르게 설정되었는지 확인합니다.
- **서버 접근 문제**: SSH 키와 권한이 올바르게 설정되었는지 확인합니다.
