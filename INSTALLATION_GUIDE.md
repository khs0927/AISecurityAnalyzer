# 보안 분석 기능 설치 가이드

## 필요 패키지 설치

아래 명령어를 통해 필요한 패키지들을 설치합니다:

```bash
npm install @react-native-async-storage/async-storage
npm install @react-navigation/stack
npm install react-native-gesture-handler
```

## Hugging Face API 토큰 발급 방법

1. [Hugging Face 웹사이트](https://huggingface.co/)에 접속하여 계정을 생성하거나 로그인합니다.
2. 프로필 아이콘을 클릭하고 "Settings" 메뉴로 이동합니다.
3. 왼쪽 메뉴에서 "Access Tokens"을 선택합니다.
4. "New token" 버튼을 클릭합니다.
5. 토큰 이름을 입력하고 권한 수준을 선택합니다. 보안 분석을 위해서는 최소한 "Read" 권한이 필요합니다.
6. "Generate token" 버튼을 클릭합니다.
7. 생성된 토큰을 안전한 곳에 복사해 두세요. 이 토큰은 애플리케이션에서 Hugging Face API에 접근할 때 사용됩니다.

## .env 파일 설정

프로젝트 루트 디렉토리에 있는 `.env` 파일에 Hugging Face 토큰을 추가합니다:

```
HF_TOKEN=your_huggingface_token_here
```

## 애플리케이션 사용 방법

1. 애플리케이션의 하단 탭에서 "보안분석" 탭을 선택합니다.
2. 처음 실행 시 Hugging Face API 토큰 설정이 필요합니다. "토큰 설정하기" 버튼을 클릭하여 토큰을 입력합니다.
3. 토큰을 입력하고 저장한 후, 분석할 텍스트를 입력하고 "보안 분석하기" 버튼을 클릭합니다.
4. 분석 결과는 화면 하단에 표시됩니다.

## 주의사항

- Hugging Face API 호출은 인터넷 연결이 필요합니다.
- API 토큰은 기기의 안전한 저장소에 저장되며, 외부로 전송되지 않습니다.
- 일부 대용량 모델 사용 시 API 사용량에 따라 Hugging Face에서 요금이 부과될 수 있습니다. 