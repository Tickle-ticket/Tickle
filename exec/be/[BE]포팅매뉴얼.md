# Tickle BE 빌드 및 배포 매뉴얼

## 1. 프로젝트 개요

대용량 티켓팅 트래픽을 처리하기 위한 Tickle의 백엔드 중심 서비스입니다. 주요 구성은 다음과 같습니다.

| 구분 | 경로 | 설명 |
|------|------|------|
| Core BE | `services/be` | 이벤트, 대기열, 좌석, 예매, 결제, 취소표, 관리자/모니터링 API |
| Auth | `services/auth` | 자체 로그인, 카카오 OAuth, JWT 발급/재발급, 휴대폰 인증 |
| Infra | `infra/docker-compose` | 서버별 Docker Compose 구성 |
| ERD | `docs/erd.md` | `tickle_core` 기준 ERD 문서 |

## 2. 사용 제품 및 버전

### 2.1 Backend

| 항목 | 제품/버전 | 설정 위치 |
|------|-----------|-----------|
| JVM | Java 21 | `services/be/build.gradle`, `services/auth/build.gradle` |
| Gradle | Gradle Wrapper 8.13 | `services/*/gradle/wrapper/gradle-wrapper.properties` |
| Framework | Spring Boot 3.4.5 | `services/be/build.gradle`, `services/auth/build.gradle` |
| Dependency Management | Spring Dependency Management 1.1.7 | `services/*/build.gradle` |
| WAS | 내장 Tomcat(Spring Boot Web) | `spring-boot-starter-web` |
| Runtime Image | `eclipse-temurin:21-jre-alpine` | `services/be/Dockerfile`, `services/auth/Dockerfile` |
| API 문서 | Springdoc OpenAPI 2.8.8 | `services/*/build.gradle` |
| DB Driver | MySQL Connector/J | `services/*/build.gradle` |
| Redis Client | Spring Data Redis, Redisson 3.49.0(Core BE) | `services/be/build.gradle` |
| Kafka Client | Spring Kafka | `services/be/build.gradle` |
| JWT | JJWT 0.12.6 | `services/*/build.gradle` |
| Monitoring | Actuator, Prometheus, OpenTelemetry/Tempo | `services/*/build.gradle` |


### 2.2 Infrastructure

| 항목 | 제품/버전 | 설정 위치 |
|------|-----------|-----------|
| MySQL | `mysql:8.0` | `infra/docker-compose/server1-main.yml` |
| Redis | `redis:7` | `infra/docker-compose/server1-main.yml`, `server3-monitoring.yml`, `server4-auth.yml` |
| Kafka | `confluentinc/cp-kafka:7.5.0` | `infra/docker-compose/server2-kafka.yml` |
| Zookeeper | `confluentinc/cp-zookeeper:7.5.0` | `infra/docker-compose/server2-kafka.yml` |
| Prometheus | `prom/prometheus:latest` | `infra/docker-compose/server3-monitoring.yml` |
| Grafana | `grafana/grafana:latest` | `infra/docker-compose/server3-monitoring.yml` |
| Tempo | `grafana/tempo:latest` | `infra/docker-compose/server3-monitoring.yml` |
| Loki/Promtail | `grafana/loki:latest`, `grafana/promtail:latest` | `infra/docker-compose/server3-monitoring.yml`, `infra/promtail/*` |
| Jenkins | `jenkins/jenkins:lts-jdk21` | `infra/docker-compose/server5-jenkins.yml` |

### 2.3 IDE

| 항목 | 권장 값 |
|------|---------|
| Backend IDE | IntelliJ IDEA 2024.3 이상 권장 |
| Project SDK | Java 21 |
| Gradle JVM | Java 21 |
| Annotation Processing | Lombok 사용을 위해 활성화 |

## 3. GitLab 소스 클론 이후 로컬 빌드

```bash
git clone <GitLab Repository URL>
cd <repository>
```

### 3.1 Core BE 빌드

```bash
cd services/be
chmod +x gradlew
./gradlew clean build
```

생성 산출물:

```text
services/be/build/libs/*.jar
```

### 3.2 Auth 빌드

```bash
cd services/auth
chmod +x gradlew
./gradlew clean build
```

생성 산출물:

```text
services/auth/build/libs/*.jar
```

## 4. 로컬 실행

### 4.1 Core BE

`services/be/.env.example`을 참고해 `services/be/.env`를 작성합니다.

```bash
cd services/be
set -a
source .env
set +a
./gradlew bootRun --args='--spring.profiles.active=local'
```

기본 포트:

