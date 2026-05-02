import json
import os
from typing import Any

import joblib
import numpy as np
import pandas as pd


class MacroPredictor:
    def __init__(
        self,
        model_path: str,
        input_features_path: str,
        allow_max_score: float,
        block_min_score: float,
    ):
        self.model_path = model_path
        self.input_features_path = input_features_path
        self.allow_max_score = allow_max_score
        self.block_min_score = block_min_score

        with open(input_features_path, "r", encoding="utf-8") as f:
            self.input_features: list[str] = json.load(f)

        self.model = joblib.load(model_path)

        print(f"[predictor] loaded model: {model_path}")
        print(f"[predictor] loaded input features: {len(self.input_features)}")

    def make_dataframe(self, features_list: list[dict[str, Any]]) -> pd.DataFrame:
        rows: list[dict[str, Any]] = []

        for features in features_list:
            row = {}

            for feature_name in self.input_features:
                value = features.get(feature_name)

                if value is None:
                    value = np.nan

                row[feature_name] = value

            rows.append(row)

        return pd.DataFrame(rows, columns=self.input_features)

    def predict_batch(self, features_list: list[dict[str, Any]]) -> list[tuple[str, float]]:
        if not features_list:
            return []

        x = self.make_dataframe(features_list)

        if hasattr(self.model, "predict_proba"):
            proba = self.model.predict_proba(x)
            p_macros = proba[:, 1].astype(float).tolist()
        else:
            predictions = self.model.predict(x)
            p_macros = [float(value) for value in predictions]

        return [(self.to_label(p_macro), p_macro) for p_macro in p_macros]

    def to_label(self, p_macro: float) -> str:
        if p_macro <= self.allow_max_score:
            return "allow"

        if p_macro >= self.block_min_score:
            return "block"

        return "review"


def create_predictor() -> MacroPredictor:
    return MacroPredictor(
        model_path=os.getenv("MODEL_PATH", "/app/models/classifier/model.joblib"),
        input_features_path=os.getenv(
            "INPUT_FEATURES_PATH",
            "/app/models/classifier/input_features.json",
        ),
        allow_max_score=float(os.getenv("ALLOW_MAX_SCORE", "0.40")),
        block_min_score=float(os.getenv("BLOCK_MIN_SCORE", "0.75")),
    )