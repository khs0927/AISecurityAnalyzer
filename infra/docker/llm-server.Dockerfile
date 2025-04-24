FROM ghcr.io/ggerganov/llama.cpp:latest

# 작업 디렉토리 설정
WORKDIR /app

# 포트 노출
EXPOSE 7000

# 모델 디렉토리 생성
RUN mkdir -p /models

# 환경 변수 설정
ENV MODEL_PATH=/models/Bio-MiniCPM-2B.Q4_K_M.gguf
ENV PORT=7000
ENV CTX_SIZE=4096
ENV HOST=0.0.0.0
ENV WORKERS=4

# 실행 명령
CMD ["/bin/sh", "-c", "/app/server --model ${MODEL_PATH} --port ${PORT} --ctx-size ${CTX_SIZE} --host ${HOST} --workers ${WORKERS}"] 