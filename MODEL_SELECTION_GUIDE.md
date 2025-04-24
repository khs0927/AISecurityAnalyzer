# Hugging Face 보안 분석 모델 선택 가이드

보안 분석에 사용할 수 있는 Hugging Face 모델을 선택하는 가이드입니다. 현재 서비스에서는 다음과 같은 종류의 보안 위협을 탐지할 수 있습니다:

1. 개인정보 노출 (PII: Personally Identifiable Information)
2. 악성코드 탐지
3. 피싱 시도 탐지

## 추천 모델 목록

### 1. 개인정보 노출 탐지 모델

- **[korea-university-ml/roberta-base-pii-detection](https://huggingface.co/korea-university-ml/roberta-base-pii-detection)**
  - 한국어 텍스트에서 개인정보 노출 탐지
  - 이름, 주민등록번호, 전화번호, 주소 등 탐지 가능

- **[d4data/pii-detection-hf](https://huggingface.co/d4data/pii-detection-hf)**
  - 영어 텍스트에서 개인정보 노출 탐지
  - 이메일, 신용카드 번호, IP 주소 등 다양한 개인정보 유형 지원

### 2. 악성코드 탐지 모델

- **[blackthorne/malware-detection-transformer](https://huggingface.co/blackthorne/malware-detection-transformer)**
  - 텍스트 기반 악성코드 패턴 탐지
  - 자바스크립트, PowerShell 등 스크립트 기반 악성코드 탐지에 효과적

- **[ivancheban/malware-classification](https://huggingface.co/ivancheban/malware-classification)**
  - 다양한 유형의 악성코드 분류 모델
  - 트로이목마, 랜섬웨어, 스파이웨어 등 다양한 유형 분류 가능

### 3. 피싱 탐지 모델

- **[mr-am/phishing-url-bert](https://huggingface.co/mr-am/phishing-url-bert)**
  - URL 기반 피싱 사이트 탐지
  - 정확도 95% 이상의 고성능 모델

- **[deepset/bert-large-uncased-whole-word-masking-squad2-phishing](https://huggingface.co/deepset/bert-large-uncased-whole-word-masking-squad2-phishing)**
  - 이메일 및 웹페이지 텍스트 기반 피싱 탐지
  - 다양한 피싱 유형 및 패턴 탐지 가능

## 모델 선택 시 고려사항

### 1. 언어 지원
- 한국어 텍스트 분석이 필요한 경우 한국어를 지원하는 모델 선택
- 다국어 모델의 경우 지원 언어 확인

### 2. 응답 시간
- 모바일 환경에서는 경량 모델 선호
- 응답 시간이 중요한 경우 DistilBERT, MobileBERT 등의 경량 모델 고려

### 3. 정확도
- 높은 정확도가 필요한 경우 대형 모델 고려 (예: BERT-Large, RoBERTa-Large)
- 일반적으로 모델 크기와 정확도는 비례하나 응답 시간과는 반비례

### 4. API 사용량
- 무료 API 사용량 제한 확인
- 유료 플랜 필요 여부 검토

## 모델 사용법

선택한 모델을 사용하기 위해 `securityService.ts` 파일에서 API 호출 URL을 수정합니다:

```typescript
// 예시: 개인정보 노출 탐지 모델 사용
const apiUrl = 'https://api-inference.huggingface.co/models/korea-university-ml/roberta-base-pii-detection';

// 예시: 악성코드 탐지 모델 사용
const apiUrl = 'https://api-inference.huggingface.co/models/blackthorne/malware-detection-transformer';

// 예시: 피싱 탐지 모델 사용
const apiUrl = 'https://api-inference.huggingface.co/models/mr-am/phishing-url-bert';
```

여러 모델을 동시에 사용하려면 여러 API 호출을 병렬로 처리하고 결과를 통합하는 방식으로 구현할 수 있습니다. 