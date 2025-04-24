const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
};

const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  
  // 경로 처리
  let filePath;
  if (req.url === '/' || req.url === '/index.html') {
    filePath = './expo-mobile-app/assets/fallback.html';
  } else if (req.url === '/fallback.html') {
    filePath = './expo-mobile-app/assets/fallback.html';
  } else {
    filePath = './expo-mobile-app' + req.url;
  }
  
  console.log(`Serving file: ${filePath}`);

  // 파일 존재 확인
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`File not found: ${filePath}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    // 디렉토리인 경우 index.html 찾기
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'fallback.html');
    }

    // 파일 확장자에 따른 Content-Type 설정
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // 파일 읽기 및 응답
    fs.readFile(filePath, (err, data) => {
      if (err) {
        console.error(`Error reading file: ${err}`);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }

      // CORS 헤더 추가
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Access fallback app at: https://expo-mobile-app-${PORT}.replit.co/`);
});