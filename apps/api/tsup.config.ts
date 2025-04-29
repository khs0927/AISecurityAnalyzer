import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    // 출력 파일 이름을 'api.cjs'로 하기 위해 key를 'api'로 지정
    api: 'src/index.ts' 
  },
  // 출력 디렉토리를 Netlify Functions 경로로 직접 지정
  outDir: '../../netlify/functions',
  // Netlify Functions는 CJS 형식을 선호
  format: ['cjs'], 
  // 모든 의존성을 번들에 포함 (워크스페이스 포함)
  external: [], 
  // 외부 모듈이 없으므로 shimming 불필요
  shims: false,
  // 이전 빌드 결과물 삭제
  clean: true, 
  // Netlify는 소스맵 불필요
  sourcemap: false,
  // tsup 로그 최소화
  silent: true,
})
