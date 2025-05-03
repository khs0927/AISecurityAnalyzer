# NotToday API 목업 제거 및 실제 API 연동 설명서

## 개요

본 문서는 NotToday 프로젝트에서 목업 API를 제거하고 실제 API를 연동하기 위한 변경 사항을 설명합니다. 기존 시스템에서는 데모 목적으로 여러 목업 API와 더미 데이터를 사용하고 있었으며, 이번 업데이트를 통해 실제 API를 연동하고 환경 변수를 통한 안전한 API 키 관리를 구현했습니다.

## 주요 변경 사항

### 1. 환경 변수 설정

`.env` 파일을 통해 API 키 및 서버 구성을 관리하도록 변경했습니다. 다음과 같은 환경 변수가 추가되었습니다:

```
# API 키
HUGGINGFACE_TOKEN=your_huggingface_token_here
HF_TOKEN=your_hf_token_here

# 서버 설정
PORT=3000
NODE_ENV=development
...
```

### 2. HuggingFace API 통합

`aiModels.ts` 파일에서 HuggingFace API를 사용할 때 환경 변수에서 API 키를 가져오도록 수정했습니다. 토큰이 없는 경우 적절한 오류를 발생시키고 로깅하도록 구현했습니다.

```typescript
const hfToken = process.env.HUGGINGFACE_TOKEN || process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || process.env.HF_API_KEY;

if (!hfToken) {
  const errorMessage = 'HuggingFace API 토큰이 환경 변수에 설정되지 않았습니다. (HUGGINGFACE_TOKEN 또는 HF_TOKEN 필요)';
  monitoringInstance.log('critical', errorMessage, {}, 'system');
  throw new Error(errorMessage);
}
```

### 3. 스토리지 인터페이스 확장

목업 데이터 대신 실제 데이터베이스에서 데이터를 가져오기 위해 스토리지 인터페이스를 확장했습니다:

- `ExtendedStorage` 클래스는 `IExtendedStorage` 인터페이스를 구현하여 확장된 기능 제공
- 기간별 건강 데이터 조회, 사용자별 위험도 기준 조회, 건강 데이터 저장 기능 추가

### 4. 건강 데이터 API 업데이트

`health.ts` 라우트 파일에서 더미 데이터 대신 실제 데이터베이스에서 데이터를 가져오도록 수정했습니다:

- 더미 데이터 생성 함수 및 상수 제거
- 데이터베이스에서 사용자별 건강 데이터를 가져오는 로직 구현
- 사용자별 위험 기준 적용 로직 추가

### 5. AI 상담 API 개선

`consultation.ts` 라우트 파일에서 메모리 기반 상담 세션 대신 데이터베이스를 활용하도록 수정했습니다:

- 상담 세션 데이터를 데이터베이스에 저장 및 조회
- HuggingFace API를 활용한 실제 AI 모델 연동
- 카테고리에 따른 다양한 모델 선택 로직 구현

### 6. 모니터링 개선

`monitoringInstance`를 활용한 통합 모니터링 시스템을 구현했습니다:

- API 오류, 모델 성능, 사용자 활동 등 다양한 카테고리별 로깅
- 중앙화된 모니터링으로 시스템 상태 파악 용이
- 파일 및 콘솔 로깅 기능 통합

## 설치 및 실행 방법

1. 필요한 환경 변수 설정:
   `.env` 파일을 프로젝트 루트에 생성하고 필요한 환경 변수 설정

   ```
   HUGGINGFACE_TOKEN=your_actual_token_here
   PORT=3000
   NODE_ENV=development
   ...
   ```

2. 종속성 설치:
   ```
   pnpm install
   ```

3. 서버 실행:
   ```
   pnpm dev
   ```

## 주의 사항

1. **API 키 보안**: `.env` 파일은 버전 관리에 포함하지 않도록 주의하세요.
2. **환경 변수 확인**: 배포 전 모든 필요한 환경 변수가 설정되었는지 확인하세요.
3. **할당량 제한**: HuggingFace API는 요청 할당량이 있으므로 사용량을 모니터링하세요.

## 향후 개선 방향

1. **데이터베이스 통합**: 현재는 메모리 스토리지를 확장하여 사용하고 있으나, 향후 실제 데이터베이스(PostgreSQL, MongoDB 등)와 통합할 예정입니다.
2. **API 캐싱**: 반복적인 API 요청을 줄이기 위한 캐싱 메커니즘 구현이 필요합니다.
3. **에러 처리 강화**: API 요청 실패 시 재시도 메커니즘과 폴백 전략을 구현할 예정입니다.
4. **API 키 순환**: 보안 강화를 위한 API 키 순환 메커니즘 도입이 필요합니다.

## API 키 요구사항

프로젝트를 실행하기 위해 다음 API 키가 필요합니다:

1. **HuggingFace API 키**: AI 모델 호스팅 및 추론에 필요
   - 가입: https://huggingface.co/join
   - API 키 발급: https://huggingface.co/settings/tokens

## 지원 및 문의

문제가 발생하거나 추가 정보가 필요한 경우 개발팀에 문의하세요. 