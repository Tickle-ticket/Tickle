from __future__ import annotations

import argparse
import io
import json
import sys
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
else:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")


RANDOM_STATE = 42
TEST_SIZE = 0.2
LV3_CUTOFF = 0.65

# Ticket 320 기준: lv2_human/lv2_macro에서 not-null인 16 behavior features.
FEATURES_320 = [
    "time_to_first_click_ms",
    "inter_click_interval_ms",
    "pre_click_mousemove_count",
    "mouse_total_travel_distance_px",
    "mouse_avg_speed_px_per_ms",
    "mouse_max_speed_px_per_ms",
    "mouse_speed_change_mean",
    "mouse_acceleration_mean",
    "mouse_jerk_mean",
    "mouse_path_straightness_score",
    "mouse_path_curvature_mean",
    "mouse_direction_change_count",
    "mouse_overshoot_flag",
    "mouse_hover_dwell_time_ms",
    "mouse_stop_segment_count",
    "mousemove_event_rate",
]


def source_group(trial_id: int, label: str | None, algorithm_type: str | None) -> str:
    if 900001 <= trial_id <= 909999:
        return "lv2_human" if label == "human" else "lv2_macro"
    if 910001 <= trial_id <= 910500:
        return "balabit"
    if 930001 <= trial_id <= 930050 or algorithm_type == "lv3_balabit_kde":
        return "lv3_balabit_kde"
    if 940001 <= trial_id <= 949999 or algorithm_type == "lv4_aggressive":
        return "lv4_aggressive"
    return "unknown"


def load_existing_trials(behavior_dir: Path) -> pd.DataFrame:
    rows: list[dict] = []
    for path in sorted(behavior_dir.glob("trial_*.json")):
        trial = json.loads(path.read_text(encoding="utf-8"))
        trial_id = int(trial.get("trialId") or path.stem.split("_", 1)[1])
        label = trial.get("label")
        metrics = trial.get("metrics") or {}
        algorithm_type = trial.get("algorithm_type")
        row = {
            "trial_id": trial_id,
            "label": label,
            "label_int": 1 if label == "macro" else 0,
            "source_group": source_group(trial_id, label, algorithm_type),
            "algorithm_type": algorithm_type,
        }
        for feature in FEATURES_320:
            row[feature] = metrics.get(feature)
        rows.append(row)
    return pd.DataFrame(rows).sort_values("trial_id").reset_index(drop=True)


def load_today_macro(path: Path) -> pd.DataFrame:
    rows: list[dict] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        obj = json.loads(line)
        features = obj.get("features") or {}
        row = {
            "trial_id": int(obj.get("trialID")),
            "label": "macro",
            "label_int": 1,
            "source_group": "today_macro",
            "algorithm_type": "today_macro_after53",
        }
        for feature in FEATURES_320:
            row[feature] = features.get(feature)
        rows.append(row)
    return pd.DataFrame(rows).sort_values("trial_id").reset_index(drop=True)


def build_condition_frames(existing: pd.DataFrame, today_macro: pd.DataFrame) -> dict[str, pd.DataFrame]:
    baseline = existing[existing["source_group"].isin({"lv2_human", "lv2_macro", "balabit"})].copy()
    plus_today = pd.concat([baseline, today_macro], ignore_index=True)
    lv3_eval = existing[existing["source_group"].isin({"balabit", "lv3_balabit_kde"})].copy()
    return {"baseline": baseline, "+today": plus_today, "lv3_eval": lv3_eval}


def make_logreg() -> Pipeline:
    # Reuses ticket 320 univariate signature: balanced LogReg + roc_auc.
    return Pipeline(
        [
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(class_weight="balanced", max_iter=1000)),
        ]
    )


def make_xgb() -> XGBClassifier:
    return XGBClassifier(
        n_estimators=400,
        max_depth=3,
        learning_rate=0.03,
        objective="binary:logistic",
        eval_metric="auc",
        random_state=RANDOM_STATE,
        n_jobs=1,
        tree_method="hist",
    )


def auc_or_nan(y_true: np.ndarray, score: np.ndarray) -> float:
    if len(np.unique(y_true)) < 2:
        return float("nan")
    return float(roc_auc_score(y_true, score))


