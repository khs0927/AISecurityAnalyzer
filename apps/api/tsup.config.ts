import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    api: 'src/index.ts' 
  },
  outDir: '../../netlify/functions',
  format: ['cjs'], 
  external: ['@prisma/client'], 
  noExternal: [
    'express', 
    'cors', 
    'helmet', 
    'morgan', 
    '@trpc/server', 
    '@trpc/client', 
    'zod', 
    'jsonwebtoken', 
    'pusher', 
    '@domain',
    'serverless-http' // serverless-http 추가
  ],
  platform: 'node', 
  shims: false,
  clean: true, 
  sourcemap: false,
  silent: true,
})
