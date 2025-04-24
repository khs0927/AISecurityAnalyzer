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

# 빌드
RUN pnpm run build

# 실행 환경 (NGINX)
FROM nginx:stable-alpine

# NGiNX 설정 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 빌드된 파일 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# 포트 노출
EXPOSE 80

# 유효성 검사 설정
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# NGiNX 실행
CMD ["nginx", "-g", "daemon off;"] 