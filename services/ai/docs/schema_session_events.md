# 브라우저 세션 이벤트 수집 스키마 v1

**대상**: 프론트엔드 + 백엔드 + 탐지 모델 담당
**기반**: `demo/front-demo/app.js` 현재 구현 + 2026-04-20 인프라 3-gap fix 반영
**Jira**: [AI] 세션 기반 이벤트 수집 스키마 설계

**매크로 내부 로그 스키마는 별도**: `docs/schema_macro_log.md` 참조. 이 문서는 **브라우저에서 수집되는 사용자(또는 매크로가 조작하는 브라우저)의 이벤트** 전용.

---

## 1. 전송 프로토콜

- **엔드포인트**: `POST /log` (`demo/demo-api/routers/collect.py`)
- **Content-Type**: `application/json`
- **Batch 트리거**: 1000ms 간격 또는 이벤트 200개 도달 시 force-flush (`app.js:25-26`)
- **전송 방식**: `fetch` (일반) / `navigator.sendBeacon` (beforeunload/visibility)
- **저장**: `data/raw/prototype/{session_id}.jsonl`. 각 이벤트에 `_url`, `_batch_ts` 메타 필드 자동 추가 (`storage.py:36-38`)

### 1.1 배치 래퍼

```json
{
  "session_id": "sess_1776666473607_4r1gohxl",
  "url": "/mock_pages/seat.html",
  "ts": 1776666473607,
  "events": [ /* 이벤트 배열 */ ]
}
```

| 필드 | 타입 | 의미 |
|---|---|---|
| `session_id` | string | `sess_{epochMs}_{random}`, localStorage 에 persisted |
| `url` | string | 배치 발송 시점의 `location.pathname` |
| `ts` | int | 배치 발송 epoch ms |
| `events` | list[dict] | 아래 이벤트 스키마 배열 |

**백엔드 스키마** (`schemas/raw_event.py:LogPayload`): `events: List[Dict[str, Any]]` permissive — 신규 이벤트 타입 추가 시 백엔드 변경 불필요.

---

## 2. 공통 이벤트 필드

모든 이벤트 레코드의 공통:

| 필드 | 타입 | 의미 |
|---|---|---|
| `t` | float | 페이지 로드 이후 ms (소수). `logger.now()` |
| `type` | string | 이벤트 타입 |

타입별 추가 필드는 아래 섹션.

---

## 3. 이벤트 타입 카탈로그 (15종)

### 3.1 `mousemove`
```json
{"t":123.4,"type":"mousemove","x":100,"y":200}
```
- 10ms 스로틀 (`app.js:MOUSE_MOVE_THROTTLE_MS`)
- preClickBuffer에 별도 push (500ms 링 버퍼, 스로틀과 무관)

### 3.2 `click`
```json
{
  "t":123.4,"type":"click",
  "x":100,"y":200,
  "targetId":"book-E001",
  "targetTag":"A",
  "targetClass":"btn",
  "bbox":{"x":35,"y":250,"w":96,"h":41},
  "offCenterX":16.0,"offCenterY":1.5,
  "preClick300":{"n":6,"avgSpeed":0.11,"speedVar":0.004,"dirChanges":0,"totalDist":6.4},
  "preClick500":{"n":30,"avgSpeed":0.10,"speedVar":0.006,"dirChanges":1,"totalDist":42.1},
  "preClickMoveCount":30
}
```
- `targetId`: 요소의 id, 없으면 `null`
- `bbox`: `getBoundingClientRect()` 결과
- `offCenterX/Y`: click 좌표 - bbox 중심
- `preClick300/500`: 클릭 직전 300/500ms의 경로 요약 5필드 (feature B14/B15)

### 3.3 `scroll`
```json
{"t":123.4,"type":"scroll","scrollY":150,"scrollX":0}
```

### 3.4 `keydown`
```json
{"t":123.4,"type":"keydown","key":"Enter","code":"Enter"}
```
⚠️ 현재 `keyup` 미수집 — feature C11 `key_hold_duration_ms` 구현 시 추가 예정.

### 3.5 `focus` / `blur` (focusin/focusout 기반)
```json
{"t":123.4,"type":"focus","targetId":"agree-1","targetTag":"INPUT"}
{"t":135.6,"type":"blur","targetId":"agree-1","targetTag":"INPUT"}
```

