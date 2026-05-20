FROM eclipse-temurin:21-jre-alpine

# k6 설치 (시연용 부하 테스트 트리거)
RUN apk add --no-cache curl bash && \
    K6_VER=v0.49.0 && \
    curl -sL "https://github.com/grafana/k6/releases/download/${K6_VER}/k6-${K6_VER}-linux-amd64.tar.gz" \
      | tar -xz --strip-components=1 -C /usr/local/bin k6-${K6_VER}-linux-amd64/k6 && \
    chmod +x /usr/local/bin/k6

WORKDIR /app

COPY build/libs/*.jar app.jar
COPY performance-tests/scenarios/demo_load.js performance-tests/scenarios/demo_load.js
COPY performance-tests/scenarios/helpers/ performance-tests/scenarios/helpers/

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]