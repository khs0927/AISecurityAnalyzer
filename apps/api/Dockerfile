FROM node:20-slim as builder

WORKDIR /app

# pnpm 설치
RUN npm install -g pnpm@9

# 종속성 파일 복사
COPY package.json pnpm-lock.yaml* ./

# 종속성 설치
RUN pnpm install --frozen-lockfile

# 소스 코드 복사
COPY . .

# 애플리케이션 빌드
RUN pnpm run build

# 실행 이미지
FROM node:20-slim

WORKDIR /app

# pnpm 설치
RUN npm install -g pnpm@9

# 프로덕션 종속성만 설치
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile

# 빌드된 애플리케이션 복사
COPY --from=builder /app/dist ./dist

# 포트 노출
EXPOSE 8080

# 환경 변수 설정
ENV NODE_ENV=production
ENV PORT=8080

# 애플리케이션 실행
CMD ["node", "dist/index.js"] 