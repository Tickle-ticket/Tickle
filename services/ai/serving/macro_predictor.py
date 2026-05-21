import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd


SUPPORTED_TYPES = ("DETAIL", "CAPTCHA", "BOOKING")


@dataclass(frozen=True)
class ThresholdConfig:
    allow_max_score: float
    block_min_score: float


class ModelRunner:
    def __init__(
        self,
        model_path: str,
        input_features_path: str,
    ):
        self.model_path = model_path
        self.input_features_path = input_features_path

        with open(input_features_path, "r", encoding="utf-8") as f:
            self.input_features: list[str] = json.load(f)

        self.model = joblib.load(model_path)

        print(f"[predictor] loaded model: {model_path}")
        print(f"[predictor] loaded input features: {len(self.input_features)}")

    def predict_scores(self, x: pd.DataFrame) -> list[float]:
        if x.empty:
            return []

        if hasattr(self.model, "predict_proba"):
            proba = self.model.predict_proba(x)
            return proba[:, 1].astype(float).tolist()

        predictions = self.model.predict(x)
        return [float(value) for value in predictions]


def get_shared_input_features(model_type: str, runners: list[ModelRunner]) -> list[str] | None:
    base_runner = runners[0]
    base_features = base_runner.input_features

    for runner in runners[1:]:
        if runner.input_features != base_features:
            print(
                f"[predictor] input features differ in {model_type} ensemble; "
                "falling back to per-model DataFrame creation."
            )
            return None

    print(
        f"[predictor] validated shared input features: "
        f"type={model_type}, features={len(base_features)}"
    )
    return list(base_features)


class TypeModelEnsemble:
    def __init__(
        self,
        model_type: str,
        runners: list[ModelRunner],
        threshold: ThresholdConfig,
        voting: str,
    ):
        if not runners:
            raise ValueError(f"{model_type} ensemble must contain at least one model runner.")

        voting = voting.strip().lower()
        if voting not in {"soft", "hard"}:
            raise ValueError("ENSEMBLE_VOTING must be one of: soft, hard")

        self.model_type = model_type
        self.runners = runners
        self.threshold = threshold
        self.voting = voting
        self.shared_input_features = get_shared_input_features(model_type, runners)

    def make_dataframe(
        self,
        features_list: list[dict[str, Any]],
        input_features: list[str],
    ) -> pd.DataFrame:
        rows: list[dict[str, Any]] = []

        for features in features_list:
            row = {}

            for feature_name in input_features:
                value = features.get(feature_name)

                if value is None:
                    value = np.nan

                row[feature_name] = value

            rows.append(row)

        return pd.DataFrame(rows, columns=input_features)

    def predict_batch(self, features_list: list[dict[str, Any]]) -> list[tuple[str, float]]:
        if not features_list:
            return []

        if self.shared_input_features is not None:
            shared_x = self.make_dataframe(features_list, self.shared_input_features)
            runner_scores = [
                np.asarray(runner.predict_scores(shared_x), dtype=np.float64)
                for runner in self.runners
            ]
        else:
            runner_scores = [
                np.asarray(
                    runner.predict_scores(
                        self.make_dataframe(features_list, runner.input_features)
                    ),
                    dtype=np.float64,
                )
                for runner in self.runners
            ]

        scores = np.vstack(runner_scores)

        if self.voting == "hard":
            votes = (scores >= self.threshold.block_min_score).astype(np.float64)
            p_macros = votes.mean(axis=0).tolist()
        else:
            p_macros = scores.mean(axis=0).tolist()

        return [(self.to_label(float(p_macro)), float(p_macro)) for p_macro in p_macros]

    def to_label(self, p_macro: float) -> str:
        if p_macro >= self.threshold.block_min_score:
            return "BLOCK"

        if p_macro <= self.threshold.allow_max_score:
            return "ALLOW"

        return "REVIEW"


class MacroPredictor:
    def __init__(
        self,
        ensembles_by_type: dict[str, TypeModelEnsemble],
    ):
        if not ensembles_by_type:
            raise ValueError("MacroPredictor requires at least one type ensemble.")

        self.ensembles_by_type = ensembles_by_type

    def predict_batch(self, items: list[dict[str, Any]]) -> list[tuple[str, float]]:
        if not items:
            return []

        predictions: list[tuple[str, float] | None] = [None] * len(items)
        grouped: dict[str, list[tuple[int, dict[str, Any]]]] = {}

        for idx, item in enumerate(items):
            model_type = normalize_type(item.get("type"))
            features = item.get("features")
            if not isinstance(features, dict):
                raise ValueError(f"prediction item at index {idx} must contain a features dict.")

            grouped.setdefault(model_type, []).append((idx, features))

        for model_type, indexed_features in grouped.items():
            ensemble = self.ensembles_by_type.get(model_type)
            if ensemble is None:
                known = ", ".join(sorted(self.ensembles_by_type))
                raise ValueError(f"No model ensemble configured for type={model_type}. known={known}")

            features_list = [features for _idx, features in indexed_features]
            type_predictions = ensemble.predict_batch(features_list)

            for (idx, _features), prediction in zip(indexed_features, type_predictions):
                predictions[idx] = prediction

        missing_indices = [idx for idx, prediction in enumerate(predictions) if prediction is None]
        if missing_indices:
            raise RuntimeError(f"Missing predictions for indices={missing_indices}")

        return [prediction for prediction in predictions if prediction is not None]


