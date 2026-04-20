# ai-macro-detection

티켓팅 매크로 탐지 AI 시스템.

## 폴더 구조

```
macro/                — 공격 측 매크로 데이터 생성
  browser_automation/   Playwright 기반 (요소 직접 클릭)
  mouse_automation/     PyAutoGUI 기반 (좌표/노이즈/베지어)
  _config.py            매크로 YAML 로더
  base.py               BaseMacro 추상 클래스

human/                — 정상 유저 데이터 수집 (pynput)

configs/              — YAML 설정
  macro.yaml            매크로 전역 설정
  macro_targets/        타겟 시나리오별 YAML

data/                 — 수집된 원본/전처리 데이터 (gitignored)
  raw/{human,macro,prototype}/
  processed/

demo/                 — 데이터 수집 데모 (FastAPI + 프론트)
  demo-api/             이벤트 수집 API
  front-demo/           티켓팅 시뮬레이션 UI

pipelines/            — 실시간 inference 흐름
                        preprocess → feature → routing → decision
models/               — 모델 정의 (anomaly / classifier / high_classifier)
evaluation/           — 모델 성능 평가 + 실험
serving/              — 운영 API 서버
mlops/                — 학습 자동화 + 모니터링
shadow_mode/          — shadow 모드 검증 (미작성)
integrations/         — DB / Redis 연동 (미작성)
offline_analysis/     — 오프라인 분석 / 클러스터링 (미작성)

utils/logging/        — Session, EventLogger (공유 유틸)
schemas/              — Pydantic 모델 정의
tests/                — 코드 동작 검증

docs/                 — 기술 문서 + POC
  feature_definitions_v0.md
  poc/mouse/           마우스 제어 PoC (pyautogui, pynput, interception)
```

## 실행

### 매크로 실행 (공격 데이터 생성)

```bash
python run_macro.py --type pyautogui --level 1 --target local_login
python run_macro.py --type pyautogui --level 2 --target local_login --repeat 10
python run_macro.py --type playwright --level 1 --target local_login
```

### 사람 데이터 녹화

```bash
python record_human.py --target local_login
# F9: 녹화 시작/중지, F10: 종료
```

### 데모 서버 (수집용 웹)

```bash
cd demo/demo-api && uvicorn main:app --reload --port 8000
# 브라우저에서 demo/front-demo/index.html 열기
```

## 협업

- 데이터 (`data/`)는 gitignored. 각자 로컬에서만 관리.
- 학습 완료된 모델 가중치도 `.gitignore` 등록 (`models/**/*.pkl` 등).
- 새로운 top-level 폴더 추가 시 이 README 먼저 수정.
