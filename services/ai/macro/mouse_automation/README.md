# mouse_automation

PyAutoGUI / pynput 기반의 마우스·키보드 매크로와 데이터 수집·녹화·분석 패키지. ML 매크로 분류 모델 학습용 라벨 데이터(`macro` / `human`) 생성을 지원한다.

## 폴더 구조

| 폴더 | 역할 |
|---|---|
| `core/` | 공통 인프라 — 설정 로더(`_config`), `BaseMacro`, `EventLogger`, `Session`, 마우스 유틸(베지어/노이즈/Fitts), DPI 처리(`_dpi`) |
| `runner/` | 매크로 실행기 — `pyautogui_lv1`(즉시이동·기본), `pyautogui_lv2`(베지어+가우시안 노이즈+Fitts 타이밍), 통합 CLI(`run_macro`) |
| `collector/` | 매크로 데이터 수집기 — yaml 없이 코드 내부 액션으로 풍부한 mouse_move 생성(`lv2_collector`) |
| `recorder/` | 사람 행동 녹화기 — pynput 글로벌 캡처, 첫 클릭 자동 시작 / F10 종료(`human_recorder`) |
| `analysis/` | 분석 도구 — 세션 jsonl 배치 단위 요약(`summarize_sessions`), 외부 데이터셋 변환(`balabit_to_trial`) |

## 실행

cwd = `services/ai/`

```bash
# 매크로 실행 (yaml 타겟 기반)
python -m macro.mouse_automation.runner.run_macro --type pyautogui --level 2 --target local_login

# 매크로 데이터 수집 (yaml-free, 1회 실행 = 1세션)
python -m macro.mouse_automation.collector.lv2_collector --sessions 30 --seed 42

# 사람 행동 녹화 (첫 클릭에 자동 시작, F10 종료)
python -m macro.mouse_automation.recorder.human_recorder --target local_login
python -m macro.mouse_automation.recorder.human_recorder --url http://localhost:8080

# 수집 세션 요약 (배치)
python -m macro.mouse_automation.analysis.summarize_sessions --label macro --batch 10

# Balabit 외부 데이터셋 → trial.json 변환 (분포 다양성 보강용)
python -m macro.mouse_automation.analysis.balabit_to_trial --dry-run
python -m macro.mouse_automation.analysis.balabit_to_trial
```

## 산출물

- `data/raw/macro/{session_id}.jsonl` — 매크로 세션 (lv1/lv2/lv2_collector)
- `data/raw/human/{session_id}.jsonl` — 사람 녹화 세션
- `data/behavior/trial_91xxxx.json` — Balabit 외부 데이터셋 변환 결과 (label=human)
- 모두 gitignore 대상.
