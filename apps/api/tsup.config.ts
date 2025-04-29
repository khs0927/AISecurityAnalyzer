import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    api: 'src/index.ts' 
  },
  outDir: '../../netlify/functions',
  format: ['cjs'], 
  // @prisma/client는 바이너리 문제로 external 유지
  external: ['@prisma/client'], 
  // 나머지 주요 의존성 및 워크스페이스 패키지는 번들에 포함
  noExternal: [
    'express', 
    'cors', 
    'helmet', 
    'morgan', 
    '@trpc/server', 
    '@trpc/client', // API가 client를 직접 사용하지 않으면 제거 가능
    'zod', 
    'jsonwebtoken', 
    'pusher', 
    '@domain'
  ],
  platform: 'node', // 플랫폼 명시
  shims: false,
  clean: true, 
  sourcemap: false,
  silent: true,
})
