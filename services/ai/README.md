# services/ai — 마우스 직접 제어형 매크로 개발

매크로 탐지 AI 시스템의 AI 파트. 이 MR (#110) 은 **"티켓팅 시나리오 자동 실행 스크립트 개발 (5 SP)"** 스토리를 포함하며, 매크로 개발 에픽 전체 (스토리 122/123/125/138/110) 를 함께 담고 있음.

## 스토리 범위

| 스토리 | 산출물 |
|---|---|
| #122 마우스 제어 라이브러리 PoC | `docs/poc/mouse/` (README + poc_*.py) |
| #123 베지어 곡선 궤적 생성기 | `macro/mouse_automation/mouse_utils.py::bezier_curve` |
| #125 human-like 속도·jitter 프로파일 | `macro/mouse_automation/mouse_utils.py::add_noise, random_delay, human_like_duration` + Lv2 적용 |
| #138 매크로 실행 로그 스키마 문서화 | `docs/schema_macro_log.md` |
| **#110 티켓팅 시나리오 자동 실행** | `automouse.py` (GUI 시퀀스 매크로) + `summarize_sessions.py` (검증) + label 스키마 개선 |

## 폴더 구조

```
macro/                       매크로 구현
  base.py                    BaseMacro 추상 클래스 (세션/로깅 공통 처리)
  _config.py                 YAML 설정 로더
  mouse_automation/          PyAutoGUI 기반 (OS 레벨 마우스 제어) — 김보겸 담당
    pyautogui_lv1.py         Lv1 — 고정좌표 즉시이동 (baseline)
    pyautogui_lv2.py         Lv2 — 베지어 + 노이즈 (회피 시도)
    mouse_utils.py           베지어 곡선 + 노이즈 + Fitts 타이밍 유틸
    _dpi.py                  Windows DPI 인식 (pyautogui import 전 설정)
  automouse/                 Tkinter GUI 매크로 도구 — 김보겸 담당 (2026-04-21 신설)
    automouse.py             GUI + 시퀀스 저장 + EventLogger 연동
    automouse_data.json      사용자 로컬 슬롯 저장 (gitignored)
  browser_automation/        Playwright 기반 (브라우저 자동화) — 임찬혁 담당

configs/
  macro.yaml                 매크로 전역 설정 (해상도, Lv1/Lv2 파라미터)
  macro_targets/             타겟 시나리오 YAML (local_login 등)

utils/logging/               모든 매크로/사람이 공유하는 세션 + JSONL 로거
  session.py                 Session (source, label, session_id)
  event_logger.py            EventLogger (JSONL 출력, dx/dy/speed 자동 계산)

run_macro.py                 매크로 실행 CLI
summarize_sessions.py        수집 결과 배치 단위 품질 통계 — #110 검증 도구

docs/
  schema_macro_log.md        #138 산출물 — JSONL 이벤트 포맷 스키마
  poc/mouse/                 #122 산출물 — 마우스 제어 라이브러리 PoC 코드
```

## 실행

### 매크로 데이터 수집 (2가지 방법)

**방법 1: YAML 타겟 기반 반복 실행** (고정 시나리오, run_macro.py)
```bash
cd services/ai
python run_macro.py --type pyautogui --level 1 --target local_login --repeat 50
python run_macro.py --type pyautogui --level 2 --target local_login --repeat 50
```

**방법 2: GUI 기반 사용자 정의 시퀀스** (#110 에서 실제 티켓팅 수집에 사용한 방법)
```bash
python macro/automouse/automouse.py
# → 탭2 "시퀀스 매크로" → "➕ 추가" → "좌표 캡처 모드" 로 각 요소 좌표 수집
# → F1 (또는 "▶ 매크로 실행") 버튼으로 실행 → data/raw/macro/{session_id}.jsonl 자동 로그
# → 배치 반복은 F1 연타 또는 "매크로 실행" 버튼 반복
```

두 방법 모두 동일한 `utils/logging/` 경유 → **동일한 JSONL 포맷**으로 저장됨 (`docs/schema_macro_log.md`).

### 수집 품질 검증

```bash
python summarize_sessions.py --label macro   # 매크로 세션 요약
python summarize_sessions.py --label human   # 사람 세션 (별도 MR 에서 추가)
python summarize_sessions.py --batch 10      # 10개 단위 배치 통계
```

출력: 세션 수, 평균 이벤트 수, 완주율, 짧은 세션(노이즈) 비율 등.

## 데이터 저장

- `data/raw/macro/{session_id}.jsonl` — 매크로 세션
- `data/raw/human/{session_id}.jsonl` — 사람 세션 (별도 에픽)
- 모두 `.gitignore` 로 제외 — 각자 로컬 보관

### 라벨 스키마 (2026-04-21 변경)

- **이전**: `label: int (0=macro, 1=human)`
- **현재**: `label: str ("macro" | "human")` — 가독성 개선
- EventLogger 의 저장 폴더도 label 문자열 따라 자동 분기 (`data/raw/{label}/`)

## 주의 (기술 스택 경계)

- `macro/mouse_automation/` = PyAutoGUI 기반 OS 레벨 — **이 MR 담당 (김보겸)**
- `macro/browser_automation/` = Playwright 기반 브라우저 자동화 — **별도 브랜치 (임찬혁)**
- 공통 `macro/base.py`, `utils/logging/`, `configs/macro.yaml` 등은 두 담당자 변경 시 서로 공지 권장
