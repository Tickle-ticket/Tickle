# Tickle AI 빌드 및 배포 매뉴얼

## 1. 프로젝트 개요

Tickle AI는 브라우저 행동 데이터를 수집하고, Kafka 기반 비동기 파이프라인으로 ML 모델 추론 결과를 저장/콜백하는 AI 서비스입니다.

| 구분 | 경로 | 설명 |
|------|------|------|
| AI Worker | `services/ai/serving` | Kafka 행동 이벤트 소비, 매크로 탐지 모델 추론, PostgreSQL 저장, BE callback |
| AI Internal API | `services/ai/serving/api.py` | BE가 호출하는 내부 API. 캡차 재검증 결과를 반영 |
| Behavior Ingest | `services/ai/ingest` | FE/BE 행동 이벤트를 받아 Kafka topic으로 발행하는 Spring Boot 서버 |
| AI Infra | `services/ai/docker` | Kafka, Zookeeper, PostgreSQL, Kafka UI, AI Worker/API/Ingest 통합 Docker Compose |
| Model Artifacts | `services/ai/models` | `model.joblib`, `input_features.json`, `thresholds.json` 등 추론 산출물 |

## 2. 사용 제품 및 버전

### 2.1 AI Python Runtime

| 항목 | 제품/버전 | 설정 위치 |
|------|-----------|-----------|
| Python | `python:3.11-slim` | `services/ai/Dockerfile` |
| Web Server | Uvicorn | `services/ai/docker/docker-compose.yml`, `requirements_linux.txt` |
| Web Framework | FastAPI `>=0.104.0` | `services/ai/requirements_linux.txt` |
| Kafka Client | confluent-kafka `2.14.0` | `services/ai/requirements_linux.txt` |
| PostgreSQL Driver | psycopg2-binary `2.9.12` | `services/ai/requirements_linux.txt` |
| ML/Feature Stack | numpy `2.2.6`, pandas `2.3.3`, scikit-learn `1.7.2`, lightgbm `4.6.0`, xgboost `3.2.0`, catboost `1.2.10`, joblib `1.5.3` | `services/ai/requirements_linux.txt` |
| Runtime Image Package | gcc, g++, libpq-dev | `services/ai/Dockerfile` |

### 2.2 Behavior Ingest

| 항목 | 제품/버전 | 설정 위치 |
|------|-----------|-----------|
| JVM | Java 21 | `services/ai/ingest/build.gradle` |
| Gradle Wrapper | Gradle 8.14.4 | `services/ai/ingest/gradle/wrapper/gradle-wrapper.properties` |
| Docker Build Image | `gradle:8.13-jdk21-alpine` | `services/ai/ingest/Dockerfile` |
| Framework | Spring Boot 3.5.14 | `services/ai/ingest/build.gradle` |
| WAS | 내장 Tomcat(Spring Boot Web) | `spring-boot-starter-web` |
| Runtime Image | `eclipse-temurin:21-jre-alpine` | `services/ai/ingest/Dockerfile` |
| Kafka Client | Spring Kafka | `services/ai/ingest/build.gradle` |
| Health Check | Spring Boot Actuator | `services/ai/ingest/build.gradle`, `application.yaml` |

### 2.3 Infrastructure

| 항목 | 제품/버전 | 설정 위치 |
|------|-----------|-----------|
| Kafka | `confluentinc/cp-kafka:7.5.0` | `services/ai/docker/docker-compose.yml` |
| Zookeeper | `confluentinc/cp-zookeeper:7.5.0` | `services/ai/docker/docker-compose.yml` |
| PostgreSQL | `postgres:16-alpine` | `services/ai/docker/docker-compose.yml` |
| Kafka UI | `provectuslabs/kafka-ui:latest` | `services/ai/docker/docker-compose.yml` |

### 2.4 IDE

| 항목 | 권장 값 |
|------|---------|
| Python IDE | PyCharm 2024.3 이상 또는 VS Code |
| Python Interpreter | Python 3.11 |
| Backend IDE | IntelliJ IDEA 2024.3 이상 권장 |
| Project SDK | Java 21 |
| Gradle JVM | Java 21 |

