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

## BOOKING hard voting (optional)

In `ensemble.types[].hard_voting`, you can enable a BOOKING-only hard-voting policy that:
- votes per model with `(p_macro >= vote_threshold)`
- auto-selects `vote_threshold` to maximize recall under an FP constraint (e.g. `max_fp: 0`) on the evaluated dataset

## BOOKING IsolationForest post-filter (optional)

In `ensemble.types[].post_filter`, you can enable a 2-stage BOOKING decision:
- stage 1: compute `p_macro` from the ensemble
- review band: `review_low < p_macro < review_high`
- stage 2: run IsolationForest (human-only anomaly detector); anomaly => macro, else human

## BOOKING hard-vote grid (script)

Grid-search `max_fp -> best t_high` without touching the main evaluation logic:

```bash
python services/ai/test_ensemble/run_booking_hardvote_grid.py --config services/ai/test_ensemble/performance_test_ensemble.yaml
```
