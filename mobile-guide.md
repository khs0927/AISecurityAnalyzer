# HeartCare 모바일 앱 실행 가이드

## 개요

이 가이드는 Replit 환경에서 HeartCare 모바일 앱을 실행하기 위한 단계별 지침을 제공합니다. Replit 환경의 제약 사항으로 인해 모바일 앱을 직접 실행하는 것에는 몇 가지 제한이 있지만, 다음과 같은 방법으로 앱을 테스트할 수 있습니다.

## 옵션 1: 로컬 환경에서 실행

HeartCare 모바일 앱을 가장 최적으로 테스트하는 방법은 로컬 개발 환경에서 코드를 실행하는 것입니다.

1. Replit 프로젝트를 ZIP 파일로 다운로드합니다.
2. 로컬 컴퓨터에서 압축을 풀고 `heart-care-expo` 디렉토리로 이동합니다.
3. 다음 명령어를 실행합니다:
   ```bash
   npm install
   npx expo start
   ```
4. 실행 후 QR 코드를 스캔하여 실제 모바일 기기에서 테스트하거나, 에뮬레이터에서 실행할 수 있습니다.

## 옵션 2: Expo Snack에서 테스트

Expo Snack은 웹 기반 개발 환경으로, 브라우저에서 직접 React Native 앱을 개발하고 테스트할 수 있습니다.

1. [Expo Snack](https://snack.expo.dev/)에 접속합니다.
2. 프로젝트의 주요 파일들을 Snack에 복사합니다:
   - App.tsx
   - app/screens/* 디렉토리의 모든 파일
   - app/api/* 디렉토리의 모든 파일
3. Snack에서 필요한 패키지를 추가합니다:
   - @react-navigation/native
   - @react-navigation/stack
   - @react-navigation/bottom-tabs
   - expo-location
   - react-native-maps
   - axios
   - 기타 필요한 패키지들
4. 미리보기 창에서 앱을 테스트합니다.

## 옵션 3: Replit 환경에서 준비된 파일 사용

`heart-care-expo` 디렉토리에 모든 필요한 파일이 이미 준비되어 있습니다. 다음 단계를 통해 Replit에서 최대한 테스트해 볼 수 있습니다:

1. Replit Shell에서 다음 명령어를 실행합니다:
   ```bash
   node start-mobile-app.js
   ```
2. 이 스크립트는 필요한 모든 파일을 `heart-care-expo` 디렉토리에 복사합니다.
3. 다음 명령어로 앱을 실행해 볼 수 있습니다:
   ```bash
   cd heart-care-expo
   npm install
   npx expo start --web
   ```

## 프로젝트 구조

모바일 앱은 다음과 같은 구조로 구성되어 있습니다:

```
heart-care-expo/
├── App.tsx               # 앱의 메인 진입점
├── app/
│   ├── screens/          # 화면 컴포넌트
│   │   ├── HomeScreen.tsx
│   │   ├── HeartDiagnosisScreen.tsx
│   │   ├── EmergencyGuideScreen.tsx
│   │   ├── EmergencyGuideDetailScreen.tsx
│   │   ├── EmergencyContactsScreen.tsx
│   │   └── AiConsultationScreen.tsx
│   ├── api/              # API 연동 모듈
│   │   ├── client.js
│   │   ├── healthApi.js
│   │   ├── contactsApi.js
│   │   └── aiConsultationApi.js
├── assets/               # 이미지, 아이콘 등 리소스
├── app.json              # Expo 설정
├── babel.config.js       # Babel 설정
└── package.json          # 의존성 정보
```

## 알려진 문제점

1. **파일 시스템 권한**: Replit 환경에서는 일부 디렉토리에 쓰기 권한이 제한되어 있습니다. 이 문제를 해결하기 위해 `heart-care-expo` 디렉토리를 생성하고 필요한 파일을 복사하여 사용합니다.

2. **React와 React Native 버전 충돌**: 웹 애플리케이션(React 18.3.1)과 모바일 앱(React Native/Expo)에서 요구하는 React 버전이 다릅니다. `heart-care-expo` 디렉토리에는 Expo와 호환되는 React 18.2.0 버전으로 설정하였습니다.

3. **Replit 환경의 한계**: Replit에서는 모바일 에뮬레이터를 직접 실행할 수 없으며, `expo start --web` 명령어로 웹 버전만 실행 가능합니다. 또한 `metro` 번들러와 관련된 문제가 발생할 수 있습니다.

## 추가 리소스

- [Expo 문서](https://docs.expo.dev/)
- [React Native 문서](https://reactnative.dev/docs/getting-started)
- [Expo Snack](https://snack.expo.dev/)