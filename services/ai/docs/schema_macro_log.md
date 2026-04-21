# 매크로 실행 로그 포맷 스키마 v1

**대상**: 매크로 개발자 (김보겸, 임찬혁) + 탐지 모델 담당
**상태**: 현재 `utils/logging/event_logger.py` + `macro/base.py` 구현 기준 문서화
**Jira**: [AI] 매크로 실행 로그 포맷 정의 및 스키마 문서화

---

## 1. 개요

모든 매크로(`pyautogui_lv1`, `pyautogui_lv2`, `playwright_lv1`, `playwright_lv2`)와 사람 레코더(`human/recorder.py`)는 **동일한 JSONL 포맷**으로 기록. 이는 매크로/사람 데이터의 feature 계산 로직을 공유하기 위함.

**저장 위치**
- 매크로: `data/raw/macro/{session_id}.jsonl`
- 사람 (pynput 레코더): `data/raw/human/{session_id}.jsonl`
- 브라우저 데모 (pre-prod): `data/raw/prototype/{session_id}.jsonl` (별도 스키마, `docs/schema_session_events.md` 참조)

---

## 2. 이벤트 레코드 구조

파일은 줄당 1 이벤트의 JSONL. 각 레코드 필드:

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `session_id` | string | ✅ | 12자 hex (uuid4 앞부분) |
| `ts_ms` | float | ✅ | 세션 시작 이후 경과 ms (3자리 소수) |
| `event` | string | ✅ | `mouse_move` / `mouse_click` / `mouse_scroll` / `key_down` / `key_up` |
| `source` | string | ✅ | 매크로 식별자: `pyautogui_lv1`, `pyautogui_lv2`, `playwright_lv1`, `playwright_lv2`, `human` |
| `label` | int | ✅ | 0=매크로, 1=사람 (학습 라벨) |
| `x` | int | 조건부 | mouse_* 이벤트 |
| `y` | int | 조건부 | mouse_* 이벤트 |
| `button` | string | 조건부 | click 이벤트: `left` / `right` / `middle` |
| `key` | string | 조건부 | key_* 이벤트: 알파벳/숫자/기호 문자 또는 특수키 이름 (`Enter`, `space`, `backspace` 등) |
| `dx` | float | 자동 | 직전 mouse_* 대비 x 변화 (2자리 소수) |
| `dy` | float | 자동 | 직전 mouse_* 대비 y 변화 (2자리 소수) |
| `dt_ms` | float | 자동 | 같은 `event` 타입 이전 이벤트와의 시간차 (3자리 소수) |
| `speed` | float | 자동 | px/ms (4자리 소수). `sqrt(dx²+dy²) / dt_ms` |

**값이 None인 필드는 JSONL에 기록되지 않음** (크기 절약, `utils/logging/event_logger.py:30`).

---

## 3. 이벤트 타입별 예시

### mouse_move
```json
{"session_id":"3c17f5e40df6","ts_ms":11.236,"event":"mouse_move","x":960,"y":566,"source":"pyautogui_lv1","label":0}
```
- Lv1 (고정 좌표): `x`, `y` 정확히 타겟 좌표
- Lv2 (노이즈+베지어): 경로 중간점 연속 발화, `dx`/`dy`/`speed` 파생
- 사람 (pynput): 10ms 스로틀링 적용 (`human/recorder.py:MOUSE_MOVE_THROTTLE_SEC`)
- 브라우저 (Playwright): 내부 `page.mouse.move`는 기본 단일점, Lv2는 `.moveTo`로 경로 시뮬레이션

### mouse_click
```json
{"session_id":"3c17f5e40df6","ts_ms":31.758,"event":"mouse_click","x":960,"y":566,"button":"left","dx":0.0,"dy":0.0,"dt_ms":20.522,"speed":0.0,"source":"pyautogui_lv1","label":0}
```
- `dt_ms`는 직전 click과의 간격 (inter_click_interval feature 기초)
- PyAutoGUI는 `pyautogui.PAUSE` (기본 0.01s)만큼의 짧은 hold 후 자동 release

