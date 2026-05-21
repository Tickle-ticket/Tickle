# raw — tickle-ticket 매크로 원본 (v2)

매크로 서포트 동료가 작성한 tickle-ticket 오토마우스 v2 원본을 보관하는 자리입니다. v1~v2b 시리즈 중 **v2 (pyautogui 실제 OS 마우스 이벤트)** 본체와 GUI 런처가 들어 있습니다.

본 리포에서는 **학습 데이터 라벨 기준·매크로 동작 흐름 참조용**으로 둡니다. 두 파일의 import path 가 원본 리포(`macro.browser_automation.tickle_ticket.macro_v2`) 기준이라, 이 폴더 안에서 그대로 `python macro.py` 로는 실행되지 않습니다. 실행하려면 원본 환경(private-macro 리포)에서 돌리세요.

> ⚠️ **보안 주의**
> - `macro.py` 의 `Config.login_id` / `Config.login_pw` default 가 **실계정 평문**으로 박혀 있습니다. 그대로 두지 말고 CLI 인자 또는 환경변수로 덮어쓰세요.
> - `gui_macro.py` 가 생성하는 `accounts.json` 은 **ID/PW를 평문으로 저장**합니다. 본 리포 루트 `.gitignore` 에 `services/ai/macro/raw/accounts.json` 을 추가해 두세요 (현재 미등록 상태).
> - 운영/공용 계정 금지. **본인 테스트 계정만** 사용하세요.

---

## `macro.py` — pyautogui 실제 마우스 매크로 v2

**사상**: DOM 조작·페이지 이동은 Playwright, 마우스 이동·클릭은 pyautogui (실제 OS 이벤트). 브라우저 창 스크린 좌표를 JS 로 읽어 viewport(CSS px) → screen(physical px) 좌표를 직접 계산합니다.

### 8단계 흐름 (`TickleMacroV2.run_once`)

1. `step_open` — `TARGET_URL` 접속
2. `step_login` — `/login` 이동(Playwright) → ID/PW 입력·제출(pyautogui)
3. `step_select_event` — 이벤트 카드 클릭 (`--event-index` 로 N번째 선택)
4. `step_click_booking_btn` — `예매하기` 버튼 클릭
5. `step_queue_skip` — `Test: Waitlist Book` 버튼이 있으면 클릭해 대기열 스킵
6. `step_captcha` — Canvas CAPTCHA: `fillText` 후킹으로 숫자 순서·격자 좌표 추출 → 순서대로 pyautogui 클릭
7. `step_booking_flow` — 날짜 `1` + 회차 클릭
8. `step_before_payment` — 결제 페이지 도달만 확인 (**결제는 실행 X**)

### 인간 유사 기법

- **베지어 경로** (`_bezier_path`): 시작/끝 사이에 가우시안 흔들림 컨트롤 포인트 2개를 두고 곡선 이동
- **Fitts' law** (`_fitts_duration`): 이동 거리에 로그 비례하는 이동 시간
- **lognormal delay** (`_lognorm_delay`): 액션 간 대기 시간을 로그정규 분포로
- **클릭 좌표 가우시안 노이즈** (`_add_noise`)
- **Stealth JS**: `navigator.webdriver`/`plugins`/`languages` 위장 + `window.chrome` 주입

### 속도 프리셋 (`PRESETS`)

| 프리셋        | mouse_steps | hover_ms | action_delay_ms | bezier_spread | noise_sigma | 용도          |
| ------------- | ----------- | -------- | --------------- | ------------- | ----------- | ------------- |
| `macro` (기본) | 4           | 10       | 10              | 15            | 1.0         | 거의 즉시     |
| `human_limit` | 12          | 100      | 180             | 55            | 3.0         | 적당히 인간   |
| `human_like`  | 20          | 230      | 340             | 80            | 5.0         | 사람처럼 느림 |

### 주요 CLI 인자

