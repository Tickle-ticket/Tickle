# 데이터 수집 계획 (매크로 vs 사람)

**대상**: 김보겸, 임찬혁 + 탐지 모델 담당
**목표**: feature 분포 분석 + ML/DL 학습을 위한 데이터 확보
**Jira**: [AI] 매크로·유저 데이터 수집 계획 수립

---

## 1. 목표 데이터셋

### 1.1 최소 1차 목표 (통계 분석 가능 수준)

| 소스 | 세션 수 | 총 이벤트 수 (예상) | 용도 |
|---|---|---|---|
| `human` (김보겸, 임찬혁, 지인 포함 3~5명) | **30 세션** | ~25만 | 베이스라인. feature 분포 중심값 |
| `pyautogui_lv1` (단순 매크로) | **50 세션** | ~10만 | 매크로 최저 수준 구분력 확인 |
| `pyautogui_lv2` (인간 모방) | **50 세션** | ~25만 | 주요 타겟. 회피형 매크로 |
| `playwright_lv1` | **30 세션** | ~5만 | 브라우저 자동화 비교군 |
| `playwright_lv2` | **30 세션** | ~15만 | 회피형 브라우저 자동화 |

**합계**: 190 세션, 약 80만 이벤트. feature별 히스토그램 + t-test/KS 통계 가능 수준.

### 1.2 확장 목표 (ML/DL 학습 가능 수준)

| 소스 | 추가 | 사유 |
|---|---|---|
| `human` | +70 세션 (총 100) | DL 학습 데이터셋 부족 방지 |
| `pyautogui_lv2` | +150 세션 (총 200) | 핵심 타겟 모델 성능 검증 |
| 기타 | +100 세션 | 장기 변형 패턴 수집 |

확장 시점: 1차 분석 결과가 feature 구분력 확인되면.

---

## 2. 수집 시나리오

### 2.1 매크로 (`run_macro.py`)

**타겟**: `configs/macro_targets/local_login.yaml` (기존) — 로그인 폼 기본
**추가 시나리오 필요** (아직 미작성):
- `ticketing_book.yaml`: index → seat → checkout → done 플로우 (공연 클릭 + 좌석 2개 + 체크박스 + 결제)
- `ticketing_seat_rush.yaml`: 좌석 화면 진입 후 즉시 좌석 클릭 (immediate_post_render 시그널용)

**실행**:
```bash
# 단일 실행
python run_macro.py --type pyautogui --level 2 --target ticketing_book

# 배치 (50회 반복)
python run_macro.py --type pyautogui --level 2 --target ticketing_book --repeat 50
```

**환경**: 데모 서버(`cd demo/demo-api && uvicorn main:app`) 동시 기동. 매크로가 localhost:8000 조작하도록 타겟 URL 설정.

### 2.2 사람 (`record_human.py`)

**실행**:
```bash
python record_human.py --target ticketing_book
# 브라우저 자동 열림 → 자연스럽게 예매 플로우 수행
# F9: 녹화 시작/중지
# F10: 종료
```

**주의사항**:
- **세션당 1회 완전한 예매 플로우** (중간에 멈추지 말 것)
- 마우스/키보드는 평소처럼 (의식적으로 천천히 움직이거나 하지 말 것)
- 여러 기기/브라우저에서 수집 시 **세션 메타에 환경 기록** 필요 (현재 미구현, 향후 session_start 확장)

### 2.3 브라우저 수집 (`demo/`)

데모 서버 기반, 매크로와 사람이 같은 사이트에서 상호작용 → `data/raw/prototype/{session_id}.jsonl`
라벨링은 **수집 후 수동** (파일명/시각 기준으로 human vs macro 구분 → `data/raw/human/` 또는 `data/raw/macro/`로 이동 정리).

향후: 수집 사이트 상단에 "내가 사람입니다 / 매크로입니다" 토글 추가해서 session_start 메타에 라벨 기록하는 방식 고려.

---

## 3. 환경 표준화

feature 분포가 환경 요인으로 오염되지 않도록:

| 요인 | 매크로 | 사람 |
|---|---|---|
| 해상도 | 1920×1080 고정 (`configs/macro.yaml`) | 개인 모니터 OK, session_start 에 기록 |
| DPI | `dpi_aware: true` | 동일 |
| 브라우저 | Chromium headed (Playwright) / OS 커서 (pyautogui) | Chrome/Edge 최신 |
| 백그라운드 작업 | 없음 권장 | 자연스러운 수행 |
| 세션 길이 | 시나리오 1회 (~1~2분) | 동일 |

---

## 4. 일정 (제안)

| 주차 | 작업 |
|---|---|
| 이번 주 | 수집 계획 확정 + 타겟 YAML 2개 작성 + 매크로/사람 파일럿 각 5세션 |
| 다음 주 | 1차 목표 190 세션 전량 수집 → 파일럿 품질 이슈 조정 |
| +2주 | feature별 분포 시각화, t-test/KS/MI 통계 |
| +3주 | 핵심 feature 선별 → ML 베이스라인 |
| +4주 이상 | 확장 목표 수집 병행 + DL 학습 |

---

## 5. 품질 체크리스트

수집 직후 세션 검증 스크립트 (`scripts/verify_session.py` 예정):

- [ ] 이벤트 수 하한 확인 (매크로 500+, 사람 1000+)
- [ ] 세션 시간 범위 확인 (10~300초)
- [ ] 이벤트 타입 커버리지 (click, mousemove, key_*, scroll 최소 포함)
- [ ] session_start 존재
- [ ] 좌표 범위 이탈 없음 (viewport 내)

불합격 세션은 `data/raw/{source}_rejected/` 로 격리.

---

## 6. 라벨 품질

현재 label 지정:
- `label=0` (매크로): `BaseMacro` 가 자동 지정
- `label=1` (사람): `HumanRecorder` 가 자동 지정

**혼동 위험**: 사람이 매크로 실행 직후 녹화기를 켜고 같은 기기를 쓰면 session_id 충돌 없으나, **데이터 폴더 분리** (`data/raw/macro/` vs `data/raw/human/`) 로 카테고리 보장.

브라우저 수집 (`data/raw/prototype/`) 은 label 미기록 상태 — 수집자가 후처리로 라벨 지정.

---

## 7. 현재 자산

- 매크로 코드: ✅ 4종 (`macro/` 하위)
- 사람 레코더: ✅ (`human/recorder.py`)
- 타겟 YAML: ⚠️ `local_login`, `local_search`, `sample_login` 만. 티켓팅 플로우용 미작성
- 데모 사이트: ✅ `demo/front-demo/` (수집 인프라 3-gap fix 완료)
- 수집 샘플: 매크로 5세션, 사람 0세션, 브라우저 3세션 (스모크 테스트 수준)

**다음 작업**:
1. `configs/macro_targets/ticketing_book.yaml` 작성 ([AI] 티켓팅 시나리오 자동 실행 스크립트, 5SP)
2. 사람 파일럿 5회 (이번 주 내)
3. 매크로 파일럿 배치 실행 (이번 주 내)