## 3. GitLab 소스 클론 이후 로컬 빌드

```bash
git clone <GitLab Repository URL>
cd <repository>
```

### 3.1 AI Python 의존성 설치

```bash
cd services/ai
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements_linux.txt
```

개발/시뮬레이터 최소 의존성만 설치할 때는 `requirements.txt`를 사용할 수 있습니다. 운영 컨테이너와 동일한 환경 검증은 `requirements_linux.txt` 기준으로 수행합니다.

### 3.2 Behavior Ingest 빌드

```bash
cd services/ai/ingest
chmod +x gradlew
./gradlew clean bootJar
```

생성 산출물:

```text
services/ai/ingest/build/libs/*.jar
```

### 3.3 Docker 이미지 빌드

```bash
cd services/ai
docker build -t tickle-ai-worker-api .
docker build -t tickle-ai-ingest ./ingest
```

## 4. 로컬 실행

### 4.1 Docker Compose 통합 실행

`services/ai/docker/.env.example`을 참고해 `services/ai/docker/.env`를 작성합니다.

```bash
cd services/ai/docker
cp .env.example .env
docker compose --env-file .env up -d --build
```

기본 구성:

| 서비스 | 기본 내부 포트 | Host 포트 변수 | 설명 |
|--------|---------------|----------------|------|
| ai-worker | 없음 | 없음 | Kafka consumer로 상시 동작 |
| ai-api | 8080 | `AI_API_PORT` | 내부 API, Swagger `/docs`, OpenAPI `/openapi.json` |
| ingest | 8080 | `INGEST_PORT` | 행동 데이터 수집 API, Actuator `/actuator/health` |
| kafka | 9092 | `KAFKA_PORT` | Docker network 내부 broker는 `kafka:9092` 사용 |
| postgres | 5432 | `POSTGRES_PORT` | AI 탐지 결과 저장 |
| kafka-ui | 8080 | `KAFKA_UI_PORT` | `debug` profile에서만 실행 |

Kafka UI까지 실행:

```bash
docker compose --env-file .env --profile debug up -d --build
```

### 4.2 AI Worker 단독 실행

Kafka/PostgreSQL이 먼저 실행되어 있어야 합니다.

```bash
cd services/ai
set -a
source docker/.env
set +a
python -m serving.main
```

### 4.3 AI Internal API 단독 실행

```bash
cd services/ai
set -a
source docker/.env
set +a
uvicorn serving.api:app --host 0.0.0.0 --port 8080
```

### 4.4 Behavior Ingest 단독 실행

```bash
cd services/ai/ingest
export SERVER_PORT=8080
export KAFKA_BOOTSTRAP_SERVERS=localhost:19092
export KAFKA_TOPIC_BEHAVIOR_EVENTS=behavior-events-v1
./gradlew bootRun
```

## 5. 배포 구성

AI 운영 배포는 `services/ai/docker/docker-compose.yml`을 기준으로 합니다.

```bash
cd services/ai/docker
docker compose --env-file .env up -d --build
```

운영 컨테이너:

| 컨테이너 | 역할 | 주요 의존성 |
|----------|------|-------------|
| `tickle-ai-zookeeper` | Kafka metadata 관리 | 없음 |
| `tickle-ai-kafka` | 행동 이벤트 topic broker | Zookeeper |
| `tickle-ai-kafka-init` | `behavior-events-v1`, DLQ topic 생성 | Kafka healthcheck |
| `tickle-ai-postgres` | AI 추론 결과 저장 | 초기 SQL |
| `tickle-ai-worker` | Kafka consume, 추론, 저장, BE callback | Kafka, PostgreSQL, model artifact |
| `tickle-ai-api` | 캡차 재검증 내부 API | PostgreSQL |
| `tickle-ai-ingest` | 행동 이벤트 수집 후 Kafka publish | Kafka |

## 6. 빌드 및 실행 환경 변수

환경 변수 전체 목록은 `exec/.env.example`과 `services/ai/docker/.env.example`을 참고합니다. 운영 배포 시에는 `services/ai/docker/.env`에 실제 값을 작성합니다.

