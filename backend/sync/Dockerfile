FROM gradle:8-jdk17 AS builder
WORKDIR /app
COPY build.gradle settings.gradle ./
COPY src ./src
RUN gradle bootJar --no-daemon

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
ENV JAVA_OPTS=""
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE 3000
CMD ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
