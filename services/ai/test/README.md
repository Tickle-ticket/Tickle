# Offline Model Performance Test

`trial_*.json` 테스트 데이터 폴더를 받아서 저장된 `model.joblib` + `meta.json` 모델의 성능을 평가합니다.
테스트 코드는 feature를 새로 파생하지 않고 `trial.metrics`에 있는 값을 그대로 읽습니다.
raw `pre_click_mouse_path_pattern_*` 데이터를 numeric `pre_click_path_*` feature로 바꿔야 하면 먼저 `services/ai/utils/backfill_pre_click_path_features.py`를 실행하세요.

## Run

경로는 기본적으로 `performance_test.yaml`에서 관리합니다.

```bash
python services/ai/test/run_performance_test.py
```

기본 출력:

- `test/output/metrics.json`
- `test/output/predictions.jsonl`
- `test/output/plots/evaluation_summary.png`
- `test/output/plots/confusion_matrix.png`
- `test/output/plots/score_distribution.png`

설정 파일을 따로 쓰려면:

```bash
python services/ai/test/run_performance_test.py --config services/ai/test/performance_test.yaml
```

CLI 인자는 설정값을 임시로 덮어쓸 때만 사용합니다.

```bash
python services/ai/test/run_performance_test.py --threshold 0.7
```

## Modules

- `config_loader.py`: 설정 파일 로딩 및 경로 resolve
- `data_loader.py`: `model.joblib`, `meta.json` 로딩
- `feature_extractor.py`: `trial.metrics`에서 모델 입력 feature 추출
- `trial_loader.py`: 테스트 데이터 폴더의 `trial_*.json` 로딩
- `evaluator.py`: 예측값, confusion matrix, accuracy, precision, recall, f1, auc 계산
- `visualizer.py`: confusion matrix, ROC/PR, score distribution 이미지 저장
- `run_performance_test.py`: CLI 진입점
