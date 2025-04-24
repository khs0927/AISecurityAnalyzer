# 모니터링 시스템 모듈

이 폴더에는 ONE MORE LIFE 애플리케이션의 활력징후 모니터링 기능과 관련된 코드 파일들이 포함되어 있습니다.

## 폴더 구조

### 클라이언트 측 코드

- `client/src/pages/VitalSignsMonitoring.tsx`: 활력징후 모니터링 페이지 컴포넌트
- `client/src/components/layout/`: 앱 레이아웃 및 하단 내비게이션 컴포넌트
- `client/src/components/ModeSwitcher.tsx`: 모니터링 모드 전환 컴포넌트
- `client/src/lib/`: ECG 및 PPG 시뮬레이터, 위험도 계산기 등 유틸리티 라이브러리
- `client/src/components/ui/`: UI 컴포넌트 (버튼, 카드, 탭 등)
- `client/src/assets/`: 이미지 및 아이콘 파일

### 서버 측 코드

- `server/routes.ts`: API 엔드포인트 정의
- `server/storage.ts`: 데이터 저장소 인터페이스 및 구현
- `shared/schema.ts`: 데이터 모델 스키마 정의

## 주요 기능

1. 실시간 ECG/PPG 모니터링
2. 스마트워치 연결 및 데이터 동기화
3. 위험도 분석 및 알림
4. 활력징후 기록 저장 및 분석

## 구현 설명

모니터링 시스템은 웨어러블 기기(Apple Watch, Galaxy Watch)에서 ECG 및 PPG 데이터를 수집하여 실시간으로 표시하고, 이를 분석하여 사용자의 심장 건강 상태를 모니터링합니다. 또한 위험 징후가 감지되면 즉시 알림을 생성하고, 보호자 모드를 통해 원격으로 모니터링할 수 있는 기능을 제공합니다.