| 변수 | 설명 | 기본/예시 |
|------|------|-----------|
| `KAFKA_PORT` | Host에서 Kafka 접근 포트 | `19092` |
| `KAFKA_UI_PORT` | Kafka UI host 포트 | `18088` |
| `KAFKA_TOPIC_BEHAVIOR_EVENTS` | 행동 이벤트 메인 topic | `behavior-events-v1` |
| `KAFKA_TOPIC_BEHAVIOR_EVENTS_PARTITIONS` | 행동 이벤트 topic partition 수 | `3` |
| `KAFKA_TOPIC_DLQ` | 처리 실패 메시지 DLQ topic | `behavior-events-dlq-v1` |
| `KAFKA_TOPIC_DLQ_PARTITIONS` | DLQ partition 수 | `1` |
| `KAFKA_LOG_RETENTION_HOURS` | Kafka 메시지 보관 시간 | `168` |
| `KAFKA_LOG_RETENTION_BYTES` | Kafka 로그 보관 크기 | `1073741824` |
| `KAFKA_MESSAGE_MAX_BYTES` | Kafka 단일 메시지 최대 크기 | `1048576` |
| `POSTGRES_PORT` | Host에서 PostgreSQL 접근 포트 | `15432` |
| `POSTGRES_DB` | AI DB 이름 | 운영 값으로 변경 |
| `POSTGRES_USER` | AI DB 사용자 | 운영 값으로 변경 |
| `POSTGRES_PASSWORD` | AI DB 비밀번호 | 운영 값으로 변경 |
| `AI_API_PORT` | AI Internal API host 포트 | 운영 값으로 지정 |
| `KAFKA_CONSUMER_GROUP_ID` | AI Worker consumer group | `ai-worker-group-v1` |
| `USE_TYPE_ENSEMBLE` | type별 ensemble 모델 사용 여부 | `true` |
| `MODELS_ROOT` | 모델 artifact root | `/app/models` |
| `ENSEMBLE_CLASSIFIER_DIRS` | ensemble classifier 디렉터리 목록 | `classifier,classifier_1,classifier_2` |
| `ENSEMBLE_VOTING` | ensemble voting 방식 | `soft` 또는 `hard` |
| `THRESHOLDS_PATH` | type별 threshold JSON 경로 | `/app/models/thresholds.json` |
| `MODEL_PATH` | 단일 모델 fallback 경로 | `/app/models/classifier/model.joblib` |
| `INPUT_FEATURES_PATH` | 단일 모델 feature 목록 경로 | `/app/models/classifier/input_features.json` |
| `ALLOW_MAX_SCORE` | ALLOW 판정 최대 점수 | `0.40` |
| `BLOCK_MIN_SCORE` | BLOCK 판정 최소 점수 | `0.75` |
| `AI_WORKER_BATCH_SIZE` | Worker micro-batch 크기 | `16` |
| `AI_WORKER_FLUSH_INTERVAL_SEC` | partial batch flush 최대 대기 시간 | `0.2` |
| `SPRING_PROFILES_ACTIVE` | Ingest Spring profile | `prod` |
| `INGEST_PORT` | Ingest host 포트 | `18080` |
| `INGEST_CORS_ALLOWED_ORIGINS` | Ingest 호출 허용 origin 목록 | comma-separated |
| `BE_BOT_DETECTION_RESULT_URL` | AI Worker가 탐지 결과를 보낼 BE callback URL | 미설정 시 callback skip |
| `BE_CALLBACK_TIMEOUT_SEC` | BE callback timeout | `2.0` |
| `BE_INTERNAL_SERVICE_TOKEN` | BE callback용 bearer token | 필요 시 설정 |
| `BE_INTERNAL_SECRET` | BE callback용 내부 secret header | BE와 동일 값 |
| `BE_CALLBACK_USER_ID` | callback 테스트/기본 사용자 ID | `1001` |

## 7. 배포 시 특이사항

