// 모바일 앱 설정 스크립트
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectDir = path.join(__dirname, 'expo-mobile-app');

// 디렉토리가 없으면 생성
if (!fs.existsSync(projectDir)) {
  console.log(`📁 프로젝트 디렉토리 생성: ${projectDir}`);
  fs.mkdirSync(projectDir, { recursive: true });
}

// 이미 package.json이 있는지 확인
const packageJsonPath = path.join(projectDir, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  // package.json 생성
  const packageJson = {
    name: "heart-care-mobile",
    version: "1.0.0",
    main: "node_modules/expo/AppEntry.js",
    scripts: {
      start: "expo start",
      android: "expo start --android",
      ios: "expo start --ios",
      web: "expo start --web"
    },
    dependencies: {
      "expo": "~50.0.6",
      "expo-status-bar": "~1.11.1",
      "react": "18.2.0",
      "react-native": "0.73.4",
      "react-native-web": "~0.19.6",
      "react-dom": "18.2.0",
      "@expo/webpack-config": "~19.0.1",
      "expo-location": "~16.5.2",
      "react-native-maps": "1.8.0",
      "expo-font": "~11.10.2",
      "react-native-safe-area-context": "4.8.2",
      "react-native-gesture-handler": "~2.14.0",
      "react-native-reanimated": "~3.6.2",
      "@react-navigation/native": "^6.1.9",
      "@react-navigation/stack": "^6.3.20",
      "@react-navigation/bottom-tabs": "^6.5.11",
      "react-native-svg": "14.1.0",
      "react-native-chart-kit": "^6.12.0",
      "axios": "^1.6.7",
      "@expo/vector-icons": "^14.0.0"
    },
    devDependencies: {
      "@babel/core": "^7.20.0",
      "@types/react": "~18.2.45",
      "typescript": "^5.3.0"
    },
    private: true
  };

  console.log('📝 package.json 생성 중...');
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

// App.js 복사 또는 생성
const sourceAppJs = path.join(__dirname, 'heart-care-expo/App.js');
const targetAppJs = path.join(projectDir, 'App.js');

if (fs.existsSync(sourceAppJs) && !fs.existsSync(targetAppJs)) {
  console.log('📋 App.js 복사 중...');
  fs.copyFileSync(sourceAppJs, targetAppJs);
} else if (!fs.existsSync(targetAppJs)) {
  // 기본 App.js 생성
  const appJsContent = `import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>HeartCare 모바일 앱</Text>
      <Text style={styles.subtitle}>로딩 중...</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF6D94',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
  },
});`;

  console.log('📝 기본 App.js 생성 중...');
  fs.writeFileSync(targetAppJs, appJsContent);
}

// 그 외 필요한 설정 파일 생성
const appJsonPath = path.join(projectDir, 'app.json');
if (!fs.existsSync(appJsonPath)) {
  const appJson = {
    expo: {
      name: "HeartCare Mobile",
      slug: "heart-care-mobile",
      version: "1.0.0",
      orientation: "portrait",
      icon: "./assets/icon.png",
      userInterfaceStyle: "light",
      splash: {
        image: "./assets/splash.png",
        resizeMode: "contain",
        backgroundColor: "#FF6D94"
      },
      assetBundlePatterns: [
        "**/*"
      ],
      ios: {
        supportsTablet: true
      },
      android: {
        adaptiveIcon: {
          foregroundImage: "./assets/adaptive-icon.png",
          backgroundColor: "#FF6D94"
        }
      },
      web: {
        favicon: "./assets/favicon.png"
      }
    }
  };

  console.log('📝 app.json 생성 중...');
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
}

// babel.config.js 생성
const babelConfigPath = path.join(projectDir, 'babel.config.js');
if (!fs.existsSync(babelConfigPath)) {
  const babelConfig = `module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
    ],
  };
};`;

  console.log('📝 babel.config.js 생성 중...');
  fs.writeFileSync(babelConfigPath, babelConfig);
}

// Assets 디렉토리 생성
const assetsDir = path.join(projectDir, 'assets');
if (!fs.existsSync(assetsDir)) {
  console.log('📁 assets 디렉토리 생성...');
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 사용자 앱 디렉토리 구조 생성
const appDirs = [
  'app/screens',
  'app/api',
  'app/components',
  'app/navigation',
  'app/constants',
  'app/hooks'
];

for (const dir of appDirs) {
  const fullDir = path.join(projectDir, dir);
  if (!fs.existsSync(fullDir)) {
    console.log(`📁 ${dir} 디렉토리 생성...`);
    fs.mkdirSync(fullDir, { recursive: true });
  }
}

// 심장 케어 앱 소스코드 복사
const sourceScreensDir = path.join(__dirname, 'heart-care-expo/app/screens');
const targetScreensDir = path.join(projectDir, 'app/screens');

if (fs.existsSync(sourceScreensDir)) {
  console.log('📋 화면 컴포넌트 복사 중...');
  const screenFiles = fs.readdirSync(sourceScreensDir);
  for (const file of screenFiles) {
    const sourcePath = path.join(sourceScreensDir, file);
    const targetPath = path.join(targetScreensDir, file);
    if (fs.statSync(sourcePath).isFile() && !fs.existsSync(targetPath)) {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`  - ${file} 복사 완료`);
    }
  }
}

// API 파일 복사
const sourceApiDir = path.join(__dirname, 'heart-care-expo/app/api');
const targetApiDir = path.join(projectDir, 'app/api');

if (fs.existsSync(sourceApiDir)) {
  console.log('📋 API 모듈 복사 중...');
  const apiFiles = fs.readdirSync(sourceApiDir);
  for (const file of apiFiles) {
    const sourcePath = path.join(sourceApiDir, file);
    const targetPath = path.join(targetApiDir, file);
    if (fs.statSync(sourcePath).isFile() && !fs.existsSync(targetPath)) {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`  - ${file} 복사 완료`);
    }
  }
}

// Constants 및 Navigation 파일 복사
const sourceDirs = [
  { src: 'heart-care-expo/app/constants', dst: 'app/constants' },
  { src: 'heart-care-expo/app/navigation', dst: 'app/navigation' }
];

for (const { src, dst } of sourceDirs) {
  const sourceDir = path.join(__dirname, src);
  const targetDir = path.join(projectDir, dst);
  
  if (fs.existsSync(sourceDir)) {
    console.log(`📋 ${dst} 파일 복사 중...`);
    const files = fs.readdirSync(sourceDir);
    for (const file of files) {
      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(targetDir, file);
      if (fs.statSync(sourcePath).isFile() && !fs.existsSync(targetPath)) {
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`  - ${file} 복사 완료`);
      }
    }
  }
}

console.log('✅ 모바일 앱 설정이 완료되었습니다!');
console.log('');
console.log('📱 앱을 실행하려면:');
console.log(`   1. cd ${projectDir}`);
console.log('   2. npm install --legacy-peer-deps');
console.log('   3. npx expo start --web');
console.log('');
console.log('⚠️ 참고: React 버전 충돌로 인해 반드시 --legacy-peer-deps 옵션을 사용해야 합니다.');
console.log('💡 추가로, replit 환경에서는 포트 포워딩을 위해 "npx expo start --web --port=3000" 방식으로 실행하는 것이 좋습니다.');