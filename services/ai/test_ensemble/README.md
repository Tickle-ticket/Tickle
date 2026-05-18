# Ensemble Offline Performance Test

This folder mirrors `services/ai/test`, but evaluates **per-type ensembles** (multiple models per type).

## Run

```bash
python services/ai/test_ensemble/run_performance_test_ensemble.py
```

Config file: `services/ai/test_ensemble/performance_test_ensemble.yaml`

Outputs (default):
- `services/ai/test_ensemble/outputs/.../metrics.json`
- `services/ai/test_ensemble/outputs/.../predictions.jsonl`
- `services/ai/test_ensemble/outputs/.../plots/*.png`

## Data inputs

- Folder input: set `paths.data_dir` and `evaluation.glob` like `**/trial_*.json`
- JSONL input: set `paths.jsonl_path` (or `paths.data_jsonl`) and `evaluation.glob` like `**/*.jsonl`
