/* verify-env.js
   모든 서비스 및 CI 작동에 필요한 환경변수가 정의됐는지 검사
*/
const fs = require('fs');
require('dotenv').config();

// 필수 환경 변수 목록
const REQUIRED = [
  'OPENAI_API_KEY',
  'DATABASE_URL',
  'GITHUB_TOKEN',
  'KAKAO_MAP_API_KEY',
  'PUBMED_API_KEY',
  'HF_TOKEN',
  'VERCEL_TOKEN',
  'VERCEL_ORG_ID',
  'VERCEL_PROJECT_ID'
];

let missing = [];
REQUIRED.forEach((k) => {
  if (!process.env[k] || process.env[k].trim() === '') {
    missing.push(k);
  }
});

if (missing.length) {
  console.error('❌ 누락된 환경 변수:', missing.join(', '));
  process.exit(1);
} else {
  console.log('✅ 모든 필수 환경 변수가 존재합니다.');
} 