| 인자                        | 기본값                  | 설명                                   |
| --------------------------- | ----------------------- | -------------------------------------- |
| `--url`                     | `TARGET_URL`            | 대상 URL                               |
| `--repeat`                  | `1`                     | 반복 횟수                              |
| `--timeout-ms`              | `20000`                 | Playwright timeout                     |
| `--preset`                  | `macro`                 | `macro` / `human_limit` / `human_like` |
| `--login-id` / `--login-pw` | (코드에 평문 default)   | 로그인 계정 — **반드시 덮어쓰기**      |
| `--event-index`             | `0`                     | 이벤트 목록에서 N번째 카드             |
| `--collector-api-url`       | `http://127.0.0.1:8000` | 실행 직전 `label=macro` 자동 enqueue   |

### 실행 예시 (원본 환경)

```bash
python -m macro.browser_automation.tickle_ticket.macro_v2
python -m macro.browser_automation.tickle_ticket.macro_v2 --repeat 5
python -m macro.browser_automation.tickle_ticket.macro_v2 --preset human_like
```

### 제약

- `headless=False` 고정 (실제 화면 필요), Chromium 창 크기·위치 고정 (`--window-size=1440,900`, `--window-position=50,50`) — DPI/좌표 계산이 이 가정 위에 동작
- `pyautogui.FAILSAFE = True` — 실행 중 마우스를 화면 좌상단으로 보내면 즉시 중단
- DPI 스케일링: `ensure_dpi_aware()` + `get_dpi_scale()` 로 보정. 다중 모니터/스케일 변경 환경은 검증 필요

---

## `gui_macro.py` — 다계정 Tkinter 런처

`macro.py` 의 `run_macro(cfg)` 를 다계정으로 순차 호출해주는 GUI. 같은 폴더의 `accounts.json` 에 계정을 저장합니다.

### `accounts.json` 스키마

```json
{
  "1": { "id": "test01@example.com", "pw": "...", "label": "테스트 계정 01" },
  "2": { "id": "test02@example.com", "pw": "...", "label": "테스트 계정 02" }
}
```

- 키: slot 번호 (`1` ~ `99`)
- `label`: 화면 표시용 별칭 (생략 시 `id`)
- **평문 저장** — 위 보안 주의 참고

### UI 구성

- **좌측**: 계정 목록 (체크박스 다중 선택, `+ 추가` / `수정` / `삭제`, `전체` 토글)
- **우측 상단**: 실행 설정 — `속도 프리셋` / `반복 횟수` / `이벤트 번호` / `Timeout(ms)` / `Collector API`
- **우측 하단**: `선택 계정으로 실행` / `중단` / `로그 지우기` + 실시간 로그 (`run_macro` 의 `stdout` 가로채서 표시)

### 실행 흐름

1. `accounts.json` 로드 → 좌측 목록 렌더
2. 계정 체크 + 설정 입력 후 `선택 계정으로 실행`
3. worker thread 가 선택된 slot 들을 **순차로** 실행:
   - 각 slot 마다 `Config(login_id=acc["id"], login_pw=acc["pw"], ..., **preset_vals)` 생성 → `run_macro(cfg)` 호출
4. `중단` 버튼: `stop_event` 를 set 하지만, **이미 시작된 한 계정 실행은 끝까지 진행되고 그 다음 계정으로 넘어갈 때 멈춥니다** (`run_macro` 내부에서 stop_event 를 보지 않음)

### 실행 예시

```bash
python gui_macro.py
```

import path 가정상 본 리포 그대로는 동작하지 않습니다. 원본 리포에서 패키지 루트 기준으로 실행하세요.

---

## 참고

- v1~v2b 매크로 시리즈 원본: private-macro 리포 (매크로 서포트 동료 관리)
- 본 매크로 실행 시 `--collector-api-url` 로 지정된 collector_api 에 `label=macro` 가 자동 enqueue 됩니다 (`POST /api/labels/enqueue`) — 학습 데이터 수집과 자동 라벨링이 이 경로로 묶입니다.