```text
http://localhost:8080
Swagger: http://localhost:8080/swagger-ui.html
OpenAPI: http://localhost:8080/api-docs
```

### 4.2 Auth

Auth 서버는 로컬 빌드 시, Core BE 서버와 동일한 `.env.example` 파일을 사용합니다.

```bash
cd services/auth
set -a
source .env
set +a
./gradlew bootRun --args='--spring.profiles.active=local'
```

기본 포트:

```text
http://localhost:8081
Swagger: http://localhost:8081/swagger-ui.html
OpenAPI: http://localhost:8081/api-docs
```

### 4.3 Docker Compose 로컬 실행

통합 로컬 인프라는 `infra/docker-compose/local-dev.yml`을 사용합니다.

```bash
docker compose -f infra/docker-compose/local-dev.yml up -d
```

## 5. 배포 구성

운영 배포는 서버 역할별 Docker Compose 파일을 사용합니다.

| 서버 | Compose 파일 | 주요 컨테이너 |
|------|--------------|---------------|
| Server 1 | `infra/docker-compose/server1-main.yml` | MySQL, Redis Master, Core BE, Node Exporter, Promtail |
| Server 2 | `infra/docker-compose/server2-kafka.yml` | Zookeeper, Kafka, Redis Sentinel, Node Exporter, Promtail |
| Server 3 | `infra/docker-compose/server3-monitoring.yml` | Prometheus, Grafana, Tempo, Loki, Redis Replica, Redis Sentinel |
| Server 4 | `infra/docker-compose/server4-auth.yml` | Auth, Redis Replica, Redis Sentinel, Node Exporter, Promtail |
| Server 5 | `infra/docker-compose/server5-jenkins.yml` | Jenkins, Node Exporter, Promtail |

### 5.1 운영 배포 명령

루트 디렉터리에 `.env`를 작성한 뒤 각 서버에서 실행합니다.

Server 1:

```bash
docker compose --env-file .env -f infra/docker-compose/server1-main.yml up -d --build
```

Server 2:

```bash
docker compose --env-file .env -f infra/docker-compose/server2-kafka.yml up -d
```

Server 3:

```bash
docker compose --env-file .env -f infra/docker-compose/server3-monitoring.yml up -d
```

Server 4:

```bash
docker compose --env-file .env -f infra/docker-compose/server4-auth.yml up -d --build
```

Server 5:

```bash
docker compose --env-file .env -f infra/docker-compose/server5-jenkins.yml up -d
```

### 5.2 Jenkins CD

Jenkins 파이프라인은 루트 `Jenkinsfile`을 사용합니다.

동작 방식:

1. GitLab 저장소 체크아웃
2. 직전 커밋 대비 변경 파일 감지
3. `services/be/` 변경 시 Server 1에 SSH 접속 후 BE 재빌드/재배포
4. `services/auth/` 변경 시 Server 4에 SSH 접속 후 Auth 이미지 빌드/푸시/재기동
5. Mattermost Webhook으로 성공/실패 알림

Jenkins에 필요한 Credential/환경:

| 이름 | 설명 |
|------|------|
| `gitlab-credentials` | GitLab/Registry 로그인용 username/password credential |
| `tickle-deploy-key` | 배포 서버 SSH 접속용 private key credential |
| `SERVER1_IP` | Core BE 배포 서버 공인/접속 IP |
| `SERVER4_IP` | Auth 배포 서버 공인/접속 IP |
| `REGISTRY` | GitLab Container Registry 주소 |

## 6. 빌드 및 실행 환경 변수

환경 변수 전체 목록과 설명은 [exec/.env.example](./.env.example)에 주석으로 정리했습니다. 운영 배포 시에는 루트 `.env`에 실제 값을 작성하고, 로컬 실행 시에는 서비스별 `.env`를 작성합니다.

| 실행 위치 | 참고 파일 | 비고 |
|-----------|-----------|------|
| 운영 Docker Compose | `exec/.env.example`, `.env.example` | 루트 `.env`에 실제 값 작성 |
| Core BE 로컬 | `exec/.env.example`, `services/be/.env.example` | `services/be/.env`에 실제 값 작성 |
| Auth 로컬 | `exec/.env.example`, `services/auth/src/main/resources/application-local.yaml` | `services/auth/.env`에 실제 값 작성 |

## 7. 배포 시 특이사항

