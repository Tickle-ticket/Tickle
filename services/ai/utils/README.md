# `services/ai/utils` 사용법

이 폴더는 **행동 데이터(JSON/JSONL) 전처리/변환**을 위한 간단한 유틸 스크립트 모음입니다.

## 실행 방법

아래 둘 중 아무 방식이나 사용 가능합니다.

- **직접 실행(권장, 가장 단순)**: `python services/ai/utils/<script>.py ...`
- **모듈 실행**: `python -m services.ai.utils.<script> ...`

> 예시는 모두 저장소 루트(`S14P31A203`)에서 실행한다고 가정합니다.

---

## 1) `jsonl_to_json.py`

### 목적
- `.jsonl`(한 줄에 JSON 1개) 파일을 **JSON 배열 `.json`**로 변환
- 또는 `.jsonl`의 각 레코드를 **`trial_00001.json` 같은 파일들로 분리 저장**

### A. JSONL → JSON(배열)
```bash
python services/ai/utils/jsonl_to_json.py path/to/input.jsonl
```

- 출력 파일 기본값: `input.jsonl`과 같은 폴더에 `input.json`

원하는 출력 경로 지정:
```bash
python services/ai/utils/jsonl_to_json.py path/to/input.jsonl -o path/to/output.json
```

컴팩트(JSON 줄바꿈/indent 없음):
```bash
python services/ai/utils/jsonl_to_json.py path/to/input.jsonl --compact
```

### B. JSONL → trial_XXXXX.json 파일들
```bash
python services/ai/utils/jsonl_to_json.py path/to/input.jsonl --files
```

- 출력 폴더 기본값: `input` 파일명에서 확장자 제거한 폴더  
  예) `data_g2.jsonl` → `data_g2/` 폴더 생성

출력 폴더 지정:
```bash
python services/ai/utils/jsonl_to_json.py path/to/input.jsonl --files --out-dir path/to/out_dir
```

DB export 형태를 trial 형태로 정규화(기본 동작):
- 입력 레코드에 `features`가 있으면 아래처럼 변환해서 저장합니다.
  - `trialID`/`trialId` → `trialId`
  - `features` → `metrics`
  - `summary`/`label` 등은 유지

정규화 없이 DB shape 그대로 저장:
```bash
python services/ai/utils/jsonl_to_json.py path/to/input.jsonl --files --keep-db-shape
```

---

## 2) `split_by_label.py`

### 목적
행동 데이터 파일(또는 `trial_*.json` 폴더)을 **label 기준으로 human/macro로 분리**합니다.

### A. 입력이 파일(`.json` / `.jsonl`)인 경우
```bash
python services/ai/utils/split_by_label.py path/to/data.json
```

- 출력 기본 경로: `services/ai/data`
- 폴더명 기본 prefix는 입력 파일/폴더명에서 자동 유추합니다.
  - 예) `data_g2.json` → `services/ai/data/data_g2_human/`, `services/ai/data/data_g2_macro/`

출력 포맷을 JSONL로:
```bash
python services/ai/utils/split_by_label.py path/to/data.jsonl --format jsonl
```

label 필드가 다른 키에 있는 경우(예: `summary.label` 말고 `meta.label`):
```bash
python services/ai/utils/split_by_label.py path/to/data.json --label-key meta.label
```

알 수 없는 라벨은 스킵(에러 대신 무시):
```bash
python services/ai/utils/split_by_label.py path/to/data.json --skip-unknown-labels
```

분리할 라벨 목록 지정(기본: `human,macro,allow,block`):
```bash
python services/ai/utils/split_by_label.py path/to/data.json --labels human,macro,allow,block
```

### B. 입력이 디렉토리(`trial_*.json` 파일들)인 경우
```bash
python services/ai/utils/split_by_label.py path/to/trials_dir
```

- 동작: `trial_*.json`들을 읽어서 `.../<prefix>_human/`, `.../<prefix>_macro/`로 **복사(copy)** 합니다.
- 디렉토리 입력의 기본 출력 위치: 입력 디렉토리의 부모 폴더

출력 루트/프리픽스 지정:
```bash
python services/ai/utils/split_by_label.py path/to/trials_dir --output-root path/to/out --dataset-prefix data_g9
```

---

## 3) `preprocessing_features.py`

### 목적
`metrics`(또는 `windowRows`) 안에 들어있는 문자열 피처

- `pre_click_mouse_path_pattern_300ms`
- `pre_click_mouse_path_pattern_500ms`

를 숫자 피처로 **백필(backfill)** 합니다.

예)
- `"12.3px | straight 0.98"` →
  - `pre_click_path_300ms_total_distance_px = 12.3`
  - `pre_click_path_300ms_straightness = 0.98`

### 사용 예시

