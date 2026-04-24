from __future__ import annotations

import argparse
import json
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Mapping

import numpy as np


_PATH_PATTERN_RE = re.compile(r"(?P<dist>[0-9]+(?:\.[0-9]+)?)px\s*\|\s*straight\s*(?P<straight>[0-9]+(?:\.[0-9]+)?)")


def _resolve_artifact_dir(ai_root: Path, artifact_arg: str | None) -> Path:
    """Resolve artifact dir robustly from cwd / absolute / relative inputs.

    Supports:
    - None: auto-pick latest under `ai_root/artifacts/*`
    - Relative paths: resolved under `ai_root`
    - Root-relative `\\artifacts\\...` or `/artifacts/...`: treated as `ai_root/artifacts/...`
    """

    if not artifact_arg:
        latest = _find_latest_artifact(ai_root / "artifacts")
        if latest is None:
            raise FileNotFoundError(
                "No artifact found. Pass `--artifact-dir <path>` or create one under `services/ai/artifacts/`."
            )
        return latest

    raw = str(artifact_arg).strip()

    # If user accidentally passed "\artifacts\..." or "/artifacts/..." treat as ai_root-relative.
    if raw.startswith(("\\", "/")):
        candidate = ai_root / raw.lstrip("\\/")
    else:
        candidate = Path(raw)
        if not candidate.is_absolute():
            candidate = ai_root / candidate

    return candidate.resolve()


def _find_latest_artifact(artifacts_root: Path) -> Path | None:
    if not artifacts_root.exists():
        return None

    candidates: list[tuple[float, Path]] = []
    for path in artifacts_root.iterdir():
        if not path.is_dir():
            continue
        if (path / "meta.json").exists() and (path / "model.joblib").exists():
            try:
                candidates.append((path.stat().st_mtime, path))
            except FileNotFoundError:
                continue

    if not candidates:
        return None
    candidates.sort(key=lambda x: x[0], reverse=True)
    return candidates[0][1]


def load_artifact(artifact_dir: Path) -> tuple[object, dict]:
    meta_path = artifact_dir / "meta.json"
    model_path = artifact_dir / "model.joblib"
    if not meta_path.exists():
        raise FileNotFoundError(f"Missing meta.json: {meta_path}")
    if not model_path.exists():
        raise FileNotFoundError(f"Missing model.joblib: {model_path}")

    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    try:
        import joblib  # type: ignore
    except Exception as exc:  # pragma: no cover
        raise RuntimeError("Missing dependency: joblib (install scikit-learn or joblib).") from exc

    model = joblib.load(model_path)
    return model, meta


def parse_mouse_path_pattern(value: object) -> tuple[float, float]:
    if not isinstance(value, str):
        return (float("nan"), float("nan"))
    match = _PATH_PATTERN_RE.search(value.strip())
    if not match:
        return (float("nan"), float("nan"))
    try:
        return (float(match.group("dist")), float(match.group("straight")))
    except Exception:
        return (float("nan"), float("nan"))


def to_float_or_nan(value: object) -> float:
    if value is None:
        return float("nan")
    if isinstance(value, bool):
        return float(int(value))
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(value)  # type: ignore[arg-type]
    except Exception:
        return float("nan")


def extract_feature_values(
    metrics: Mapping[str, object],
    feature_names: list[str],
    include_path_derivatives: bool,
) -> dict[str, float]:
    derived: dict[str, float] = {}
    if include_path_derivatives:
        d300, s300 = parse_mouse_path_pattern(metrics.get("pre_click_mouse_path_pattern_300ms"))
        d500, s500 = parse_mouse_path_pattern(metrics.get("pre_click_mouse_path_pattern_500ms"))
        derived = {
            "pre_click_path_300ms_total_distance_px": d300,
            "pre_click_path_300ms_straightness": s300,
            "pre_click_path_500ms_total_distance_px": d500,
            "pre_click_path_500ms_straightness": s500,
        }

    out: dict[str, float] = {}
    for name in feature_names:
        if name in derived:
            out[name] = float(derived[name])
        else:
            out[name] = to_float_or_nan(metrics.get(name))
    return out


def predict_proba_binary(model: object, x: np.ndarray) -> np.ndarray:
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(x)  # type: ignore[attr-defined]
        probs = np.asarray(probs, dtype=np.float64)
        if probs.ndim != 2 or probs.shape[1] < 2:
            raise ValueError(f"Unexpected predict_proba shape: {probs.shape}")
        return probs[:, 1]
    if hasattr(model, "decision_function"):
        scores = model.decision_function(x)  # type: ignore[attr-defined]
        scores = np.asarray(scores, dtype=np.float64)
        return 1.0 / (1.0 + np.exp(-scores))
    raise TypeError("Model must implement predict_proba or decision_function")


def _format_status(label: str | None, pred: int) -> tuple[str, str]:
    """Return (emoji, short text) for terminal readability.

    - ✅ = correct (label known, pred matches)
    - ❌ = mismatch (label known, pred differs)
    - ❓ = label unknown / not comparable
    """

    if label not in ("human", "macro"):
        return ("❓", "")
    y_true = 1 if label == "macro" else 0
    if pred == y_true:
        return ("✅", "(match)")
    return ("❌", "(mismatch)")


