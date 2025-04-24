# 낫투데이(ONE MORE LIFE) 모바일 앱

이 프로젝트는 낫투데이(ONE MORE LIFE) 심장 건강 모니터링 앱의 모바일 버전입니다.

## 개발 환경 설정

### 준비 사항

- Node.js v16 이상
- npm 또는 yarn
- 안드로이드 스튜디오 (안드로이드 에뮬레이터 사용 시)
- XCode (iOS 시뮬레이터 사용 시, Mac OS 필요)
- Expo CLI

### 설치 방법

1. 의존성 패키지 설치:
```bash
cd mobile
npm install
```

2. 개발 서버 시작:
```bash
npm start
```

## 안드로이드 에뮬레이터 연동 방법

### 1. 안드로이드 스튜디오 설정

1. [안드로이드 스튜디오](https://developer.android.com/studio) 설치
2. 안드로이드 스튜디오 열기
3. 'Virtual Device Manager' 열기
4. 'Create Device' 버튼 클릭
5. 원하는 기기 선택 (예: Pixel 4)
6. 적절한 시스템 이미지 선택 (API 29 이상 권장)
7. 가상 기기 이름 설정 후 'Finish' 클릭

### 2. 에뮬레이터 실행

1. 안드로이드 스튜디오의 Device Manager에서 생성한 가상 기기 실행
2. 가상 기기가 완전히 부팅될 때까지 기다림

### 3. Expo Go 앱 설치

1. 에뮬레이터에서 Google Play Store 열기
2. 'Expo Go' 검색하여 설치
3. Expo Go 앱 설치 완료 확인

### 4. 프로젝트 실행 및 에뮬레이터 연결

루트 디렉토리에서 다음 스크립트 실행:
```bash
./start-android-emulator.sh
```

또는 mobile 폴더에서 직접 실행:
```bash
cd mobile
npm run android
```

### 주의사항

- 안드로이드 에뮬레이터에서는 localhost 대신 10.0.2.2 주소를 사용하여 호스트 머신에 접근합니다.
- API 서버가 실행 중이어야 모바일 앱에서 데이터를 가져올 수 있습니다.

## API 서버 연결

안드로이드 에뮬레이터에서 API 서버에 연결하기 위한 설정은 이미 구성되어 있습니다:

- 안드로이드 에뮬레이터: `http://10.0.2.2:5000/api`
- iOS 시뮬레이터: `http://localhost:5000/api`
- 웹: `/api` (상대 경로)

## 문제 해결

### 에뮬레이터 연결 실패

1. API 서버가 실행 중인지 확인
2. 방화벽 설정 확인
3. `src/lib/config.ts` 파일에서 API_BASE_URL 설정 확인
4. 에뮬레이터 재시작 시도

### 앱 빌드 또는 실행 오류

1. node_modules 폴더 삭제 후 재설치:
```bash
rm -rf node_modules
npm install
```

2. 캐시 삭제:
```bash
npm start -- --reset-cache
```

### 추가 도움말

더 자세한 정보는 [Expo 문서](https://docs.expo.dev/)를 참조하세요.