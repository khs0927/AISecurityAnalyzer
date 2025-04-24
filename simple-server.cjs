/**
 * 심플 HTTP 서버 (포트 4000)
 * 정적 파일 제공 및 QR 코드 페이지 호스팅
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// 미디어 타입 매핑
const contentTypeMap = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// 정적 파일 서비스 디렉토리
const staticDir = path.join(__dirname, 'static');

// HTTP 서버 생성
const server = http.createServer((req, res) => {
  // URL 파싱
  let url = req.url;
  
  // 루트 경로를 index.html으로 리디렉션
  if (url === '/' || url === '') {
    url = '/index.html';
  }
  
  // 파일 경로 생성
  const filePath = path.join(staticDir, url);
  const extname = path.extname(filePath).toLowerCase();
  
  // 컨텐츠 타입 결정
  const contentType = contentTypeMap[extname] || 'text/plain';
  
  // 파일 읽기 시도
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // 에러 처리 (주로 404)
      res.writeHead(404);
      res.end('File not found or error occurred');
      console.error(`Error serving ${url}: ${err.message}`);
      return;
    }
    
    // 성공적인 응답
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
    console.log(`Served ${url} (${contentType})`);
  });
});

// 서버 시작
const PORT = 4000;
server.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`다음 URL로 접속하세요: https://hr-tmntt-${PORT}.repl.co/`);
});