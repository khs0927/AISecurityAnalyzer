/**
 * 간단한 모바일 연결 서버
 * Expo 앱과 모바일 기기를 연결하기 위한 간단한 웹서버
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// 포트 설정
const PORT = 8080;

// Expo URL 설정
const EXPO_URL = 'exp://exp.host/@hsml/heart-care-expo?runtime-version=exposdk:50.0.0';
// 대체 URL (https 버전)
const EXPO_SECURE_URL = 'exps://exp.host/@hsml/heart-care-expo?runtime-version=exposdk:50.0.0';
// 개발 URL
const EXPO_DEV_URL = 'exp://192.168.0.100:19000';

// HTML 템플릿 - 인덱스 페이지
const INDEX_HTML = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HeartCare 모바일 연결</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        h1, h2 { color: #FF6D94; }
        .card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .button {
            display: block;
            width: 100%;
            padding: 15px;
            margin: 10px 0;
            background-color: #FF6D94;
            color: white;
            text-align: center;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            transition: background-color 0.2s;
        }
        .button:hover {
            background-color: #ff5c88;
        }
        .button.secondary {
            background-color: #4630EB;
        }
        .button.secondary:hover {
            background-color: #3520d9;
        }
        .note {
            background-color: #fff8e1;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            font-size: 14px;
            border-left: 4px solid #ffc107;
        }
        .method {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
    </style>
</head>
<body>
    <h1>HeartCare 모바일 연결</h1>
    
    <div class="card">
        <h2>직접 연결 방법</h2>
        <p>아래 버튼을 클릭하여 Expo Go 앱에서 HeartCare를 직접 실행하세요:</p>
        
        <a href="${EXPO_URL}" class="button">Expo Go로 바로 열기</a>
        <a href="${EXPO_SECURE_URL}" class="button secondary">보안 연결로 열기 (HTTPS)</a>
        
        <div class="note">
            <strong>참고:</strong> 위 버튼이 작동하지 않으면, Expo Go 앱을 열고 아래 URL을 직접 입력하세요:
            <pre style="margin:10px 0;padding:10px;background:#f5f5f5;border-radius:5px;overflow-x:auto;">
exp://exp.host/@hsml/heart-care-expo?runtime-version=exposdk:50.0.0</pre>
        </div>
    </div>
    
    <div class="card">
        <h2>QR 코드로 연결</h2>
        <p>Expo Go 앱을 열고 아래 QR 코드를 스캔하세요:</p>
        
        <div style="text-align:center;margin:20px 0;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(EXPO_URL)}" 
                 alt="Expo QR Code" style="max-width:200px;border:1px solid #ddd;border-radius:8px;">
        </div>
        
        <a href="/qr" class="button secondary">더 큰 QR 코드 보기</a>
    </div>
    
    <div class="card">
        <h2>연결 문제 해결</h2>
        <p>연결이 안되는 경우 다음 방법을 시도해보세요:</p>
        <ul>
            <li>Expo Go 앱이 최신 버전인지 확인하세요</li>
            <li>다른 네트워크(모바일 데이터 등)로 시도해보세요</li>
            <li>Safari 대신 Chrome 브라우저를 사용해보세요</li>
            <li>iPhone에서는 설정 앱에서 Safari 설정을 확인하세요</li>
            <li>앱을 닫고 다시 시도해보세요</li>
        </ul>
        
        <div class="method">
            <h3>대체 연결 방법</h3>
            <a href="/expo-final-connect.html" class="button">향상된 연결 페이지 열기</a>
            <a href="/expo-direct.html" class="button secondary">직접 URL 열기</a>
            <a href="/expo-scheme.html" class="button">Expo 스킴 사용하기</a>
        </div>
    </div>
    
    <script>
        // iOS 디바이스에서 자동 연결 시도
        window.onload = function() {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (isIOS) {
                setTimeout(function() {
                    window.location.href = "${EXPO_URL}";
                }, 2500);
            }
        }
    </script>
</body>
</html>
`;

// HTML 템플릿 - QR 코드 페이지
const QR_HTML = `
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
            padding: 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        img { max-width: 100%; height: auto; }
        .url {
            margin: 15px 0;
            padding: 10px;
            background-color: #f5f5f5;
            border-radius: 8px;
            font-family: monospace;
            font-size: 14px;
            word-break: break-all;
        }
        .button {
            display: inline-block;
            margin: 10px;
            padding: 12px 25px;
            background-color: #FF6D94;
            color: white;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
        }
        .warning {
            margin-top: 20px;
            padding: 15px;
            background-color: #fff8e1;
            border-radius: 8px;
            font-size: 14px;
            border-left: 4px solid #ffc107;
        }
    </style>
</head>
<body>
    <h1>HeartCare Expo QR 코드</h1>
    
    <div class="qr-container">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(EXPO_URL)}" 
             alt="Expo QR Code">
    </div>
    
    <p>Expo Go 앱에서 이 QR 코드를 스캔하거나 아래 URL을 직접 입력하세요:</p>
    
    <div class="url">${EXPO_URL}</div>
    
    <div>
        <a href="${EXPO_URL}" class="button">직접 열기</a>
        <a href="/" class="button" style="background-color: #4630EB;">홈으로</a>
    </div>
    
    <div class="warning">
        <p><strong>참고:</strong> QR 코드를 스캔하려면 Expo Go 앱이 설치되어 있어야 합니다.</p>
        <p>App Store 또는 Google Play 스토어에서 "Expo Go"를 검색하여 설치하세요.</p>
    </div>
</body>
</html>
`;

// HTTP 서버 생성 및 요청 처리
const server = http.createServer((req, res) => {
    // URL 파싱
    const url = req.url || '/';
    
    // 정적 파일 제공 (static 폴더 내 파일들)
    if (url.startsWith('/static/')) {
        const filePath = path.join(__dirname, url);
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('File not found');
                return;
            }
            
            // Content-Type 결정
            const ext = path.extname(filePath);
            let contentType = 'text/plain';
            
            switch (ext) {
                case '.html': contentType = 'text/html'; break;
                case '.css': contentType = 'text/css'; break;
                case '.js': contentType = 'text/javascript'; break;
                case '.json': contentType = 'application/json'; break;
                case '.png': contentType = 'image/png'; break;
                case '.jpg': contentType = 'image/jpeg'; break;
                case '.gif': contentType = 'image/gif'; break;
            }
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
        return;
    }
    
    // 루트 경로 처리
    if (url === '/' || url === '') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(INDEX_HTML);
        return;
    }
    
    // QR 코드 페이지
    if (url === '/qr') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(QR_HTML);
        return;
    }
    
    // 직접 연결 경로
    if (url === '/direct') {
        res.writeHead(302, { 'Location': EXPO_URL });
        res.end();
        return;
    }
    
    // 보안 연결 경로 (HTTPS)
    if (url === '/secure') {
        res.writeHead(302, { 'Location': EXPO_SECURE_URL });
        res.end();
        return;
    }
    
    // 개발 서버 연결
    if (url === '/dev') {
        res.writeHead(302, { 'Location': EXPO_DEV_URL });
        res.end();
        return;
    }
    
    // 정적 HTML 파일 처리
    if (url.endsWith('.html')) {
        const filePath = path.join(__dirname, 'static', url);
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('File not found');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(data);
        });
        return;
    }
    
    // 404 에러
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

// 서버 시작
server.listen(PORT, '0.0.0.0', () => {
    console.log(`모바일 연결 서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`서버 URL: http://localhost:${PORT}/`);
});