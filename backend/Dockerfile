FROM python:3.11-slim-bookworm

WORKDIR /app

# 기본 의존성 설치 (psycopg2-binary 등을 위해 필요한 경우)
RUN apt-get update && apt-get install -y --no-install-recommends \
  bash \
  && rm -rf /var/lib/apt/lists/*

# 환경 변수 설정
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 각 서비스의 requirements 설치
COPY core/requirements.txt ./core_requirements.txt
RUN pip install --no-cache-dir -r core_requirements.txt

COPY ai/requirements.txt ./ai_requirements.txt
RUN pip install --no-cache-dir -r ai_requirements.txt

# 소스 코드 복사
COPY core/ ./core/
COPY ai/ ./ai/
COPY start-backend.sh ./start-backend.sh

# 실행 권한 부여
RUN chmod +x ./start-backend.sh

# 포트 개방: Core(3000), AI(8000)
EXPOSE 3000 8000

CMD ["bash", "/app/start-backend.sh"]
