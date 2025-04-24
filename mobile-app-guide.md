# HeartCare 모바일 앱 가이드

## 소개

이 문서는 Replit 환경에서 HeartCare 모바일 앱을 실행하고 테스트하는 방법을 안내합니다. 현재 Replit 환경에서는 React 버전 충돌 문제로 인해 전체 기능을 갖춘 Expo 앱을 직접 실행하기 어려운 상황입니다. 이 가이드는 이러한 제약 조건 내에서 모바일 앱을 시연하는 방법을 설명합니다.

## 빠른 시작 방법

1. 터미널에서 다음 명령어를 실행하여 간단한 모바일 앱 웹 페이지를 시작합니다:

```bash
./start-simple-web.sh
```

2. 스크립트가 완료되면 제공된 URL을 통해 모바일 앱의 웹 버전에 접속할 수 있습니다.
   - 기본 URL: https://expo-mobile-app-4000.repl.co/fallback.html

## 전체 Expo 앱 실행 시도 (고급)

전체 Expo 환경을 시도해보고 싶다면 다음 명령어를 실행할 수 있습니다:

```bash
./start-expo-app.sh
```

> **참고**: 이 방법은 Replit 환경의 React 버전 충돌로 인해 오류가 발생할 수 있습니다. 실패할 경우 자동으로 간단한 웹 페이지로 전환됩니다.

## 주요 기능

HeartCare 모바일 앱은 다음과 같은 주요 기능을 제공합니다:

1. **심장 진단**: ECG/PPG 데이터 분석 및 건강 상태 모니터링
2. **응급 처치**: 상황별 응급 처치 가이드 제공
3. **비상 연락**: 보호자 관리 및 긴급 연락 기능
4. **AI 상담**: 건강 관련 질문에 대한 AI 상담 서비스

## 개발 환경 설정 (로컬 개발용)

로컬 개발 환경에서 전체 기능을 갖춘 Expo 앱을 실행하려면 다음 단계를 따르세요:

1. 로컬 컴퓨터에 프로젝트를 복제합니다.
2. Node.js 버전 18 이상을 설치합니다.
3. 프로젝트 루트 디렉토리에서 다음 명령어를 실행합니다:

```bash
cd expo-mobile-app
npm install --legacy-peer-deps
npx expo start
```

4. Expo Go 앱을 스마트폰에 설치하고 QR 코드를 스캔하여 앱을 실행합니다.

## 문제 해결

### 일반적인 오류

1. **모듈 찾을 수 없음 오류**:
   - 이는 Replit 환경의 React/React Native 버전 충돌 때문입니다.
   - 간단한 웹 페이지 버전을 사용하세요.

2. **웹 페이지가 로드되지 않음**:
   - URL이 올바른지 확인하세요.
   - 브라우저 캐시를 지우고 새로고침하세요.

## 추가 자료

- [Expo 공식 문서](https://docs.expo.dev/)
- [React Native 문서](https://reactnative.dev/docs/getting-started)

---

© 2025 HeartCare(낫투데이) | 버전 1.0.0