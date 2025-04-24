# NotToday 서버리스 배포 가이드

이 문서는 NotToday Medical-AI-Agent의 서버리스 환경 배포 방법을 안내합니다.

## 배포 아키텍처

NotToday는 다음과 같은 서비스를 이용해 최소 비용으로 배포됩니다:

1. **프론트엔드**: Netlify (무료 플랜)
2. **백엔드 API**: Oracle Cloud Free Tier (무료)
3. **데이터베이스**: Supabase (무료 플랜)
4. **실시간 통신**: Pusher (무료 플랜)

## 필요한 계정 및 설정

배포를 위해 다음 계정과 설정이 필요합니다:

### 1. Netlify
- 계정 생성: [https://www.netlify.com/](https://www.netlify.com/)
- 사이트 설정 및 배포
- Auth 토큰 및 사이트 ID를 GitHub Secrets에 저장

### 2. Oracle Cloud Free Tier
- 계정 생성: [https://www.oracle.com/cloud/free/](https://www.oracle.com/cloud/free/)
- Always Free 인스턴스 생성 (VM.Standard.E2.1.Micro)
- SSH 키 생성 및 GitHub Secrets에 저장
- 필요한 포트 개방 (8080)
- PM2 설치: `npm install -g pm2`

### 3. Supabase
- 계정 생성: [https://supabase.com/](https://supabase.com/)
- 프로젝트 생성
- 데이터베이스 스키마 생성
- URL 및 API 키 GitHub Secrets에 저장

### 4. Pusher
- 계정 생성: [https://pusher.com/](https://pusher.com/)
- 앱 생성
- App ID, 키, 시크릿, 클러스터 정보 GitHub Secrets에 저장

## GitHub Secrets 설정

다음 시크릿을 GitHub 저장소의 Settings > Secrets에 추가해야 합니다:

```
# Netlify
NETLIFY_AUTH_TOKEN
NETLIFY_SITE_ID

# Oracle Cloud
ORACLE_SSH_KEY
ORACLE_KNOWN_HOSTS
ORACLE_USERNAME
ORACLE_HOST

# Supabase
SUPABASE_URL
SUPABASE_SERVICE_KEY

# Pusher
PUSHER_APP_ID
PUSHER_KEY
PUSHER_SECRET
PUSHER_CLUSTER

# Expo (모바일 앱 푸시 알림)
EXPO_ACCESS_TOKEN
```

## 배포 과정

1. GitHub 저장소에 코드를 push하면 자동으로 배포 워크플로우가 실행됩니다.
2. 프론트엔드는 Netlify에 배포됩니다.
3. 백엔드는 Oracle Cloud 인스턴스로 전송되어 PM2로 실행됩니다.
4. 데이터베이스 마이그레이션이 Supabase에 적용됩니다.

## 환경 변수 설정

`.env.serverless` 파일에 모든 필요한 환경 변수가 정의되어 있습니다. 배포 시 이 파일이 `.env.production`으로 복사되어 사용됩니다.

## 비용 최적화

### 저비용 대안

Oracle Cloud Free Tier 리소스가 부족할 경우 다음과 같은 저비용 대안을 고려할 수 있습니다:

- **Hetzner Cloud**: 월 약 3.50 유로부터 시작하는 VPS (CX11)
- **DigitalOcean**: 월 $5부터 시작하는 Droplet
- **Vultr**: 월 $3.50부터 시작하는 클라우드 인스턴스

### AI 모델 최적화

더 많은 리소스 최적화를 위해:

1. 더 작은 모델 사용 (미니 버전)
2. 모델 양자화 (int8로 변환)
3. 필요한 경우에만 모델 로드

## 문제 해결

### 서버 모니터링

```bash
# 서버 상태 확인
pm2 status

# 로그 확인
pm2 logs nottoday-api

# 서버 재시작
pm2 restart nottoday-api
```

### 일반적인 문제

1. **Oracle Cloud 인스턴스 연결 불가**
   - 방화벽 설정 확인
   - SSH 키 권한 확인 (chmod 600)
   
2. **Netlify 배포 실패**
   - 빌드 로그 확인
   - 환경 변수 설정 확인
   
3. **Supabase 연결 실패**
   - API 키 만료 여부 확인
   - IP 제한 확인 