- AI Worker는 시작 시 모델 artifact를 로드합니다. `USE_TYPE_ENSEMBLE=true`이면 `MODELS_ROOT/<DETAIL|CAPTCHA|BOOKING>/<classifier_dir>/model.joblib`와 `input_features.json`이 최소 1세트 이상 존재해야 합니다.
- Kafka topic은 `kafka-init` 컨테이너가 생성합니다. `KAFKA_AUTO_CREATE_TOPICS_ENABLE=false`이므로 topic 이름 변경 시 init 설정과 producer/consumer 설정을 함께 변경해야 합니다.
- PostgreSQL 초기화 SQL은 `services/ai/docker/postgres/init/001_init.sql`이 컨테이너 최초 생성 시 실행됩니다. 기존 volume이 있으면 자동 재실행되지 않습니다.
- Docker Compose 내부 통신은 `kafka:9092`, `postgres:5432`를 사용합니다. Host에서 접근할 때만 `KAFKA_PORT`, `POSTGRES_PORT`를 사용합니다.
- BE callback 인증은 `BE_INTERNAL_SECRET`이 있으면 `X-Internal-Secret` 헤더를 우선 사용하고, 없으면 `BE_INTERNAL_SERVICE_TOKEN` bearer token을 사용합니다. Kafka message에 access token이 있으면 사용자 token이 Authorization 헤더로 전달됩니다.
- Ingest CORS origin은 운영 FE 도메인만 남기고 로컬 origin은 제거하는 것을 권장합니다.

## 8. DB 접속 정보 및 주요 프로퍼티 파일 목록

### 8.1 DB

| DB | 용도 | 접속 정보 정의 위치 |
|----|------|--------------------|
| PostgreSQL `POSTGRES_DB` | AI 행동 feature, 탐지 결과, 캡차 재검증 상태 저장 | `services/ai/docker/.env`, `services/ai/docker/docker-compose.yml`, `serving/repository.py` |

주요 테이블:

| 테이블 | 설명 |
|--------|------|
| `behavior_feature_records` | Worker 추론 결과 저장. label은 `ALLOW`, `REVIEW`, `BLOCK`, `REVALIDATED` |
| `behavior_feature_records_gt` | 테스트/검증용 ground truth feature record 저장 |

### 8.2 주요 계정/프로퍼티 정의 파일

| 파일 | 내용 |
|------|------|
| `exec/.env.example` | 포팅 매뉴얼용 통합 환경 변수 예시와 주석 설명 |
| `services/ai/docker/.env.example` | AI Docker Compose 실행 환경 변수 예시 |
| `services/ai/docker/.env` | AI 운영/로컬 실제 환경 변수. Git 커밋 금지 |
| `services/ai/docker/docker-compose.yml` | AI Kafka/PostgreSQL/Worker/API/Ingest 컨테이너 구성 |
| `services/ai/docker/postgres/init/001_init.sql` | AI PostgreSQL 초기 테이블/인덱스 생성 SQL |
| `services/ai/Dockerfile` | Python AI Worker/API 이미지 정의 |
| `services/ai/requirements_linux.txt` | 운영 컨테이너 Python dependency 고정 버전 |
| `services/ai/requirements.txt` | 개발/데모용 최소 Python dependency |
| `services/ai/serving/repository.py` | PostgreSQL 접속 환경 변수와 저장 로직 |
| `services/ai/serving/kafka_consumer.py` | Kafka bootstrap/group 환경 변수와 consumer 설정 |
| `services/ai/serving/macro_predictor.py` | 모델 artifact, ensemble, threshold 환경 변수 처리 |
| `services/ai/serving/be_callback_client.py` | BE callback URL, timeout, 내부 인증 환경 변수 처리 |
| `services/ai/serving/api.py` | AI Internal API endpoint 정의 |
| `services/ai/ingest/src/main/resources/application.yaml` | Ingest server/Kafka/CORS/Actuator 설정 |
| `services/ai/ingest/build.gradle` | Ingest Java/Spring dependency 및 Java 21 설정 |
| `services/ai/ingest/Dockerfile` | Ingest Docker build/runtime 이미지 정의 |
| `services/ai/models/thresholds.example.json` | type별 threshold 예시 |
| `services/ai/models/**/model.joblib` | 운영 추론 모델 artifact. 대용량/민감 파일이면 별도 배포 관리 |
| `services/ai/models/**/input_features.json` | 모델 입력 feature 순서 정의 |
