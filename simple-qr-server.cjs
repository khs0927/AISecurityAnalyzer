/**
 * 심플 QR코드 생성 서버
 * Expo 앱 연결을 위한 QR 코드 생성 및 직접 연결 기능 제공
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

// 포트 설정
const PORT = 8090;

// Expo URL 설정
const EXPO_URL = 'exp://exp.host/@hsml/heart-care-expo?runtime-version=exposdk:50.0.0';

// HTML 템플릿 - QR 코드 페이지
const QR_HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HeartCare Expo QR 코드</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            text-align: center;
            background-color: #f9f9f9;
        }
        h1 { color: #FF6D94; margin-bottom: 25px; }
        .qr-container {
            margin: 20px auto;
            max-width: 300px;
            padding: 15px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        img { max-width: 100%; height: auto; }
        .url {
            margin: 15px 0;
            padding: 10px;
            background-color: #f5f5f5;
            border-radius: 5px;
            font-family: monospace;
            word-break: break-all;
        }
        .button {
            display: inline-block;
            margin: 10px;
            padding: 12px 20px;
            background-color: #FF6D94;
            color: white;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
        }
        .warning {
            margin-top: 20px;
            padding: 10px;
            background-color: #fff8e1;
            border-radius: 5px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <h1>HeartCare Expo QR 코드</h1>
    
    <div class="qr-container">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={{EXPO_URL_ENCODED}}" alt="Expo QR Code">
    </div>
    
    <p>Expo Go 앱에서 이 QR 코드를 스캔하거나 아래 URL을 직접 입력하세요:</p>
    
    <div class="url">{{EXPO_URL}}</div>
    
    <div>
        <a href="{{EXPO_URL}}" class="button">직접 열기</a>
        <a href="/" class="button" style="background-color: #4630EB;">홈으로</a>
    </div>
    
    <div class="warning">
        <p><strong>참고:</strong> QR 코드를 스캔하려면 Expo Go 앱이 설치되어 있어야 합니다.</p>
        <p>App Store 또는 Google Play 스토어에서 "Expo Go"를 검색하여 설치하세요.</p>
    </div>

    <script>
        // 페이지 로드 시 자동으로 Expo 앱 열기 시도 (iOS 기기에서만)
        window.onload = function() {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (isIOS) {
                setTimeout(function() {
                    window.location.href = "{{EXPO_URL}}";
                }, 3000);
            }
        }
    </script>
</body>
</html>
`;

// HTTP 서버 생성 및 요청 처리
const server = http.createServer((req, res) => {
    // URL 파싱
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // 루트 경로 처리
    if (pathname === '/' || pathname === '') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(QR_HTML_TEMPLATE
            .replace(/{{EXPO_URL}}/g, EXPO_URL)
            .replace(/{{EXPO_URL_ENCODED}}/g, encodeURIComponent(EXPO_URL))
        );
        return;
    }

    // 직접 열기 링크
    if (pathname === '/direct') {
        res.writeHead(302, { 'Location': EXPO_URL });
        res.end();
        return;
    }

    // 404 에러
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

// 서버 시작
server.listen(PORT, '0.0.0.0', () => {
    console.log(`QR 코드 서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`QR 코드 보기: http://localhost:${PORT}/`);
});