class _RunParamsCache:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._mtime: float | None = None
        self._map: dict[int, dict] = {}

    def get(self, trial_id: int | None) -> dict | None:
        if trial_id is None:
            return None
        self._maybe_reload()
        return self._map.get(int(trial_id))

    def _maybe_reload(self) -> None:
        try:
            mtime = self.path.stat().st_mtime
        except FileNotFoundError:
            self._mtime = None
            self._map = {}
            return

        if self._mtime is not None and mtime <= self._mtime:
            return

        mapping: dict[int, dict] = {}
        try:
            with self.path.open("r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        row = json.loads(line)
                    except Exception:
                        continue
                    tid = row.get("trial_id")
                    run_params = row.get("run_params")
                    if isinstance(tid, int) and isinstance(run_params, dict):
                        mapping[int(tid)] = run_params
        except Exception:
            # keep previous cache on read errors
            return

        self._map = mapping
        self._mtime = mtime


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Watch trial_*.json and print model score (P(macro)) for each update.")
    parser.add_argument(
        "--ai-root",
        default=str(Path(__file__).resolve().parents[1]),
        help="Path to services/ai (default: parent of this file)",
    )
    parser.add_argument(
        "--artifact-dir",
        default=None,
        help="Directory containing model.joblib and meta.json (e.g., artifacts/<run>/).",
    )
    parser.add_argument(
        "--trials-glob",
        default="macro/browser_automation/collector_api/data/trials/trial_*.json",
        help="Glob pattern under ai-root to watch.",
    )
    parser.add_argument(
        "--only-new",
        action="store_true",
        help="If set, skip scoring existing trial files on startup and only score files updated after launch.",
    )
    parser.add_argument("--poll-s", type=float, default=1.0, help="Polling interval seconds.")
    parser.add_argument("--threshold", type=float, default=0.5, help="Decision threshold for pred label (macro=1).")
    parser.add_argument(
        "--write-jsonl",
        default=None,
        help="Optional output path to append score rows as jsonl.",
    )
    parser.add_argument(
        "--write-mismatches-jsonl",
        default=None,
        help="Optional output path to append ONLY mismatches (includes per-feature values) as jsonl.",
    )
    parser.add_argument(
        "--run-params-jsonl",
        default="macro/browser_automation/collector_api/data/macro_run_params.jsonl",
        help="Sidecar JSONL path (under ai-root) that maps trial_id -> run_params.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    ai_root = Path(args.ai_root)
    artifact_dir = _resolve_artifact_dir(ai_root, args.artifact_dir)

    model, meta = load_artifact(artifact_dir)
    feature_names = meta.get("feature_names")
    if not isinstance(feature_names, list) or not feature_names:
        raise RuntimeError("meta.json must contain non-empty `feature_names` list.")
    feature_names = [str(x) for x in feature_names]
    include_path_derivatives = bool(meta.get("include_path_derivatives", True))

    out_path = Path(args.write_jsonl) if args.write_jsonl else None
    if out_path:
        out_path.parent.mkdir(parents=True, exist_ok=True)

    mismatch_path = Path(args.write_mismatches_jsonl) if args.write_mismatches_jsonl else None
    if mismatch_path:
        mismatch_path.parent.mkdir(parents=True, exist_ok=True)

    watched: dict[Path, float] = {}
    run_params_cache = _RunParamsCache(ai_root / args.run_params_jsonl)
    print(f"Watching: {ai_root / args.trials_glob}")
    print(f"Artifact: {artifact_dir}")

    if args.only_new:
        # Prime watched map so existing files won't be printed once at startup.
        for path in sorted(ai_root.glob(args.trials_glob)):
            try:
                watched[path] = path.stat().st_mtime
            except FileNotFoundError:
                continue
        print(f"only-new: primed {len(watched)} existing files (will score only updates/new files).")

    while True:
        paths = sorted(ai_root.glob(args.trials_glob))
        for path in paths:
            try:
                mtime = path.stat().st_mtime
            except FileNotFoundError:
                continue

            prev = watched.get(path)
            if prev is not None and prev >= mtime:
                continue
            watched[path] = mtime

            try:
                trial = json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                continue

            metrics = trial.get("metrics") or {}
            if not isinstance(metrics, dict):
                continue

            trial_id = trial.get("trialId")
            label = None
            summary = trial.get("summary") or {}
            if isinstance(summary, dict) and summary.get("label") is not None:
                label = str(summary.get("label"))

            feature_values = extract_feature_values(
                metrics,
                feature_names,
                include_path_derivatives=include_path_derivatives,
            )
            x = np.asarray([feature_values[name] for name in feature_names], dtype=np.float64).reshape(1, -1)
            p_macro = float(predict_proba_binary(model, x)[0])
            pred = int(p_macro >= float(args.threshold))

            ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            status_emoji, status_text = _format_status(label=label, pred=pred)
            print(
                f"{status_emoji} [{ts}] trialId={trial_id} label={label} p_macro={p_macro:.4f} pred={pred} {status_text} file={path}"
            )

            if out_path:
                row = {
                    "ts": ts,
                    "trialId": trial_id,
                    "label": label,
                    "p_macro": p_macro,
                    "pred": pred,
                    "threshold": float(args.threshold),
                    "file": str(path),
                }
                with out_path.open("a", encoding="utf-8") as f:
                    f.write(json.dumps(row, ensure_ascii=False) + "\n")

            if mismatch_path and label in ("human", "macro"):
                y_true = 1 if label == "macro" else 0
                if pred != y_true:
                    run_params = run_params_cache.get(int(trial_id) if isinstance(trial_id, int) else None)
                    mismatch_row = {
                        "ts": ts,
                        "trialId": trial_id,
                        "label": label,
                        "y_true": y_true,
                        "p_macro": p_macro,
                        "pred": pred,
                        "threshold": float(args.threshold),
                        "file": str(path),
                        "artifact_dir": str(artifact_dir),
                        "run_params": run_params,
                        "feature_values": feature_values,
                    }
                    with mismatch_path.open("a", encoding="utf-8") as f:
                        f.write(json.dumps(mismatch_row, ensure_ascii=False) + "\n")

        time.sleep(max(0.1, float(args.poll_s)))


if __name__ == "__main__":
    main()
