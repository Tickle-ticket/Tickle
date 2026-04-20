# pipelines/

실시간 inference 흐름. 의존 방향:

```
preprocess  →  feature  →  routing  →  decision
```

- **preprocess/**: 원시 이벤트 정규화, 세션 단위 버퍼링, 이상치 필터
- **feature/**: 피처 추출 (mouse dynamics, keystroke timing, 이벤트 통계)
- **routing/**: 1차 anomaly 결과에 따라 classifier / high_classifier 중 라우팅
- **decision/**: 최종 판정 (block / warn / pass) + threshold 적용

각 단계는 이전 단계의 출력만 입력으로 받음. 역방향 import 금지.
