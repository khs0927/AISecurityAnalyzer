FROM python:3.11-slim

WORKDIR /app

# 타임존 설정
ENV TZ=Asia/Seoul
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 필요한 패키지 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    curl \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Poetry 설치 (의존성 관리 도구)
RUN pip install --no-cache-dir poetry==1.6.0

# 애플리케이션 의존성 설치
COPY pyproject.toml* poetry.lock* ./

# Poetry 설정: 가상환경 생성하지 않고 시스템에 직접 설치
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --no-dev

# requirements.txt가 있는 경우를 위한 대체 설치 방법
COPY requirements.txt* ./
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

# 소스 코드 복사
COPY . .

# 불필요한 파일 제거
RUN rm -rf tests __pycache__ *.pyc

# 비루트 사용자 생성 및 권한 설정
RUN addgroup --system appgroup && adduser --system appuser --ingroup appgroup
RUN chown -R appuser:appgroup /app
USER appuser

# 환경 변수 설정
ENV PYTHONPATH=/app
ENV PORT=8000
ENV HOST=0.0.0.0

# 서버 실행
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1 