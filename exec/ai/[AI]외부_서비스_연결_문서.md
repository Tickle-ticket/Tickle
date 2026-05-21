# Tickle AI 외부 서비스 연동 정보

## 1. 외부/연동 서비스 목록

| 서비스 | 사용 위치 | 용도 | 필수 여부 |
|--------|-----------|------|-----------|
| Kafka/Zookeeper | `services/ai/docker`, `services/ai/serving`, `services/ai/ingest` | 행동 이벤트 비동기 전달, Worker consume | AI 파이프라인 필수 |
| PostgreSQL | `services/ai/docker`, `services/ai/serving` | AI 추론 결과 및 feature 저장 | AI Worker/API 필수 |
| Core BE Callback API | `services/ai/serving/be_callback_client.py` | AI 탐지 결과를 BE로 전달 | BE 연동 시 필수 |
| AI Internal API | `services/ai/serving/api.py` | BE가 캡차 재검증 결과를 AI DB에 반영 | 캡차 재검증 사용 시 필수 |
| PyPI | `services/ai/requirements*.txt` | Python dependency 다운로드 | 로컬/이미지 빌드 시 필수 |
| Maven Central/Gradle Distribution | `services/ai/ingest` | Spring Boot Ingest dependency 및 Gradle 다운로드 | Ingest 빌드 시 필수 |
| GitLab | 개발자 로컬, Jenkins | 소스 저장소 및 배포 소스 checkout | 배포 시 필수 |
| Jenkins/Mattermost | `Jenkinsfile.ci` | CI 실행 및 알림 | 자동 CI 사용 시 필요 |

## 2. Kafka/Zookeeper

### 2.1 사용 목적

- Behavior Ingest가 브라우저 행동 데이터를 Kafka topic으로 발행
- AI Worker가 `behavior-events-v1` topic을 consume해 feature 저장/추론 수행
- 처리 실패 메시지를 DLQ topic으로 분리할 수 있도록 topic 변수 제공

### 2.2 필요 환경 변수

| 변수 | 설명 |
|------|------|
| `KAFKA_BOOTSTRAP_SERVERS` | Worker/Ingest가 접속할 Kafka broker. Compose 내부는 `kafka:9092` |
| `KAFKA_PORT` | Host에서 Kafka에 접근할 포트 |
| `KAFKA_TOPIC_BEHAVIOR_EVENTS` | 행동 이벤트 메인 topic |
| `KAFKA_TOPIC_BEHAVIOR_EVENTS_PARTITIONS` | 메인 topic partition 수 |
| `KAFKA_TOPIC_DLQ` | 실패 메시지 저장 topic |
| `KAFKA_TOPIC_DLQ_PARTITIONS` | DLQ topic partition 수 |
| `KAFKA_CONSUMER_GROUP_ID` | AI Worker consumer group id |
| `KAFKA_LOG_RETENTION_HOURS` | Kafka 로그 보관 시간 |
| `KAFKA_MESSAGE_MAX_BYTES` | Kafka 단일 메시지 최대 크기 |

### 2.3 설정 파일

- `services/ai/docker/docker-compose.yml`
- `services/ai/docker/.env.example`
- `services/ai/serving/kafka_consumer.py`
- `services/ai/ingest/src/main/resources/application.yaml`

## 3. PostgreSQL

### 3.1 사용 목적

- AI Worker가 추론한 `ALLOW`, `REVIEW`, `BLOCK` 결과 저장
- AI Internal API가 캡차 재검증 성공 시 `REVALIDATED` 상태 반영
- JSONB feature 저장 및 GIN index 기반 분석/검증 데이터 조회

### 3.2 필요 환경 변수

| 변수 | 설명 |
|------|------|
| `POSTGRES_HOST` | PostgreSQL host. Compose 내부는 `postgres` |
| `POSTGRES_PORT` | PostgreSQL port. Compose 내부는 `5432`, host 접근은 `POSTGRES_PORT` |
| `POSTGRES_DB` | AI DB 이름 |
| `POSTGRES_USER` | AI DB 사용자 |
| `POSTGRES_PASSWORD` | AI DB 비밀번호 |

### 3.3 설정 파일

- `services/ai/docker/docker-compose.yml`
- `services/ai/docker/.env.example`
- `services/ai/docker/postgres/init/001_init.sql`
- `services/ai/serving/repository.py`

## 4. Core BE Callback API

### 4.1 사용 목적

- AI Worker가 행동 이벤트 추론 결과를 Core BE로 전달
- BE에서 봇 탐지 결과를 사용자 흐름, 캡차, 차단 정책에 반영

### 4.2 필요 환경 변수

| 변수 | 설명 |
|------|------|
| `BE_BOT_DETECTION_RESULT_URL` | BE callback endpoint. 비어 있으면 Worker가 callback을 생략 |
| `BE_CALLBACK_TIMEOUT_SEC` | callback HTTP timeout |
| `BE_INTERNAL_SECRET` | 내부 서비스 인증용 `X-Internal-Secret` header 값 |
| `BE_INTERNAL_SERVICE_TOKEN` | `BE_INTERNAL_SECRET`이 없을 때 사용하는 bearer token |
| `BE_CALLBACK_USER_ID` | callback 테스트/기본 사용자 ID |