def normalize_type(value: Any) -> str:
    if value is None:
        raise ValueError("prediction item is missing type.")

    normalized = str(value).strip().upper()
    if normalized not in SUPPORTED_TYPES:
        raise ValueError(
            f"Unsupported prediction type={value!r}. expected one of: {', '.join(SUPPORTED_TYPES)}"
        )

    return normalized


def load_thresholds(
    thresholds_path: str | None,
    default_threshold: ThresholdConfig,
) -> dict[str, ThresholdConfig]:
    thresholds = {model_type: default_threshold for model_type in SUPPORTED_TYPES}

    if not thresholds_path:
        return thresholds

    path = Path(thresholds_path)
    if not path.exists():
        print(f"[predictor] thresholds file not found, using env defaults: {path}")
        return thresholds

    with path.open("r", encoding="utf-8") as f:
        raw = json.load(f)

    for model_type in SUPPORTED_TYPES:
        type_raw = raw.get(model_type) or raw.get(model_type.lower())
        if not isinstance(type_raw, dict):
            continue

        thresholds[model_type] = ThresholdConfig(
            allow_max_score=float(
                type_raw.get(
                    "allow_max_score",
                    type_raw.get("ALLOW_MAX_SCORE", default_threshold.allow_max_score),
                )
            ),
            block_min_score=float(
                type_raw.get(
                    "block_min_score",
                    type_raw.get("BLOCK_MIN_SCORE", default_threshold.block_min_score),
                )
            ),
        )

    return thresholds


def load_type_ensemble(
    models_root: Path,
    model_type: str,
    classifier_dirs: list[str],
    threshold: ThresholdConfig,
    voting: str,
) -> TypeModelEnsemble:
    runners = []
    type_root = models_root / model_type

    for classifier_dir in classifier_dirs:
        artifact_dir = type_root / classifier_dir
        model_path = artifact_dir / "model.joblib"
        input_features_path = artifact_dir / "input_features.json"

        if not model_path.exists() or not input_features_path.exists():
            continue

        runners.append(
            ModelRunner(
                model_path=str(model_path),
                input_features_path=str(input_features_path),
            )
        )

    if not runners:
        raise FileNotFoundError(
            f"No model artifacts found for type={model_type} under {type_root}. "
            "Expected classifier dirs with model.joblib and input_features.json."
        )

    print(
        f"[predictor] loaded {model_type} ensemble: "
        f"models={len(runners)}, voting={voting}, "
        f"allow_max_score={threshold.allow_max_score}, "
        f"block_min_score={threshold.block_min_score}"
    )
    return TypeModelEnsemble(
        model_type=model_type,
        runners=runners,
        threshold=threshold,
        voting=voting,
    )


def create_single_model_predictor() -> MacroPredictor:
    default_threshold = ThresholdConfig(
        allow_max_score=float(os.getenv("ALLOW_MAX_SCORE", "0.40")),
        block_min_score=float(os.getenv("BLOCK_MIN_SCORE", "0.75")),
    )
    runner = ModelRunner(
        model_path=os.getenv("MODEL_PATH", "/app/models/classifier/model.joblib"),
        input_features_path=os.getenv(
            "INPUT_FEATURES_PATH",
            "/app/models/classifier/input_features.json",
        ),
    )
    ensembles = {
        model_type: TypeModelEnsemble(
            model_type=model_type,
            runners=[runner],
            threshold=default_threshold,
            voting="soft",
        )
        for model_type in SUPPORTED_TYPES
    }
    return MacroPredictor(ensembles)


def create_predictor() -> MacroPredictor:
    models_root = Path(os.getenv("MODELS_ROOT", "/app/models"))
    use_type_ensemble = os.getenv("USE_TYPE_ENSEMBLE", "true").strip().lower() in {
        "1",
        "true",
        "yes",
        "y",
    }

    if not use_type_ensemble:
        return create_single_model_predictor()

    classifier_dirs = [
        value.strip()
        for value in os.getenv(
            "ENSEMBLE_CLASSIFIER_DIRS",
            "classifier,classifier_1,classifier_2",
        ).split(",")
        if value.strip()
    ]
    if not classifier_dirs:
        raise ValueError("ENSEMBLE_CLASSIFIER_DIRS must contain at least one directory name.")

    voting = os.getenv("ENSEMBLE_VOTING", "soft")
    default_threshold = ThresholdConfig(
        allow_max_score=float(os.getenv("ALLOW_MAX_SCORE", "0.40")),
        block_min_score=float(os.getenv("BLOCK_MIN_SCORE", "0.75")),
    )
    thresholds = load_thresholds(
        os.getenv("THRESHOLDS_PATH", str(models_root / "thresholds.json")),
        default_threshold=default_threshold,
    )

    ensembles = {
        model_type: load_type_ensemble(
            models_root=models_root,
            model_type=model_type,
            classifier_dirs=classifier_dirs,
            threshold=thresholds[model_type],
            voting=voting,
        )
        for model_type in SUPPORTED_TYPES
    }

    return MacroPredictor(ensembles)