### mouse_scroll
```json
{"session_id":"...","ts_ms":...,"event":"mouse_scroll","x":...,"y":...,"source":"human","label":1}
```
- 현재는 스크롤 delta 미기록 (feature C9 `scroll_delta_uniqueness` 구현 시 `dy` 또는 별도 `delta` 필드 추가 예정)

### key_down / key_up
```json
{"session_id":"3c17f5e40df6","ts_ms":545.509,"event":"key_down","key":"t","source":"pyautogui_lv1","label":0}
{"session_id":"3c17f5e40df6","ts_ms":545.609,"event":"key_up","key":"t","source":"pyautogui_lv1","label":0}
```
- 사람 레코더는 key_down/key_up 분리 기록 (feature C11 `key_hold_duration_ms` 계산 가능)
- PyAutoGUI `press()`는 down→up 쌍 둘 다 로그에 남기지만 hold 시간이 거의 0 (~1ms)

---

## 4. 세션 메타 규칙

- `session_id`: `utils/logging/session.py:Session` 에서 `uuid.uuid4().hex[:12]` 으로 생성. 12자 hex 유니크 가정.
- 시간 기준: `time.perf_counter_ns()` 기반. 파일 생성 시점이 아니라 `session.start()` 호출 시점이 ts_ms=0.
- 세션 라이프사이클:
  1. `Session(source=..., label=...)` — id 자동 생성
  2. `session.start()` — `ts_ms` 기준점 설정
  3. 매크로/사람 이벤트 실행 → `EventLogger.log()`
  4. `session.end()` — 종료 시각 기록
  5. `logger.flush()` — 파일에 write
- 버퍼: 100 이벤트 단위 auto-flush (`event_logger.py:96`) + 종료 시 flush

---

## 5. 현재 매크로별 특성

| 매크로 | 평균 이벤트/초 | mouse_move 패턴 | 특징 |
|---|---|---|---|
| `pyautogui_lv1` | 낮음 (~10) | 순간이동 (`duration=0`) → 중간 mouse_move 없음 | 고정 좌표, `interval=0.5s` 일정 |
| `pyautogui_lv2` | 중간 (~100) | 베지어 20개 중간점 + 노이즈 | `min_delay`~`max_delay` 랜덤, `coord_noise_sigma=4` |
| `playwright_lv1` | 낮음 | 브라우저 내부 이벤트 (JS 캡처로 우회 수집) | `selector` 기반, 좌표 없음 |
| `playwright_lv2` | 중간 | 바운딩 박스 내 랜덤 + 베지어 (CDP로 주입) | `page.mouse.move(px,py)` 반복 |
| `human` | 중간 (~60Hz) | 자연 tremor + pynput 10ms 스로틀 | F9 토글 녹화 |

---

## 6. 스키마 확장 계획

현재 필드 외에 향후 C 그룹 feature (docs/feature_research_mouse_macro.md) 구현 시 추가 예정:

| 신규 필드 | 관련 feature | 도입 시점 |
|---|---|---|
| `is_trusted` | C1 event_is_trusted_rate | Sprint 1 (브라우저 수집만) |
| `delta_x`, `delta_y` on scroll | C9 scroll_delta_uniqueness | Sprint 1 |
| `hold_ms` (click/key) | C3, C11 | Sprint 2 (mousedown/mouseup 분리 후) |
| `pointer_type` | C8 | 브라우저 수집만 |

**Non-breaking rule**: 새 필드 추가만 허용, 기존 필드 삭제/개명 금지. feature 계산 코드가 필드 유무로 분기하도록.

---

## 7. 참조

- 구현: `utils/logging/event_logger.py:InputEvent` 데이터클래스 (11~25줄)
- 세션: `utils/logging/session.py:Session` (7~29줄)
- 매크로 기본 클래스: `macro/base.py:BaseMacro`
- 사람 레코더: `human/recorder.py:HumanRecorder`
- 샘플 로그: `data/raw/macro/3c17f5e40df6.jsonl`, `data/raw/human/{session_id}.jsonl`
