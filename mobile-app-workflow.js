const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Replit 환경에서 모바일 앱 실행을 위한 스크립트
console.log('🚀 HeartCare 모바일 앱 실행을 준비합니다...');

// 필요한 디렉토리 생성
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ 디렉토리 생성됨: ${dirPath}`);
  }
};

// mobile 폴더에서 파일 복사
const copyMobileFiles = () => {
  // 소스 및 대상 디렉토리
  const sourceDir = path.join(__dirname, 'mobile');
  const targetDir = path.join(__dirname, 'heart-care-mobile');
  
  // 대상 디렉토리 생성
  ensureDirectoryExists(targetDir);
  
  console.log('📂 모바일 앱 파일을 복사하는 중...');
  
  // App.tsx 파일 복사
  fs.copyFileSync(
    path.join(sourceDir, 'App.tsx'),
    path.join(targetDir, 'App.tsx')
  );
  
  // app.json 파일 복사
  fs.copyFileSync(
    path.join(sourceDir, 'app.json'),
    path.join(targetDir, 'app.json')
  );
  
  // package.json 파일 복사 및 수정
  const packageJson = JSON.parse(fs.readFileSync(path.join(sourceDir, 'package.json'), 'utf8'));
  
  // React 버전 호환성 수정
  packageJson.dependencies.react = "18.3.1"; // 기존 웹앱과 동일한 버전 사용
  
  fs.writeFileSync(
    path.join(targetDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  // screens 폴더 생성 및 파일 복사
  const sourceScreensDir = path.join(sourceDir, 'app', 'screens');
  const targetScreensDir = path.join(targetDir, 'app', 'screens');
  
  ensureDirectoryExists(targetScreensDir);
  
  // screens 디렉토리의 모든 파일 복사
  fs.readdirSync(sourceScreensDir).forEach(file => {
    const sourcePath = path.join(sourceScreensDir, file);
    const targetPath = path.join(targetScreensDir, file);
    
    if (fs.statSync(sourcePath).isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`✅ 파일 복사됨: ${file}`);
    }
  });
  
  // API 폴더 생성 및 파일 복사
  const sourceApiDir = path.join(sourceDir, 'app', 'api');
  const targetApiDir = path.join(targetDir, 'app', 'api');
  
  ensureDirectoryExists(targetApiDir);
  
  // API 디렉토리의 모든 파일 복사
  fs.readdirSync(sourceApiDir).forEach(file => {
    const sourcePath = path.join(sourceApiDir, file);
    const targetPath = path.join(targetApiDir, file);
    
    if (fs.statSync(sourcePath).isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`✅ 파일 복사됨: ${file}`);
    }
  });
  
  console.log('✅ 모든 파일이 성공적으로 복사되었습니다.');
};

// 앱 초기화 및 실행
const initAndRunApp = () => {
  console.log('📱 모바일 앱을 초기화하는 중...');
  
  // 현재 디렉토리 위치 저장
  const currentDir = process.cwd();
  
  // 앱 디렉토리로 이동
  process.chdir(path.join(__dirname, 'heart-care-mobile'));
  
  // 모듈 설치 및 앱 실행
  exec('npm install && npx expo start --web', (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ 오류 발생: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`⚠️ 경고: ${stderr}`);
    }
    console.log(stdout);
    
    // 원래 디렉토리로 복귀
    process.chdir(currentDir);
  });
};

// 실행
try {
  copyMobileFiles();
  initAndRunApp();
} catch (error) {
  console.error(`❌ 오류 발생: ${error.message}`);
}