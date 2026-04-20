# models/

모델 정의 (아키텍처, forward, predict). 학습 로직은 `training/`이 아니라 여기에 모델 정의만 둠.

예정 서브 구조:

- `anomaly/` — 1차 이상 탐지 (Isolation Forest, AE, LOF 등)
- `classifier/` — 2차 매크로/사람 분류 (LightGBM, RF)
- `high_classifier/` — 회피형 매크로 고난이도 판별 (딥러닝)
- `common/` — 공통 레이어, 임베딩, loss

첫 모델 추가 시 해당 서브 폴더 생성.

**가중치 저장**: `.pkl`, `.pt`, `.joblib`, `.onnx`, `saved/`, `checkpoints/` — 모두 `.gitignore` 등록됨.
