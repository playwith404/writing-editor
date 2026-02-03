FROM gradle:8-jdk17 AS core_builder
WORKDIR /app
COPY core/build.gradle core/settings.gradle ./
COPY core/src ./src
RUN gradle bootJar --no-daemon

FROM gradle:8-jdk17 AS sync_builder
WORKDIR /app
COPY sync/build.gradle sync/settings.gradle ./
COPY sync/src ./src
RUN gradle bootJar --no-daemon

FROM python:3.11-slim-bookworm
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV JAVA_OPTS=""

RUN apt-get update \
  && apt-get install -y --no-install-recommends openjdk-17-jre-headless bash \
  && rm -rf /var/lib/apt/lists/*

COPY ai/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY ai/app ./app
COPY --from=core_builder /app/build/libs/*.jar ./core.jar
COPY --from=sync_builder /app/build/libs/*.jar ./sync.jar
COPY start-backend.sh ./start-backend.sh

EXPOSE 3000 3001 8000

CMD ["bash", "/app/start-backend.sh"]