### 3.6 `mouse_enter` / `mouse_leave` **(2026-04-20 Fix 1)**
```json
{"t":123.4,"type":"mouse_enter","targetId":"seat-A1","targetTag":"DIV"}
{"t":145.6,"type":"mouse_leave","targetId":"seat-A1"}
```
- **id 있는 요소만 기록**. `closest('[id]')` 로 부모 중 가장 가까운 id 요소 타겟팅.
- 같은 id 요소 내부 이동 시 중복 발화 안 함 (`currentHoverId` 상태 추적)
- feature A13 `pre_click_hover_time_ms`, B11 `mouse_hover_dwell_time_ms` 기초 데이터

### 3.7 `visibility` (IntersectionObserver)
```json
{"t":123.4,"type":"visibility","targetId":"book-E002","targetTag":"A","visible":true,"ratio":0.433}
```
- threshold `[0, 0.5, 1]` — 3개 임계값에서 발화
- feature A2 `time_from_element_visible_to_click_ms` 기초

### 3.8 `render` (MutationObserver `childList`) **(2026-04-20 Fix 2)**
```json
{"t":123.4,"type":"render","targetId":"seat-C3","targetTag":"DIV"}
```
- **id 있는 노드만 기록** (Fix 2-B로 필터링)
- 외부 script가 `<body>` 최상단에 위치해서 observer가 inline script보다 먼저 부착되도록 함 (Fix 2-A)
- feature A15 `immediate_post_render_click_rate` 기초

### 3.9 `disabled_change`
```json
{"t":123.4,"type":"disabled_change","targetId":"btn-pay","targetTag":"BUTTON","disabled":false}
```
- feature A3 `time_from_element_clickable_to_click_ms` 기초

### 3.10 `class_change`
```json
{"t":123.4,"type":"class_change","targetId":"seat-C3","targetTag":"DIV","className":"seat selected"}
```

### 3.11 `session_start`
```json
{
  "t":0.4,"type":"session_start",
  "url":"http://localhost:8000/mock_pages/seat.html",
  "userAgent":"...",
  "viewport":{"w":1440,"h":765},
  "dpr":2
}
```

---

## 4. 생명주기

```
페이지 로드
  └─ <body> 최상단 <script> 실행 (Fix 2-A 이후):
       event_logger.js → logger 전역 객체 생성
       app.js:
         - IIFE 시작
         - document.body 에 모든 리스너 부착
         - MutationObserver 부착 (좌석 생성 전에 부착되어 render 캡처 가능)
         - session_start 이벤트 기록
  └─ <body> 나머지 파싱
  └─ inline <script> 실행 (seat.html: 좌석 40개 생성 → render 이벤트 40건 발화)
  └─ 사용자 상호작용 → 모든 리스너가 이벤트 기록
  └─ 1000ms 마다 flush() → POST /log
  └─ beforeunload / visibilitychange(hidden) 시 sendBeacon 으로 마지막 flush
```

---

## 5. 전처리 규칙 (수집 후 파이프라인)

raw JSONL 은 그대로 두고, feature 계산 전 다음 필터/변환 적용:

### 5.1 label 중복 제거
`<label><input></label>` 구조에서 1ms 간격 이중 click 발생. `pipelines/preprocess/dedupe.py:dedupe_label_clicks()` 으로 LABEL click 중 INPUT click 바로 뒤에 오는 것 제거.

### 5.2 향후 추가 예정
- 매진 좌석 (`pointer-events: none`) 클릭 복원: bbox 로 역산 (feature A10 false negative 개선)
- dt_ms, speed 파생 (macro log 처럼): `pipelines/preprocess/derive.py` 예정
- 페이지 단위 분할: `pipelines/preprocess/session_split.py` 예정

---

## 6. 버전 히스토리

| 버전 | 변경 | 일자 |
|---|---|---|
| v0 | feature_definitions_v0.md §2 초안 | 2026-04-20 |
| **v1** | Fix 1 (mouse_enter/leave 이벤트 추가), Fix 2 (render id 필터 + script 순서), Fix 3 (label dedup 파이프라인). 정식 문서화. | 2026-04-20 |

---

## 7. 참조

- 프론트: `demo/front-demo/app.js` (177줄), `event_logger.js`
- 백엔드: `demo/demo-api/routers/collect.py`, `services/storage.py`, `schemas/raw_event.py`
- 전처리: `pipelines/preprocess/dedupe.py`
- 원본 feature 매핑: `docs/feature_definitions_v0.md`
- OS 레벨 매크로 확장 feature: `docs/feature_research_mouse_macro.md`
