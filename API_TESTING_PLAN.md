# NotToday API 테스팅 계획

## 테스트 범위

이 테스트 계획은 NotToday 애플리케이션의 다양한 API 엔드포인트를 검증하기 위한 체계적인 접근 방식을 설명합니다. 테스트는 다음 세 가지 주요 범주로 구성됩니다:

1. **단위 테스트**: 개별 함수 및 컴포넌트 테스트
2. **통합 테스트**: 상호 작용하는 구성 요소 테스트
3. **엔드 투 엔드 테스트**: 사용자 시나리오를 시뮬레이션하는 테스트

## 테스트 대상 API 엔드포인트

### 1. 건강 데이터 API

#### GET /api/health/data
- **설명**: 사용자의 건강 데이터 검색
- **테스트 사례**:
  - 유효한 userId와 period로 요청 시 정상 응답 확인
  - 유효하지 않은 userId로 요청 시 400 오류 응답 확인
  - 사용자 데이터가 없을 경우 404 응답 확인
  - 다양한 기간(daily, weekly, monthly) 필터링 테스트

#### GET /api/health/status
- **설명**: 사용자의 현재 건강 상태 검색
- **테스트 사례**:
  - 유효한 userId로 요청 시 위험도 평가 응답 확인
  - 위험도 계산 로직 검증 (심박수, 산소 포화도 기준)
  - 개인화된 위험 기준 적용 검증

#### POST /api/health/data
- **설명**: 새로운 건강 데이터 저장
- **테스트 사례**:
  - 유효한 건강 데이터 저장 성공 확인
  - 불완전한 데이터 제출 시 오류 응답 검증
  - ECG 데이터 포함 시 별도 저장 검증

### 2. AI 상담 API

#### POST /api/analysis/consultation
- **설명**: AI 상담 메시지 전송 및 응답 수신
- **테스트 사례**:
  - 유효한 메시지로 AI 응답 생성 테스트
  - 카테고리별 다른 모델 사용 검증 (medical vs. general)
  - 컨텍스트 유지 및 대화 기록 테스트
  - 오류 발생 시 적절한 폴백 응답 확인

#### GET /api/analysis/consultation/history/:userId
- **설명**: 사용자의 상담 내역 조회
- **테스트 사례**:
  - 유효한 userId로 상담 내역 검색 확인
  - 내역이 없을 경우 빈 배열 응답 확인
  - 응답 형식 및 카테고리 정보 검증

### 3. 분석 API

#### POST /api/ai_analysis
- **설명**: 건강 데이터 AI 분석 요청
- **테스트 사례**:
  - 유효한 건강 데이터로 위험도 분석 테스트
  - ECG 데이터 분석 결과 검증
  - API 키 만료 또는 외부 서비스 장애 시 오류 처리 확인

## 테스트 환경 설정

### 로컬 개발 환경

```bash
# 테스트 환경용 .env.test 설정
NODE_ENV=test
API_PREFIX=/api
HUGGINGFACE_TOKEN=test_token
DATABASE_URL=postgresql://test:test@localhost:5432/test_db
MOCK_EXTERNAL_API=true
```

### 모의 외부 API 구현

```javascript
// tests/mocks/huggingFace.js
export const mockTextGeneration = async (prompt) => {
  // 테스트 목적의 응답 생성
  return {
    generated_text: "이것은 테스트용 AI 응답입니다."
  };
};
```

## 테스트 케이스 구현

### 단위 테스트 예시

```javascript
// 건강 데이터 API 테스트
describe('Health API', () => {
  test('getUserRiskThresholds는 사용자 ID에 대한 임계값을 반환한다', async () => {
    const thresholds = await storage.getUserRiskThresholds('123');
    expect(thresholds).toHaveProperty('heartRateHigh');
    expect(thresholds).toHaveProperty('oxygenLevelLow');
  });
  
  test('saveHealthData는 유효한 데이터를 저장하고 ID를 반환한다', async () => {
    const result = await storage.saveHealthData('123', {
      heartRate: 75,
      oxygenLevel: 98
    });
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('timestamp');
  });
});
```

### 통합 테스트 예시

```javascript
describe('AI 상담 API 통합 테스트', () => {
  test('상담 메시지 처리 및 AI 응답 생성 흐름', async () => {
    // 1. 사용자 메시지 전송
    const userResponse = await request(app)
      .post('/api/analysis/consultation')
      .send({
        userId: '123',
        message: '심장 건강을 위한 운동은 무엇인가요?',
        category: 'health'
      });
    expect(userResponse.status).toBe(200);
    
    // 2. 상담 이력 확인
    const historyResponse = await request(app)
      .get('/api/analysis/consultation/history/123');
    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.messages).toHaveLength(2); // 사용자 메시지와 AI 응답
  });
});
```

## 성능 및 부하 테스트

### 부하 테스트 시나리오

- **동시 요청**: 초당 10, 50, 100건의 요청 처리 능력 테스트
- **지속적인 부하**: 5분 동안 지속적인 요청을 처리할 때의 시스템 안정성 테스트
- **회복 능력**: 갑작스러운 트래픽 급증 후 시스템 회복 능력 테스트

### 성능 지표

- **응답 시간**: 95% 이하의 요청은 500ms 이내에 응답
- **에러율**: 부하 상태에서도 99.9% 이상의 요청 성공 처리
- **리소스 사용량**: CPU, 메모리, 네트워크 대역폭 모니터링

## 보안 테스트

### API 취약점 테스트

- 인증 및 권한 부여 검증
- 입력 검증 및 처리 테스트 (주입 공격 방지)
- 속도 제한 및 API 키 보호 메커니즘 확인

### 개인 정보 보호 테스트

- 민감한 건강 데이터 암호화 확인
- API 응답에서 불필요한 정보 노출 방지
- 데이터 접근 로깅 및 감사 확인

## 자동화 테스트 파이프라인

### CI/CD 통합

```yaml
# .github/workflows/api-tests.yml
name: API Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm run test:unit
      - name: Run integration tests
        run: npm run test:integration
```

## 테스트 보고서

각 테스트 실행 후 다음 정보를 포함한 보고서를 생성합니다:

1. 테스트 성공/실패 요약
2. 코드 커버리지 분석
3. 기능별 테스트 결과
4. 발견된 문제 및 버그
5. 성능 메트릭

## 테스트 일정

| 단계 | 기간 | 완료 기준 |
|------|------|------------|
| 단위 테스트 작성 | 1주 | 모든 핵심 함수에 대한 테스트 케이스 구현 |
| 통합 테스트 작성 | 1주 | 주요 API 흐름에 대한 테스트 케이스 구현 |
| 엔드 투 엔드 테스트 작성 | 1주 | 핵심 사용자 시나리오 테스트 |
| 성능 및 부하 테스트 | 3일 | 목표 지표 달성 확인 |
| 보안 테스트 | 2일 | 모든 보안 체크리스트 항목 통과 |

## 담당자

- **API 개발 테스트**: [개발팀원 이름]
- **성능 테스트**: [성능 엔지니어 이름]
- **보안 테스트**: [보안 전문가 이름]
- **테스트 자동화**: [QA 엔지니어 이름] 