Dry-run(기본): 변경 대상만 집계하고 파일은 안 건드림
```bash
python services/ai/utils/preprocessing_features.py --data-dir services/ai/data/data_g2_human
```

원본을 직접 수정:
```bash
python services/ai/utils/preprocessing_features.py --data-dir services/ai/data/data_g2_human --in-place
```

변환 결과를 다른 폴더에 복사로 저장(원본 유지):
```bash
python services/ai/utils/preprocessing_features.py --data-dir services/ai/data/data_g2_human --output-dir services/ai/data/data_g2_human_backfilled
```

`windowRows`까지 같이 변환:
```bash
python services/ai/utils/preprocessing_features.py --data-dir services/ai/data/data_g2_human --in-place --include-window-rows
```

이미 값이 있는 derived feature도 덮어쓰기:
```bash
python services/ai/utils/preprocessing_features.py --data-dir services/ai/data/data_g2_human --in-place --overwrite
```

raw 문자열 컬럼도 유지:
```bash
python services/ai/utils/preprocessing_features.py --data-dir services/ai/data/data_g2_human --in-place --keep-raw
```

---

## 4) `split_by_version.py`

### 목적
`.jsonl` 파일들이 들어있는 폴더를 입력받아, 각 레코드의 feature 값 유무로 **v1/v2로 분리**해서 `.json` 파일로 저장합니다.

- 기준 feature(기본값): `time_from_element_clickable_to_click_ms`
  - 값이 `null`/`None` → `v1`
  - 값이 있으면(not `None`) → `v2`

### 사용 예시
```bash
python services/ai/utils/split_by_version.py path/to/jsonl_dir
```

결과(기본):
- 입력 폴더가 `foo`이면, 같은 부모 폴더에
  - `foo_v1/`
  - `foo_v2/`
  가 생성되고 그 안에 레코드별 `.json`이 저장됩니다.

feature 키 변경:
```bash
python services/ai/utils/split_by_version.py path/to/jsonl_dir --feature-key time_from_element_clickable_to_click_ms
```

출력 루트 변경:
```bash
python services/ai/utils/split_by_version.py path/to/jsonl_dir --output-root path/to/out_root
```

---

## 5) `split_by_type.py`

### 목적
`trial_*.json`(또는 `*.json`) 디렉토리를 입력받아 `stage/type` 값 기준으로 폴더를 나눕니다.

지원 키(기본 동작):
- `stage` 우선
- 없으면 `type`, `summary.stage`, `summary.type`도 자동으로 시도

타입 정규화:
- `DETAIL` / `CAPTCHA` / `BOOKING` (대소문자 상관없음)
- 값에 해당 토큰이 포함되어 있으면 그 토큰으로 매핑 (예: `DETAIL_STAGE` → `detail`)

기본 출력 구조:
- 입력이 `.../data_v1`라면 내부에 `type_<stage>/` 폴더들을 생성

### 사용 예시
```bash
python services/ai/utils/split_by_type.py path/to/trials_dir
```

type key 변경(도트 키 지원):
```bash
python services/ai/utils/split_by_type.py path/to/trials_dir --type-key summary.stage
```

허용 타입을 제한:
```bash
python services/ai/utils/split_by_type.py path/to/trials_dir --types detail,captcha,booking
```

---

## 6) `process_jsonl_dataset.py`

### 목적
원본 `.jsonl` 폴더 하나를 입력하면 아래를 **한 번에** 수행해서 최종 폴더 구조로 저장합니다.

Pipeline:
1. jsonl → (row별) trial json 변환
2. 버전 분리(v1/v2): `time_from_element_clickable_to_click_ms`가 `null`이면 v1, 값 있으면 v2
3. type 분리(stage): `stage`(없으면 `summary.stage`) 값으로 `type_<stage>` 폴더 생성
4. label 분리: `label`(없으면 `summary.label`) 값으로 `label_<label>` 폴더 생성

출력 구조(기본):
```
<output_root>/<원본디렉토리명>_v1/DETAIL/ALLOW/trial_XXXXX.json
<output_root>/<원본디렉토리명>_v2/CAPTCHA/BLOCK/trial_XXXXX.json
```

정규화 규칙:
- type(stage): `DETAIL`, `CAPTCHA`, `BOOKING`으로 정규화
- label: `ALLOW/BLOCK`으로 정규화
  - `human/allow` → `ALLOW`
  - `macro/block` → `BLOCK`

### 사용 예시
```bash
python services/ai/utils/process_jsonl_dataset.py path/to/jsonl_dir
```

출력 루트 변경:
```bash
python services/ai/utils/process_jsonl_dataset.py path/to/jsonl_dir --output-root services/ai/data
```

버전 기준 feature 변경:
```bash
python services/ai/utils/process_jsonl_dataset.py path/to/jsonl_dir --version-feature-key time_from_element_clickable_to_click_ms
```
