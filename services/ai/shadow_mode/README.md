# shadow_mode

런타임(서비스 동작)을 바꾸지 않고, 로컬에서 데이터 추출/가공을 돕는 유틸을 두는 폴더입니다.

## 학습용 데이터 export 시 “기록해야 할 값”

DB에 별도 테이블을 추가하지 않고 파일로 관리하는 경우, 매번 export 이후 아래 2개 값을 기록해두는 것을 권장합니다.

- `last_db_id`: `public.behavior_feature_records.id`에서 이번에 export한 **마지막 id**

다음 export는 위 두 값 기준으로 이어서 진행합니다.

## `export_postgres_behavior_data.py`

PostgreSQL의 `public.behavior_feature_records`에서 학습용 JSONL로 내보냅니다.

- 출력 필드: `trialID`, `record_id`, `event_id`, `type`, `label`, `features`(= DB의 `features` JSONB)
- `trialID`는 export 파일 내부에서 `1`부터 다시 순차 부여합니다.
- 중복/누락 방지를 위해 DB에서 어디까지 읽었는지 `--from-db-id`로 지정합니다.

### 실행 예시 (shadow_mode 폴더에서 실행)

```bash
cd services/ai/shadow_mode

# 최초 1회 (처음부터)
python export_postgres_behavior_data.py --from-db-id 0

# 이어서 export
python export_postgres_behavior_data.py --from-db-id <마지막_db_id>
```

### 옵션

```bash
# docker-compose에서 쓰는 .env 파일 지정(기본값: services/ai/docker/.env)
python export_postgres_behavior_data.py --env-file ../docker/.env --from-db-id 0

python export_postgres_behavior_data.py --table behavior_feature_records_gt --from-db-id 0


# 이번 실행에서 1000건만
python export_postgres_behavior_data.py --from-db-id 0 --limit 1000
```

### 출력 위치

`--out`을 지정하지 않으면 아래 경로에 타임스탬프 파일로 저장됩니다.

- `services/ai/data/behavior_exports/behavior_trials_YYYYMMDDTHHMMSSZ.jsonl`
