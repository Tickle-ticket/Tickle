# Shadow 모드 확장 포인트 설계

**대상**: 탐지 모델 담당 + 운영 담당
**Jira**: [AI] shadow 모드 확장 포인트 설계 및 문서화

---

## 1. Shadow 모드란

**정의**: 프로덕션 트래픽에 대해 모델이 판정은 내리지만 **판정 결과로 실제 차단은 하지 않는** 모드. 실제 차단은 기존 규칙 기반 로직이 담당하고, 모델은 "만약 내가 차단했다면 어땠을까"를 기록만 함.

**목적**:
- 오프라인 metric 과 실제 트래픽 판정 간 차이 발견
- 모델이 블록할 뻔한 사람/허용할 뻔한 매크로 케이스 분석
- 점진적 롤아웃 준비 (shadow → 1% → 10% → 100%)

---

## 2. 시스템 아키텍처

```
[클라이언트 브라우저]
      │  session events (JSON)
      ▼
[serving/ API]  ────────┬─── [production rule engine]  ── 실제 허용/차단 결정
                        │                                        │
                        │ (동일 입력 fork)                       │
                        ▼                                        │
              [shadow_mode/runner]                               │
                        │                                        │
                        ▼                                        │
              [pipelines (preprocess → feature → routing → decision)]
                        │                                        │
                        ▼                                        │
              [models (anomaly / classifier / high_classifier)]  │
                        │                                        │
                        ▼                                        │
              [shadow_mode/analyzer]  ←  [production 결과] ◀─────┘
                        │
                        ▼
             diff 기록: (session_id, prod_decision, shadow_decision, features, model_score)
```

---

## 3. 확장 포인트

### 3.1 `shadow_mode/runner.py` (미구현, 이번 sprint 제작 예정 아님)

**책임**: 프로덕션 요청 처리 이후 비동기로 shadow 판정 실행

**인터페이스 제안**:
```python
from typing import Dict

def run_shadow(session_id: str, events: list[dict], prod_decision: str) -> Dict:
    """shadow 판정 실행. prod 결정을 알고 있으되 영향 주지 않음.

    Returns:
        {
            "session_id": str,
            "prod_decision": "allow" | "block" | "challenge",
            "shadow_decision": "allow" | "block" | "challenge",
            "features": dict,         # 계산된 feature 벡터
            "model_scores": dict,     # {"anomaly": 0.82, "classifier": 0.67, ...}
            "latency_ms": float,
            "ts": int
        }
    """
```

**제약**:
- prod 응답 대기 차단 안 함 (비동기 큐 사용)
- 지연된 파이썬 인프런스가 prod 메트릭에 영향 주지 않도록 별도 worker / FastAPI BackgroundTasks

### 3.2 `shadow_mode/analyzer/` (미구현)

**책임**: shadow runner 로그를 집계하여 다음 생성

- **혼동행렬**: `(prod_decision × shadow_decision)` 빈도 테이블
- **이견 케이스 드릴다운**: prod=allow + shadow=block 은 "모델이 과하게 차단하려 함". prod=block + shadow=allow 는 "모델이 놓침"
- **feature 분포 비교**: shadow_decision 이견 그룹 간 feature 평균/분산
- **주간 리포트**: 자동 생성 HTML (`evaluation/shadow_weekly.html`)

### 3.3 기존 확장 포인트

| 위치 | 현재 상태 | Shadow 모드 훅 |
|---|---|---|
| `serving/middleware/` | 미작성 (scaffolding) | 프로덕션 요청 fork 미들웨어 추가 위치 |
| `serving/api/` | 미작성 | 메인 라우터와 shadow 라우터 분기 |
| `pipelines/decision/` | 미작성 | decision 결과 두 번 실행 가능하도록 pure function 유지 |
| `integrations/db/` | 미작성 | shadow 결과 저장 (prod DB 분리) |

---

## 4. 데이터 흐름 요구사항

Shadow 모드가 의미 있으려면 **prod 요청과 shadow 요청의 입력이 동일해야 함**. 아래 제약:

1. **이벤트 timestamp 기준 일관**: `t` (페이지 로드 이후 ms) 그대로 유지. shadow가 재계산 시 실제 시간(now) 아닌 raw event time 사용.
2. **feature 계산 idempotent**: 같은 raw 에 대해 항상 같은 feature 벡터. `pipelines/preprocess` 와 `pipelines/feature` 는 순수 함수로 유지.
3. **모델 버전 명시**: 각 shadow 로그에 `model_version` 기록. A/B 비교용.

---

## 5. 메트릭 (shadow 기간 중 추적)

| 메트릭 | 정의 | 액션 기준 |
|---|---|---|
| **False Alarm Rate** | prod=allow ∩ shadow=block 비율 | 1% 이상이면 threshold 재조정 |
| **Miss Rate** | prod=block ∩ shadow=allow 비율 | 5% 이상이면 모델 개선 필요 |
| **Agreement** | prod와 shadow 일치율 | > 90% 면 롤아웃 검토 |
| **Latency** | shadow 인퍼런스 p50/p99 | p99 > 500ms 면 최적화 |
| **Distribution drift** | feature 분포가 학습 시와 다른지 (PSI) | PSI > 0.2 면 재학습 |

---

## 6. 구현 순서 (향후)

1. **Phase A (현재)**: `shadow_mode/` 폴더 삭제됨 (폴더 리팩토링에서 정리). 첫 구현 시 재생성.
2. **Phase B**: serving API 가 동작 시작하면 `shadow_mode/runner.py` 뼈대 생성. pure function 기반 파이프라인 이미 `pipelines/` 에 있으므로 호출 래퍼만 필요.
3. **Phase C**: `shadow_mode/analyzer/` 추가. 주간 HTML 리포트 자동화.
4. **Phase D**: prod 쪽에 fork 미들웨어 부착. 10%→100% 점진 적용.

**현재 sprint 목표**: 설계 문서만. 구현 코드는 쓰지 않음.

---

## 7. 관련 문서

- 시스템 전체: `README.md`
- 파이프라인 흐름: `pipelines/README.md` (preprocess → feature → routing → decision)
- 모델 계획: `models/README.md`, `evaluation/README.md`
- MLOps 책임 (shadow 모니터링 포함): `mlops/README.md`
