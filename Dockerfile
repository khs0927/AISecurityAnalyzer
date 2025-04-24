FROM node:16-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 매니저로 pnpm 설치
RUN npm install -g pnpm

# 의존성 파일 복사
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY server/package.json ./server/

# 의존성 설치
RUN pnpm install --frozen-lockfile

# 소스 코드 복사
COPY server ./server
COPY .env.serverless ./server/.env.production

# 앱 빌드
RUN pnpm --filter server build

# 실행 환경
FROM node:16-alpine AS runner

# 비프로덕션 환경 패키지 건너뛰기
ENV NODE_ENV=production

# 작업 디렉토리 설정
WORKDIR /app

# pnpm 설치
RUN npm install -g pnpm

# 빌드 결과물 복사
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/package.json ./
COPY --from=builder /app/server/.env.production ./

# 필요한 패키지만 설치
RUN pnpm install --prod --frozen-lockfile

# 모델 디렉토리 생성
RUN mkdir -p /app/models

# 앱 실행
EXPOSE 8080
CMD ["node", "dist/index.js"] 