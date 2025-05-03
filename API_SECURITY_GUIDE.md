# NotToday API 보안 가이드

## API 키 관리 방법

API 키는 인증과 권한 부여에 사용되는 중요한 보안 자산입니다. 다음 가이드라인을 따라 API 키를 안전하게 관리하세요.

### 1. 환경 변수 사용

- 절대 소스 코드에 API 키를 하드코딩하지 마세요.
- API 키는 항상 환경 변수로 관리하세요.
- `.env` 파일을 사용하여 로컬 개발 환경에서 환경 변수를 설정하세요.
- `.env` 파일은 절대 버전 관리 시스템에 커밋하지 마세요.

```javascript
// ❌ 잘못된 방법 - 하드코딩
const apiKey = "1234567890abcdef";

// ✅ 올바른 방법 - 환경 변수 사용
const apiKey = process.env.API_KEY;
```

### 2. API 키 교체 및 순환

- 정기적으로 API 키를 교체하여 키 노출로 인한 위험을 최소화하세요.
- 가능하면 90일마다 API 키를 교체하는 것이 좋습니다.
- 다음 용도별로 별도의 API 키를 사용하세요:
  - 개발 환경
  - 테스트 환경
  - 스테이징 환경
  - 프로덕션 환경

### 3. 최소 권한 원칙

- API 키에는 필요한 최소한의 권한만 부여하세요.
- 다양한 기능에 대해 여러 API 키를 사용하는 것이 좋습니다.
- 읽기 전용 작업과 쓰기 작업에 별도의 키를 사용하세요.

### 4. 보안 인시던트 대응

API 키가 노출되면:

1. 즉시 노출된 API 키를 비활성화하세요.
2. 새 API 키를 생성하고 애플리케이션에 적용하세요.
3. 보안 침해 범위를 확인하세요.
4. 필요한 경우 보안 문제를 해결하세요.
5. 사고를 문서화하고 향후 유사한 문제를 방지하기 위한 조치를 취하세요.

## 프로젝트에서 사용되는 API 키

### HuggingFace API

- **용도**: AI 모델 호스팅 및 추론
- **환경 변수**:
  - `HUGGINGFACE_TOKEN` 또는 `HF_TOKEN`
- **교체 주기**: 90일
- **보안 레벨**: 높음 (모델 액세스 및 API 호출 권한)

### OpenAI API

- **용도**: AI 모델 추론 (ChatGPT, GPT-4 등)
- **환경 변수**:
  - `OPENAI_API_KEY`
  - `OPENAI_ORGANIZATION` (선택사항)
- **교체 주기**: 90일
- **보안 레벨**: 높음 (모델 액세스 및 API 호출 권한)

### 데이터베이스 자격 증명

- **용도**: 데이터베이스 연결 및 액세스
- **환경 변수**:
  - `DATABASE_URL`
  - `PGDATABASE`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`
- **교체 주기**: 180일
- **보안 레벨**: 매우 높음 (데이터베이스 접근 권한)

## API 키 저장 위치

1. **로컬 개발 환경**: `.env` 파일에 저장 (gitignore에 등록되어 있음)
2. **CI/CD 파이프라인**: 파이프라인의 암호화된 환경 변수로 저장
3. **프로덕션 환경**: 클라우드 서비스의 안전한 환경 변수 저장소 사용
   - Vercel, Netlify: 환경 변수 설정
   - AWS: AWS Secrets Manager 또는 Parameter Store
   - Azure: Key Vault
   - GCP: Secret Manager

## 안전한 API 호출

1. 서버 측에서만 API 호출을 수행하세요.
2. API 키를 클라이언트 측 코드에 노출하지 마세요.
3. 필요한 경우 프록시 서버를 사용하여 클라이언트 요청을 API로 전달하세요.
4. 요청 속도 제한을 구현하여 API 키 남용을 방지하세요.
5. API 호출을 모니터링하고 비정상적인 패턴을 감지하세요.

## 환경 설정 예시

```bash
# NotToday 환경 변수 설정

# API 키 (실제 값으로 대체)
HUGGINGFACE_TOKEN=your_huggingface_token_here
HF_TOKEN=your_huggingface_token_here

# 서버 설정
PORT=3000
NODE_ENV=development
DEBUG=true
API_PREFIX=/api

# 데이터베이스 설정
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
```

이 가이드를 따르면 API 키를 보다 안전하게 관리하고 보안 위험을 최소화할 수 있습니다. 