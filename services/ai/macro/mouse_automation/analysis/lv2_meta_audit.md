# lv2_collector 인간 데이터 메타 점검

**점검 일자**: 2026-05-03 (ai-feat-294 분석 채팅 Phase 2 사전 점검)
**점검 성격**: read-only. 코드 변경 / 커밋 / 브랜치 변경 없음.

---

## 1. 점검 대상

| 풀 | trial 수 | 사용자 수 | trialId 범위 | 위치 |
|---|---:|---:|---|---|
| lv2_human (보겸) | 51 | 1 (추정) | 900001~909999 의 `label=human` | `services/ai/data/behavior/trial_*.json` |
| balabit human | 500 | 10 (user7, user9, user12, user15, user16, user20, user21, user23, user29, user35) | 910001~910500 | `services/ai/data/behavior/trial_*.json` |
| **합계** | **551** | **11** | — | — |

외부 데이터(`C:\Users\SSAFY\Desktop\external_datasets\`) 는 별도 — Balabit 변환 *원본 CSV* 보관처. trial.json 풀 자체는 자체 수집/변환 결과물.

### 사이드카 / 동반 파일

| 경로 | 존재 | 비고 |
|---|---|---|
| `services/ai/data/behavior/` | ✅ 652 files | trial.json 풀 (사람 551 + 매크로 101) |
| `services/ai/data/raw/human/` | ✅ 55 files | `HumanRecorder` 산출 jsonl 원본. trial 51 보다 4개 많음 (변환 시 누락 가능성) |
| `services/ai/data/raw/macro/` | ✅ 163 files | lv2_collector 등 매크로 jsonl 원본. trial 101 보다 62개 많음 |
| `services/ai/data/macro_run_params.jsonl` | ❌ | collector_api 사이드카 (browser_automation 파이프라인 전용) |
| `services/ai/data/trial_summary.jsonl` / `event_rows.jsonl` / `window_rows.jsonl` | ❌ | 동일 |
| `services/ai/configs/macro.yaml` | ✅ 655 bytes | `screen.base_resolution = [1920, 1080]` 가정 명시 |

→ **trial.json 풀 외에 메타를 더 가진 사이드카는 없음**. raw jsonl 은 트래픽이 더 많지만 메타 필드는 동일 스키마 (EventLogger 출력).

---

## 2. 8 메타 필드 매핑

trial.json 의 `root` / `summary` / `metrics` / `eventRows[*]` 모든 경로를 재귀 검색한 결과.

| 필드 | 직접 존재 | 간접 추정 가능 | 부재 | 비고 |
|---|---|---|---|---|
| `coord_domain` | — | △ `summary.collection_pipeline` 으로 추정: `mouse_automation_lv2` → os_screen, `external_balabit` → 알 수 없음 (Balabit 원본 RDP 좌표) | ✅ | 명시 키 부재 |
| `screen_width` | — | △ `eventRows[*].x` max 로 추정 (lv2 약 2700, Balabit 약 1080) — 정확값 X | ✅ | `configs/macro.yaml` 의 `screen.base_resolution=[1920,1080]` 은 trial 외부 |
| `screen_height` | — | △ `eventRows[*].y` max 로 추정 (lv2 약 1900, Balabit 약 770) — 정확값 X | ✅ | 동일 |
| `normalized_x` | — | △ `event.x / max_x` 후처리로 도출 가능 — eventRows 에 raw int 만 | ✅ | 정규화 키 없음 |
| `normalized_y` | — | △ 동일 | ✅ | 동일 |
| `label` | ✅ `root.label` = `"human"` / `"macro"` | — | — | 정상 직접 존재 |
| `algorithm_type` | — | △ `summary.source` + `summary.collection_pipeline` 조합:<br>• lv2_human: `source="human"`, `collection_pipeline="mouse_automation_lv2"` ⇒ "human_recorder_lv2"<br>• balabit: `source="balabit_dataset"`, `collection_pipeline="external_balabit"` ⇒ "balabit_external"<br>• lv2_macro (참고): `source="pyautogui_lv2_collector"` ⇒ "lv2_collector_bezier" | ✅ | 명시 `algorithm_type` 키 없음 |
| `user_id` | — | △ Balabit 만: `parse_balabit_user(summary.session_id)` (정규식 `^balabit_(user\d+)_`) — 100% 추출 성공 (10명 모두) | ✅ (lv2_human) | lv2 `session_id` 는 uuid hex 12자라 사용자 정보 무관 — 단일 사용자 가정 |

### 직접 존재 vs 간접 추정 vs 부재 요약

| 분류 | 필드 |
|---|---|
| ✅ 직접 존재 (1개) | `label` |
| △ 간접 추정 (5개) | `coord_domain`, `screen_width`, `screen_height`, `algorithm_type`, `user_id` (Balabit 만) |
| ❌ 완전 부재 (3개) | `normalized_x`, `normalized_y`, `user_id` (lv2_human) |

---

## 3. 샘플 발췌

### lv2_human (trialId=900102)

```
root keys: ['label', 'metrics', 'summary', 'trialId']
label    : human
summary  :
  collection_pipeline    : mouse_automation_lv2
  session_id             : 08b60674679f             ← uuid hex 12자
  source                 : human                     ← HumanRecorder 출력
  durationMs             : 13829.52
  clickCount             : 7
  eventCount             : 273
  metrics_compatibility  : {'mouse_hover_dwell_time_ms': 'os_level_substitute'}

eventRows[:3]:
  {ts_ms: 0.314,   event: mouse_click, x: 1542, y: 1092, button: 'left'}
  {ts_ms: 487.666, event: mouse_move,  x: 1541, y: 1092, dx: -1.0, dy:  0.0, dt_ms: 487.352, speed: 0.0021}
  {ts_ms: 502.347, event: mouse_move,  x: 1538, y: 1087, dx: -3.0, dy: -5.0, dt_ms:  14.681, speed: 0.3972}
```

### balabit human (trialId=910001)

```
root keys: ['label', 'metrics', 'summary', 'trialId']
label    : human
summary  :
  collection_pipeline    : external_balabit
  session_id             : balabit_user12_session_2144641057_chunk_001   ← 정규식 파싱 가능
  source                 : balabit_dataset
  durationMs             : 67111.0
  clickCount             : 7
  eventCount             : 300                                            ← chunk_size=300 (균등)
  metrics_compatibility  : {}

eventRows[:3]:
  {ts_ms:   0.0, event: mouse_move, x: 588, y: 283}                        ← 첫 row 는 dx/dy/dt 없음 (정상)
  {ts_ms: 109.0, event: mouse_move, x: 594, y: 256, dx:   6.0, dy: -27.0, dt_ms: 109.0, speed: 0.2537}
  {ts_ms: 218.0, event: mouse_move, x: 583, y: 236, dx: -11.0, dy: -20.0, dt_ms: 109.0, speed: 0.2094}
```

### 두 풀의 키 차이

- **root / summary 키 동일**: 4개 root 키 (`label`, `metrics`, `summary`, `trialId`) 와 7개 summary 키 (`collection_pipeline`, `session_id`, `source`, `durationMs`, `clickCount`, `eventCount`, `metrics_compatibility`)
- **eventRows 키 차이**: lv2_human 은 `button` 키 보유 (mouse_click row 만), Balabit 은 `button` 부재 (Balabit 원본에 button 정보 없거나 변환 시 미보존)
- **metrics 44개 키 동일** (채움률은 다름 — feature_reselection_analysis 의 BALABIT_FILLED_FEATURES 14개 vs lv2 USABLE 16개)

---

## 4. 사용자별 trial 분포

### lv2_human (n=51)

- unique `session_id` 개수: **51 / 51** → 1 trial = 1 session
- 모든 session_id 가 12자 hex 패턴 일치 (`Session.session_id` = `uuid.uuid4().hex[:12]`)
- 사용자 식별 불가 (단일 사용자 가정 = 보겸 1인의 51 세션)
- session_id 샘플 (정렬 앞 5개): `08b60674679f`, `107925a454ff`, `2572e7718951`, `2bb7e2573486`, `2c5e437eabdf`

### balabit human (n=500)

10명 균등 분포 (각 50 trial):

| user_id | trial 수 |
|---|---:|
| user7 | 50 |
| user9 | 50 |
| user12 | 50 |
| user15 | 50 |
| user16 | 50 |
| user20 | 50 |
| user21 | 50 |
| user23 | 50 |
| user29 | 50 |
| user35 | 50 |

→ Balabit 외부 데이터셋의 chunk_size=300 분할 + user 디렉토리 단위 변환 결과 (정규식 `^balabit_(user\d+)_session_` 100% 매칭).

---

## 5. 파일명 / 디렉토리 규칙

### 파일명

`trial_<6자리 trialId>.json` (예: `trial_900142.json`, `trial_910001.json`)

→ collector_api 의 정본 schema (`storage.py:33` 의 `trial_{trial_id:05d}.json`, 5자리) 와 다름. **본 데이터 풀 자체 규칙**으로 6자리 trialId 사용.

### trialId 범위 규칙 (`feature_reselection_analysis.py:83-84` 정합)

| trialId 범위 | 풀 | label | 출처 |
|---|---|---|---|
| 900001~909999 | lv2 | human / macro 혼재 | `mouse_automation_lv2` 파이프라인 (`HumanRecorder` + `lv2_collector`) |
| 910001~910500 | balabit | 모두 human | `balabit_to_trial.py` 변환 산출 |

본 풀 (사람 551) 에 해당하는 trialId:
- lv2_human: 900001~909999 중 51개 (확실한 6자리 매핑은 trial 파일별로 다름)
- balabit: 910001~910500 (500개 연속)

### session_id 규칙

| 풀 | 형식 | 정의 위치 | 사용자 정보 |
|---|---|---|---|
| lv2 | uuid hex 12자 (예: `08b60674679f`) | `core/session.py:18` (`Session.session_id`) | 부재 |
| balabit | `balabit_<user>_<session>_chunk_<NNN>` (예: `balabit_user12_session_2144641057_chunk_001`) | `analysis/balabit_to_trial.py:420` | user prefix 로 추출 |

---

## 6. 발견사항 요약

1. **8 메타 필드 중 직접 존재는 `label` 뿐**. 나머지 7개는 간접 추정 (5개) 또는 완전 부재 (3개) — `coord_domain` / `screen_*` / `normalized_*` 류는 trial.json 어디에도 명시 키가 없음. backfill 의 1순위 후보.

2. **`algorithm_type` 은 `summary.source` + `summary.collection_pipeline` 조합으로 100% 추정 가능** — 별도 키 추가 없이 후처리 mapping 만으로 lv3 메타 호환 가능 (lv2 backward compat 비용 낮음). 단, 명시 키 추가가 분석 편의성에 더 좋음.

3. **`user_id` 는 Balabit 만 추출 가능** (`parse_balabit_user` 100% 성공, 10명 균등 50 trial). lv2_human 51 trial 은 12자 hex session_id 만 보유 — 단일 사용자 가정 깨지면 retroactive 사용자 식별 불가.

4. **사이드카 jsonl (`data/raw/human/`, `data/raw/macro/`) 이 trial.json 보다 더 많은 세션을 보유** (human 55 vs trial 51, macro 163 vs trial 101). 변환 단계에서 누락된 세션이 있고, jsonl → trial 변환 스크립트가 mouse_automation 안에 부재한 사실과 정합. backfill 시 jsonl 원본도 함께 점검 권장.

5. **eventRows 의 `button` 키는 lv2_human 만 보유, Balabit 부재** — Balabit 변환 (`balabit_to_trial.py`) 에서 button 정보 미보존. 마우스 click hold 분석 (mouse_down / mouse_up 분리) 으로 가는 길에 두 풀의 schema 통일 필요.

6. **`screen_width` / `screen_height` 는 eventRows[*].x, y 의 max 로 사후 추정 가능**:
   - lv2_human max x ≈ 2700, max y ≈ 1900 → 듀얼 모니터 또는 고해상도
   - balabit max x ≈ 1080, max y ≈ 770 → RDP 1024×768 추정
   - 정확값은 trial 별 환경 메타가 필요 (현재 `configs/macro.yaml` 의 `screen.base_resolution=[1920,1080]` 은 trial 외부, 실제와 불일치).
