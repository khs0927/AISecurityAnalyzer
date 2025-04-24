// 모바일 앱 실행 스크립트
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 HeartCare 모바일 앱을 실행하는 중...');

// 앱 디렉토리 설정
const appDir = path.join(__dirname, 'heart-care-expo');
console.log(`📁 앱 디렉토리: ${appDir}`);

// Replit 환경에서 권한 제약 우회를 위한 디렉토리 확인 및 생성
if (!fs.existsSync(appDir)) {
  console.log('📁 앱 디렉토리를 생성합니다...');
  fs.mkdirSync(appDir, { recursive: true });
}

// 필요한 서브 디렉토리 생성
['app/screens', 'app/api', 'assets'].forEach(dir => {
  const fullDir = path.join(appDir, dir);
  if (!fs.existsSync(fullDir)) {
    console.log(`📁 디렉토리 생성: ${fullDir}`);
    fs.mkdirSync(fullDir, { recursive: true });
  }
});

// 원본 파일 복사 (mobile -> heart-care-expo)
console.log('📋 모바일 앱 파일을 복사합니다...');

// 소스 디렉토리에서 파일 복사 함수
function copyFiles(sourceDir, targetDir, pattern = null) {
  if (!fs.existsSync(sourceDir)) {
    console.log(`⚠️ 소스 디렉토리가 없습니다: ${sourceDir}`);
    return;
  }
  
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  const files = fs.readdirSync(sourceDir);
  
  files.forEach(file => {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      copyFiles(sourcePath, targetPath);
    } else {
      if (pattern && !file.match(pattern)) return;
      
      try {
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`✅ 파일 복사 완료: ${targetPath}`);
      } catch (error) {
        console.error(`❌ 파일 복사 오류: ${sourcePath} -> ${targetPath}`, error);
      }
    }
  });
}

// 주요 파일들 복사
try {
  copyFiles(path.join(__dirname, 'mobile/app/screens'), path.join(appDir, 'app/screens'));
  copyFiles(path.join(__dirname, 'mobile/app/api'), path.join(appDir, 'app/api'));
  
  // App.tsx가 없다면 복사
  const originalAppFile = path.join(__dirname, 'mobile/App.tsx');
  const targetAppFile = path.join(appDir, 'App.tsx');
  if (fs.existsSync(originalAppFile) && !fs.existsSync(targetAppFile)) {
    fs.copyFileSync(originalAppFile, targetAppFile);
    console.log(`✅ 파일 복사 완료: ${targetAppFile}`);
  }
} catch (error) {
  console.error('❌ 파일 복사 중 오류 발생:', error);
}

// 기본 아이콘 생성 (없는 경우)
const iconPath = path.join(appDir, 'assets/icon.png');
const splashPath = path.join(appDir, 'assets/splash.png');
const faviconPath = path.join(appDir, 'assets/favicon.png');
const adaptiveIconPath = path.join(appDir, 'assets/adaptive-icon.png');

// 아이콘 파일이 없는 경우 복사
if (!fs.existsSync(iconPath) && fs.existsSync('generated-icon.png')) {
  ['icon.png', 'splash.png', 'favicon.png', 'adaptive-icon.png'].forEach(iconFile => {
    const targetPath = path.join(appDir, 'assets', iconFile);
    fs.copyFileSync('generated-icon.png', targetPath);
    console.log(`✅ 아이콘 생성 완료: ${targetPath}`);
  });
}

// 앱 실행 준비 완료
console.log('🏁 모바일 앱 준비가 완료되었습니다.');
console.log('📲 앱을 시작하기 위해 다음 명령어를 실행하세요:');
console.log('cd heart-care-expo && npm install && npx expo start --web');
console.log('');
console.log('💡 Replit 환경의 제약으로 인해 모바일 앱을 직접 실행하는 것은 제한될 수 있습니다.');
console.log('💡 로컬 환경에서 코드를 다운로드하여 실행하거나 Expo Snack으로 테스트하는 것을 권장합니다.');