def split_frame(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    train_idx, test_idx = train_test_split(
        df.index,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=df["label_int"],
    )
    return df.loc[train_idx].copy(), df.loc[test_idx].copy()


def run_univariate(condition: str, train_df: pd.DataFrame, test_df: pd.DataFrame, lv3_eval: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for feature in FEATURES_320:
        model = make_logreg()
        model.fit(train_df[[feature]], train_df["label_int"].values)
        overall_score = model.predict_proba(test_df[[feature]])[:, 1]
        lv3_score = model.predict_proba(lv3_eval[[feature]])[:, 1]
        rows.append(
            {
                "condition": condition,
                "feature": feature,
                "overall_auc": auc_or_nan(test_df["label_int"].values, overall_score),
                "lv3_auc": auc_or_nan(lv3_eval["label_int"].values, lv3_score),
                "train_non_null": int(train_df[feature].notna().sum()),
                "lv3_non_null": int(lv3_eval[feature].notna().sum()),
            }
        )
    return pd.DataFrame(rows)


def run_multivariate(
    condition: str,
    feature_pool: list[str],
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    lv3_eval: pd.DataFrame,
) -> dict:
    if not feature_pool:
        return {
            "condition": condition,
            "feature_count": 0,
            "overall_auc": float("nan"),
            "lv3_auc": float("nan"),
            "features": [],
        }
    model = make_xgb()
    model.fit(train_df[feature_pool], train_df["label_int"].values)
    overall_score = model.predict_proba(test_df[feature_pool])[:, 1]
    lv3_score = model.predict_proba(lv3_eval[feature_pool])[:, 1]
    return {
        "condition": condition,
        "feature_count": len(feature_pool),
        "overall_auc": auc_or_nan(test_df["label_int"].values, overall_score),
        "lv3_auc": auc_or_nan(lv3_eval["label_int"].values, lv3_score),
        "features": feature_pool,
    }


def save_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def to_markdown_table(df: pd.DataFrame) -> str:
    cols = [str(col) for col in df.columns]
    rows = []
    for _, row in df.iterrows():
        rows.append([str(row[col]) for col in df.columns])
    header = "| " + " | ".join(cols) + " |"
    sep = "| " + " | ".join(["---"] * len(cols)) + " |"
    body = ["| " + " | ".join(values) + " |" for values in rows]
    return "\n".join([header, sep, *body])


def series_to_markdown_table(series: pd.Series, name: str = "count") -> str:
    df = series.rename(name).reset_index()
    df.columns = [series.index.name or "source_group", name]
    return to_markdown_table(df)


def main() -> None:
    ai_root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser()
    parser.add_argument("--behavior-dir", type=Path, default=ai_root / "data" / "behavior")
    parser.add_argument(
        "--today-macro-jsonl",
        type=Path,
        default=ai_root / "data" / "behavior_exports" / "macro_today_after53.jsonl",
    )
    parser.add_argument(
        "--run-dir",
        type=Path,
        default=ai_root
        / "train"
        / "model_experiment"
        / "runs"
        / f"ticket_319_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
    )
    args = parser.parse_args()

    pd.set_option("display.max_rows", 100)
    pd.set_option("display.max_columns", None)
    pd.set_option("display.width", 220)

    args.run_dir.mkdir(parents=True, exist_ok=False)

    existing = load_existing_trials(args.behavior_dir)
    today_macro = load_today_macro(args.today_macro_jsonl)
    frames = build_condition_frames(existing, today_macro)

    source_counts = existing["source_group"].value_counts().sort_index()
    split_rows = []
    condition_outputs = {}
    multivariate_rows = []

    for condition in ["baseline", "+today"]:
        df = frames[condition]
        train_df, test_df = split_frame(df)
        split_rows.append(
            {
                "condition": condition,
                "total_n": len(df),
                "train_n": len(train_df),
                "test_n": len(test_df),
                "train_human": int((train_df["label_int"] == 0).sum()),
                "train_macro": int((train_df["label_int"] == 1).sum()),
                "test_human": int((test_df["label_int"] == 0).sum()),
                "test_macro": int((test_df["label_int"] == 1).sum()),
            }
        )
        univariate = run_univariate(condition, train_df, test_df, frames["lv3_eval"])
        feature_pool = univariate.loc[univariate["lv3_auc"] >= LV3_CUTOFF, "feature"].tolist()
        multivariate = run_multivariate(condition, feature_pool, train_df, test_df, frames["lv3_eval"])
        condition_outputs[condition] = {
            "univariate": univariate,
            "feature_pool": feature_pool,
            "multivariate": multivariate,
        }
        multivariate_rows.append(multivariate)

    split_df = pd.DataFrame(split_rows)
    baseline_uni = condition_outputs["baseline"]["univariate"].set_index("feature")
    today_uni = condition_outputs["+today"]["univariate"].set_index("feature")

    univariate_compare = pd.DataFrame(
        [
            {
                "feature": feature,
                "baseline_lv3_auc": baseline_uni.loc[feature, "lv3_auc"],
                "+today_lv3_auc": today_uni.loc[feature, "lv3_auc"],
                "delta_lv3_auc": today_uni.loc[feature, "lv3_auc"] - baseline_uni.loc[feature, "lv3_auc"],
                "baseline_overall_auc": baseline_uni.loc[feature, "overall_auc"],
                "+today_overall_auc": today_uni.loc[feature, "overall_auc"],
            }
            for feature in FEATURES_320
        ]
    )
    multivariate_df = pd.DataFrame(multivariate_rows)
    pools = {
        condition: condition_outputs[condition]["feature_pool"]
        for condition in ["baseline", "+today"]
    }

    univariate_compare.to_json(args.run_dir / "univariate_compare.json", orient="records", force_ascii=False, indent=2)
    split_df.to_json(args.run_dir / "train_test_split.json", orient="records", force_ascii=False, indent=2)
    multivariate_df.to_json(args.run_dir / "multivariate_xgboost.json", orient="records", force_ascii=False, indent=2)
    save_json(args.run_dir / "feature_pools.json", pools)
    save_json(
        args.run_dir / "summary.json",
        {
            "run_dir": str(args.run_dir),
            "features_320": FEATURES_320,
            "lv3_cutoff": LV3_CUTOFF,
            "xgboost": {"n_estimators": 400, "max_depth": 3, "learning_rate": 0.03},
            "source_counts": source_counts.to_dict(),
            "today_macro_count": int(len(today_macro)),
            "multivariate": multivariate_rows,
        },
    )

    report_lines = [
        "# Ticket 319 + 320 재평가",
        "",
        "## 데이터 구성",
        "",
        series_to_markdown_table(source_counts),
        "",
        f"- today_macro: {len(today_macro)}",
        "- lv4_aggressive 101개: 보겸 선택 A에 따라 학습 제외",
        "- lv3_balabit_kde 50개: 학습 제외, eval-only 고정",
        "",
        "## Train/Test Split",
        "",
        to_markdown_table(split_df),
        "",
        "## Univariate 비교",
        "",
        to_markdown_table(univariate_compare),
        "",
        f"## Cutoff 통과 feature pool (lv3 AUC >= {LV3_CUTOFF})",
        "",
        *[f"- {condition}: {pools[condition]}" for condition in ["baseline", "+today"]],
        "",
        "## Multivariate XGBoost 결과",
        "",
        to_markdown_table(multivariate_df[["condition", "feature_count", "overall_auc", "lv3_auc", "features"]]),
    ]
    (args.run_dir / "report.md").write_text("\n".join(report_lines), encoding="utf-8")

    print("=== run_dir ===")
    print(args.run_dir)
    print()
    print("=== 데이터 구성 ===")
    print(source_counts.to_string())
    print(f"today_macro {len(today_macro)}")
    print()
    print("=== train/test split ===")
    print(split_df.to_string(index=False))
    print()
    print("=== univariate 비교 ===")
    print(univariate_compare.to_string(index=False, float_format=lambda value: f"{value:.4f}"))
    print()
    print(f"=== cutoff 통과 feature pool (lv3 AUC >= {LV3_CUTOFF}) ===")
    for condition in ["baseline", "+today"]:
        print(f"{condition}: n={len(pools[condition])}")
        for feature in pools[condition]:
            print(f"  - {feature}")
    print()
    print("=== multivariate XGBoost 결과 ===")
    print(multivariate_df[["condition", "feature_count", "overall_auc", "lv3_auc", "features"]].to_string(index=False))
    print()
    print("=== AUC 숫자 요약 ===")
    for row in multivariate_rows:
        print(
            f"{row['condition']}: overall_auc={row['overall_auc']:.4f}, "
            f"lv3_auc={row['lv3_auc']:.4f}, feature_count={row['feature_count']}"
        )


if __name__ == "__main__":
    main()