- Core BE와 Auth는 `JWT_SECRET`, `INTERNAL_SECRET`을 반드시 같은 값으로 공유해야 합니다.
- MySQL 초기화 SQL은 `infra/docker-compose/init.sql`이 Server 1 MySQL 컨테이너 초기 생성 시 실행됩니다. 이미 volume이 존재하면 자동 재실행되지 않습니다.
- Redis Sentinel 설정 파일은 `infra/redis/sentinel-server*.conf`에 존재합니다. Compose의 Sentinel volume 초기화 여부에 따라 설정 반영 확인이 필요합니다.
- Swagger 경로는 두 서비스 모두 `/swagger-ui.html`, OpenAPI 경로는 `/api-docs`입니다.
- Jenkinsfile에는 현재 배포 대상 브랜치가 `develop-be`로 명시되어 있습니다.


## 8. DB 접속 정보 및 주요 프로퍼티 파일 목록

### 8.1 DB

| DB | 용도 | 접속 정보 정의 위치 |
|----|------|--------------------|
| `tickle_core` | 이벤트, 좌석, 예매, 결제, 취소, 대기열 등 Core 도메인 | `services/be/src/main/resources/application-local.yaml`, `infra/docker-compose/server1-main.yml`, 루트 `.env` |
| `tickle_auth` | 인증 사용자, OAuth provider, JWT refresh token 관련 Auth 도메인 | `services/auth/src/main/resources/application-local.yaml`, `infra/docker-compose/server4-auth.yml`, 루트 `.env` |

### 8.2 주요 계정/프로퍼티 정의 파일

| 파일 | 내용 |
|------|------|
| `exec/.env.example` | 포팅 매뉴얼용 통합 환경 변수 예시와 주석 설명 |
| `.env.example` | 배포 서버 공통 IP, MySQL root password, 카카오페이, JWT 예시 변수 |
| `.env` | 운영 배포용 실제 환경 변수 파일. Git 커밋 금지 |
| `services/be/.env.example` | Core BE 로컬 실행용 환경 변수 예시 |
| `services/be/.env` | Core BE 로컬 실행용 실제 환경 변수. Git 커밋 금지 |
| `services/auth/.env` | Auth 로컬 실행용 실제 환경 변수. Git 커밋 금지 |
| `services/be/src/main/resources/application-local.yaml` | Core BE Spring profile 설정, DB/Redis/Kafka/JWT/S3/KakaoPay/CoolSMS/Turnstile |
| `services/auth/src/main/resources/application-local.yaml` | Auth Spring profile 설정, DB/Redis/JWT/Kakao OAuth/CoolSMS |
| `services/be/src/test/resources/application-test.yaml` | Core BE 테스트 프로파일 설정 |
| `infra/docker-compose/server1-main.yml` | MySQL, Redis Master, Core BE 운영 컨테이너 환경 변수 |
| `infra/docker-compose/server2-kafka.yml` | Kafka/Zookeeper/Sentinel 운영 컨테이너 환경 변수 |
| `infra/docker-compose/server3-monitoring.yml` | Prometheus/Grafana/Tempo/Loki/Redis Replica 운영 컨테이너 환경 변수 |
| `infra/docker-compose/server4-auth.yml` | Auth/Redis Replica 운영 컨테이너 환경 변수 |
| `infra/docker-compose/server5-jenkins.yml` | Jenkins 운영 컨테이너 환경 변수 |
| `infra/prometheus/prometheus.yml` | Prometheus scrape 설정 |
| `infra/tempo/tempo.yml` | Tempo tracing 설정 |
| `infra/promtail/promtail-server*.yml` | 서버별 로그 수집 설정 |
| `infra/redis/sentinel-server*.conf` | Redis Sentinel 설정 |
| `docs/erd.md` | `tickle_core` ERD 문서 |
| `services/be/docs/auth-db.sql` | Auth DB 관련 SQL 참고 |
| `services/be/docs/db.sql` | Core DB 관련 SQL 참고 |
| `infra/docker-compose/init.sql` | 운영 MySQL 초기화 SQL |
| `infra/docker-compose/local-init.sql` | 로컬 MySQL 초기화 SQL |

## 9. 포트 목록

| 포트 | 서비스 |
|------|--------|
| `8080` | Core BE, Jenkins(Server 5 내부 compose에서는 Jenkins UI) |
| `8081` | Auth |
| `3306` | MySQL |
| `6379` | Redis |
| `26379` | Redis Sentinel |
| `9092` | Kafka |
| `2181` | Zookeeper 내부 |
| `9090` | Prometheus |
| `3000` | Grafana |
| `3100` | Loki |
| `4317` | OTLP gRPC |
| `4318` | OTLP HTTP |
| `9100` | Node Exporter |
| `50000` | Jenkins agent |
