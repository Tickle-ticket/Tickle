# evaluation/

모델 성능 평가 + 실험 기록. `tests/`는 코드 동작 검증, 여기는 **모델 품질 검증**.

예정 서브 구조:

- `metrics/` — precision, recall, F1, ROC, confusion matrix 계산 코드
- `threshold/` — 판정 threshold 탐색 (ROC-based, FPR 제약 등)
- `experiments/{anomaly, classifier, high_classifier}/` — 모델별 실험 노트북/스크립트 + 결과 로그

실험 결과는 각 서브 폴더 내 `results/` 또는 `mlflow` 등 외부 트래커로.
