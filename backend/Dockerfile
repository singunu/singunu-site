# 빌드 컨텍스트는 저장소 루트 (docker-compose가 지정) — persona/ 문서를 함께 담는다
FROM gradle:8.10-jdk17 AS build
WORKDIR /app
COPY backend/settings.gradle backend/build.gradle ./
RUN gradle dependencies --no-daemon || true
COPY backend/src ./src
COPY persona/public_persona.md ./src/main/resources/persona/public_persona.md
RUN gradle bootJar --no-daemon -x test

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
ENV PERSONA_PATH=/nonexistent
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
