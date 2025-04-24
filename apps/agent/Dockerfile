FROM python:3.11-slim

WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Poetry 설치
RUN pip install --no-cache-dir poetry==1.8.2

# Poetry 설정: 가상 환경 사용 안 함
RUN poetry config virtualenvs.create false

# 프로젝트 종속성 파일 복사
COPY pyproject.toml poetry.lock* ./

# 종속성 설치
RUN poetry install --no-dev --no-interaction --no-ansi

# 애플리케이션 코드 복사
COPY . .

# 모델 디렉토리 생성
RUN mkdir -p /models

# 포트 노출
EXPOSE 8000

# 환경 변수 설정
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV LLAMA=http://llm:7000/completion

# 애플리케이션 실행
CMD ["uvicorn", "apps.agent.main:app", "--host", "0.0.0.0", "--port", "8000"] 