### 4.3 연동 특이사항

- `BE_INTERNAL_SECRET`이 설정되어 있으면 `X-Internal-Secret` 헤더를 우선 사용합니다.
- Kafka message header에 `access-token`이 있으면 사용자 access token을 `Authorization: Bearer ...`로 전달합니다.
- `X-Request-Id` header가 있으면 callback 요청에도 그대로 전달해 추적성을 유지합니다.

### 4.4 설정 파일

- `services/ai/serving/be_callback_client.py`
- `services/ai/docker/docker-compose.yml`
- `services/ai/docker/.env.example`
- `services/be/src/main/resources/application-local.yaml`

## 5. AI Internal API

### 5.1 사용 목적

- BE가 캡차 재검증 결과를 AI 서비스에 전달
- `POST /api/captcha-retry-result` 요청 중 `ALLOW` 결과에 대해 AI DB record label을 `REVALIDATED`로 변경

### 5.2 필요 환경 변수

| 변수 | 설명 |
|------|------|
| `AI_API_PORT` | AI Internal API host 노출 포트 |
| `POSTGRES_HOST` | AI API가 접근할 PostgreSQL host |
| `POSTGRES_PORT` | AI API가 접근할 PostgreSQL port |
| `POSTGRES_DB` | AI DB 이름 |
| `POSTGRES_USER` | AI DB 사용자 |
| `POSTGRES_PASSWORD` | AI DB 비밀번호 |

### 5.3 설정 파일

- `services/ai/serving/api.py`
- `services/ai/serving/repository.py`
- `services/ai/docker/docker-compose.yml`

## 6. PyPI

### 6.1 사용 목적

- FastAPI, Uvicorn, confluent-kafka, psycopg2, pandas, scikit-learn, LightGBM, XGBoost, CatBoost 등 Python dependency 다운로드

### 6.2 필요 정보

- 별도 가입 불필요
- 빌드 환경에서 `https://pypi.org`, `https://files.pythonhosted.org` 접근 필요
- 사내망/폐쇄망에서는 wheel cache 또는 사설 PyPI mirror 준비 필요

### 6.3 설정 파일

- `services/ai/requirements_linux.txt`
- `services/ai/requirements.txt`
- `services/ai/Dockerfile`

## 7. Maven Central/Gradle Distribution

### 7.1 사용 목적

- Behavior Ingest의 Spring Boot, Spring Kafka, Actuator dependency 다운로드
- Gradle Wrapper distribution 다운로드

### 7.2 필요 정보

- 별도 가입 불필요
- 빌드 환경에서 `https://repo.maven.apache.org/maven2`, `https://services.gradle.org/distributions/` 접근 필요

### 7.3 설정 파일

- `services/ai/ingest/build.gradle`
- `services/ai/ingest/gradle/wrapper/gradle-wrapper.properties`
- `services/ai/ingest/Dockerfile`

## 8. GitLab

### 8.1 사용 목적

- AI 소스 코드 저장소
- Jenkins checkout 및 변경 감지
- 배포 서버에서 source pull 또는 image build source로 사용

### 8.2 필요 정보

| 항목 | 설명 |
|------|------|
| GitLab Repository URL | `git clone` 및 Jenkins SCM 설정에 사용 |
| GitLab 계정 | 소스 pull 권한 필요 |
| Jenkins GitLab Credential | Jenkins checkout 권한이 필요한 경우 사용 |

## 9. Jenkins/Mattermost

### 9.1 사용 목적

- `Jenkinsfile.ci` 기반 CI
- Git 변경 파일 감지 후 빌드/테스트 수행
- Mattermost Incoming Webhook으로 CI 결과 알림

### 9.2 현재 주의사항

- 현재 `Jenkinsfile.ci`는 `services/be`, `services/auth` 변경 감지 중심으로 작성되어 있습니다.
- AI 자동 빌드/배포까지 포함하려면 `services/ai/` 변경 감지, `services/ai/ingest` Gradle build, AI Docker Compose 재배포 stage를 추가해야 합니다.
- Mattermost webhook URL은 비밀값으로 관리하고, 문서/저장소에 실제 URL을 노출하지 않는 것을 권장합니다.

### 9.3 설정 파일

- `Jenkinsfile.ci`

## 10. 비밀값 관리 원칙

- 제출 문서에는 실제 DB 비밀번호, 내부 secret, service token, webhook URL 값을 적지 않고 변수명과 설정 위치만 기록합니다.
- 운영 `.env`와 모델 artifact는 Git 커밋 대상에서 제외합니다.
- 키가 노출된 경우 즉시 외부 서비스 콘솔 또는 배포 설정에서 재발급하고 기존 값을 폐기합니다.
