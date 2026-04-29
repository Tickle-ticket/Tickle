"""
Feature 재선정 분석 (ai-feat-295, 1회성)

3개 분석 출력:
1. USABLE 16개 단독 CV ranking (그룹 A: Balabit+lv2 n=652 / 그룹 B: lv2-only n=152)
2. USABLE 16개 pearson |corr| (lv2 152 trial 기준) + 그룹 A 7개 corr (n=652)
3. mouse 8개 트리비얼 재점검: lv2_human / balabit_human / lv2_macro 분포 비교

실행:
    python services/ai/train/EDA/feature_reselection_analysis.py
"""

from __future__ import annotations

import io
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import yaml
from scipy import stats
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
else:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / ".." / ".." / "data" / "behavior"
FEATURE_CONFIG_PATH = ROOT / ".." / ".." / "configs" / "feature_config.yaml"

DOMAIN_VALIDATED_FEATURES = [
    "inter_click_interval_ms",
    "mouse_total_travel_distance_px",
    "mouse_avg_speed_px_per_ms",
    "mouse_max_speed_px_per_ms",
    "mouse_speed_change_mean",
    "mouse_acceleration_mean",
    "mouse_path_curvature_mean",
]

TRIVIAL_RECHECK_FEATURES = [
    "mouse_path_curvature_mean",
    "mouse_total_travel_distance_px",
    "mouse_speed_change_mean",
    "mouse_avg_speed_px_per_ms",
    "mouse_max_speed_px_per_ms",
    "mouse_acceleration_mean",
    "mouse_jerk_mean",
    "mouse_hover_dwell_time_ms",
]
BALABIT_NULL_FEATURES = {"mouse_jerk_mean", "mouse_hover_dwell_time_ms"}

BALABIT_TRIAL_MIN, BALABIT_TRIAL_MAX = 910001, 910500
LV2_TRIAL_MIN, LV2_TRIAL_MAX = 900001, 909999

P_VALUE_THRESHOLD = 0.05
ARTIFACT_EFFECT_SIZE_THRESHOLD = 0.5

CV_RANDOM_STATE = 42
CV_SPLITS = 5


def load_data(data_dir: Path) -> pd.DataFrame:
    rows: list[dict] = []
    for path in sorted(data_dir.glob("trial_*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        label = data.get("label")
        if label is None:
            continue
        row = {"trial_id": int(data.get("trialId")), "label": label}
        summary = data.get("summary", {})
        feature = data.get("metrics", {})
        if isinstance(summary, dict):
            row.update(summary)
        if isinstance(feature, dict):
            row.update(feature)
        rows.append(row)
    return pd.DataFrame(rows).sort_values("trial_id").reset_index(drop=True)


def add_pre_click_path_features(df: pd.DataFrame) -> None:
    for sec in [300, 500]:
        col = f"pre_click_mouse_path_pattern_{sec}ms"
        if col not in df.columns:
            continue
        parts = df[col].fillna("").astype(str).str.split("|", n=1, expand=True)
        distance_text = parts[0].str.replace("px", "", regex=False).str.strip()
        straightness_text = parts[1].str.replace("straight", "", regex=False).str.strip() if 1 in parts.columns else pd.Series([""] * len(df))
        distance_col = f"pre_click_path_{sec}ms_total_distance_px"
        straightness_col = f"pre_click_path_{sec}ms_straightness"
        insert_idx = df.columns.get_loc(col)
        df.drop(columns=[col], inplace=True)
        df.insert(insert_idx, distance_col, pd.to_numeric(distance_text, errors="coerce"))
        df.insert(insert_idx + 1, straightness_col, pd.to_numeric(straightness_text, errors="coerce"))


def assign_source(row: pd.Series) -> str:
    tid = row["trial_id"]
    label = row["label"]
    if BALABIT_TRIAL_MIN <= tid <= BALABIT_TRIAL_MAX:
        return "balabit_human"
    if LV2_TRIAL_MIN <= tid <= LV2_TRIAL_MAX:
        return "lv2_human" if label == "human" else "lv2_macro"
    return "unknown"


def compute_smd_table(df: pd.DataFrame, features: list[str]) -> pd.DataFrame:
    """lv2 human vs lv2 macro 기준 SMD (eda_gyeom_2 와 동일)."""
    h = df[df["source"] == "lv2_human"]
    m = df[df["source"] == "lv2_macro"]
    levels = ["negligible", "small", "medium", "large", "very_large", "huge"]
    bins = [-float("inf"), 0.2, 0.5, 0.8, 1.5, 3.0, float("inf")]
    rows = []
    for f in features:
        h_s, m_s = h[f].dropna(), m[f].dropna()
        if len(h_s) == 0 or len(m_s) == 0:
            rows.append({"feature": f, "abs_SMD": np.nan, "SMD_level": "n/a"})
            continue
        pooled_std = np.sqrt((h_s.std() ** 2 + m_s.std() ** 2) / 2)
        if pooled_std == 0 or np.isnan(pooled_std):
            smd = np.nan
        else:
            smd = (h_s.mean() - m_s.mean()) / pooled_std
        rows.append({"feature": f, "abs_SMD": abs(smd) if not np.isnan(smd) else np.nan})
    out = pd.DataFrame(rows)
    out["SMD_level"] = pd.cut(out["abs_SMD"], bins=bins, labels=levels).astype(str)
    out.loc[out["abs_SMD"].isna(), "SMD_level"] = "n/a"
    return out


def single_feature_cv(df: pd.DataFrame, feature: str) -> tuple[float, float]:
    sub = df[[feature, "label"]].dropna(subset=["label"])
    X = sub[[feature]].values
    y = (sub["label"] == "macro").astype(int).values
    pipe = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(max_iter=1000, class_weight="balanced")),
        ]
    )
    cv = StratifiedKFold(n_splits=CV_SPLITS, shuffle=True, random_state=CV_RANDOM_STATE)
    scores = cross_val_score(pipe, X, y, cv=cv, scoring="accuracy")
    return float(scores.mean()), float(scores.std())


def cv_ranking(df_full: pd.DataFrame, df_lv2: pd.DataFrame, usable: list[str], smd: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    rows_a, rows_b = [], []
    for f in usable:
        if f in DOMAIN_VALIDATED_FEATURES:
            mean, std = single_feature_cv(df_full, f)
            rows_a.append({"feature": f, "single_cv_mean": mean, "single_cv_std": std, "n_trials": len(df_full), "domain_validated": True})
        else:
            mean, std = single_feature_cv(df_lv2, f)
            rows_b.append({"feature": f, "single_cv_mean": mean, "single_cv_std": std, "n_trials": len(df_lv2), "domain_validated": False})

    smd_idx = smd.set_index("feature")
    for rows in (rows_a, rows_b):
        for row in rows:
            f = row["feature"]
            row["abs_SMD"] = smd_idx.loc[f, "abs_SMD"] if f in smd_idx.index else np.nan
            row["SMD_level"] = smd_idx.loc[f, "SMD_level"] if f in smd_idx.index else "n/a"

    df_a = pd.DataFrame(rows_a).sort_values("single_cv_mean", ascending=False).reset_index(drop=True)
    df_b = pd.DataFrame(rows_b).sort_values("single_cv_mean", ascending=False).reset_index(drop=True)
    return df_a, df_b


def correlation_pairs(df: pd.DataFrame, features: list[str], cv_means: dict[str, float], domain_flags: dict[str, bool], strong_thr: float = 0.9, mod_thr: float = 0.7) -> tuple[pd.DataFrame, pd.DataFrame]:
    sub = df[features].copy()
    corr = sub.corr(method="pearson").abs()
    rows = []
    for i, fa in enumerate(features):
        for fb in features[i + 1:]:
            c = corr.loc[fa, fb]
            if pd.isna(c):
                continue
            if c >= mod_thr:
                rows.append(
                    {
                        "feature_a": fa,
                        "feature_b": fb,
                        "abs_corr": float(c),
                        "feature_a_cv": cv_means.get(fa, np.nan),
                        "feature_b_cv": cv_means.get(fb, np.nan),
                        "feature_a_dv": domain_flags.get(fa, False),
                        "feature_b_dv": domain_flags.get(fb, False),
                    }
                )
    pair_df = pd.DataFrame(rows).sort_values("abs_corr", ascending=False).reset_index(drop=True)
    strong = pair_df[pair_df["abs_corr"] >= strong_thr].reset_index(drop=True)
    moderate = pair_df[(pair_df["abs_corr"] >= mod_thr) & (pair_df["abs_corr"] < strong_thr)].reset_index(drop=True)
    return strong, moderate


def trivial_recheck(df: pd.DataFrame) -> pd.DataFrame:
    a_df = df[df["source"] == "lv2_human"]
    b_df = df[df["source"] == "balabit_human"]
    c_df = df[df["source"] == "lv2_macro"]
    rows = []
    for f in TRIVIAL_RECHECK_FEATURES:
        a = a_df[f].dropna()
        c = c_df[f].dropna()
        a_mean, a_std = float(a.mean()), float(a.std())
        c_mean, c_std = float(c.mean()), float(c.std())

        if f in BALABIT_NULL_FEATURES:
            b_mean_str = "N/A"
            p_str = "N/A"
            diagnosis = "domain_unverified"
        else:
            b = b_df[f].dropna()
            b_mean, b_std = float(b.mean()), float(b.std())
            b_mean_str = f"{b_mean:.4g} +/- {b_std:.4g}"
            if len(a) > 1 and len(b) > 1:
                t_stat, p_val = stats.ttest_ind(a, b, equal_var=False)
                p_str = f"{p_val:.2e}"
            else:
                p_val = np.nan
                p_str = "N/A"

            if not np.isnan(p_val) and p_val >= P_VALUE_THRESHOLD:
                diagnosis = "safe"
            else:
                effect_a_c = abs(c_mean - a_mean) / a_std if a_std > 0 else np.inf
                effect_b_c = abs(c_mean - b_mean) / b_std if b_std > 0 else 0.0
                if effect_a_c < ARTIFACT_EFFECT_SIZE_THRESHOLD and effect_b_c >= ARTIFACT_EFFECT_SIZE_THRESHOLD:
                    diagnosis = "artifact_signal_suspect"
                else:
                    diagnosis = "lv2_specific"

        rows.append(
            {
                "feature": f,
                "(a) lv2_human": f"{a_mean:.4g} +/- {a_std:.4g}",
                "(b) balabit_human": b_mean_str,
                "(c) lv2_macro": f"{c_mean:.4g} +/- {c_std:.4g}",
                "t_pvalue (a vs b)": p_str,
                "diagnosis": diagnosis,
            }
        )
    return pd.DataFrame(rows)


def main() -> None:
    pd.set_option("display.max_columns", None)
    pd.set_option("display.max_rows", 100)
    pd.set_option("display.width", 200)
    pd.set_option("display.max_colwidth", 60)
    pd.set_option("display.float_format", lambda v: f"{v:.4f}")

    with open(FEATURE_CONFIG_PATH, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    behavior_features = [feat for group in cfg["groups"].values() for feat in group]

    df = load_data(DATA_DIR)
    add_pre_click_path_features(df)
    df["source"] = df.apply(assign_source, axis=1)

    src_counts = df["source"].value_counts().to_dict()
    print("=== Sanity check: source row counts ===")
    print(f"  total trials: {len(df)}")
    print(f"  balabit_human: {src_counts.get('balabit_human', 0)}")
    print(f"  lv2_human:     {src_counts.get('lv2_human', 0)}")
    print(f"  lv2_macro:     {src_counts.get('lv2_macro', 0)}")
    print(f"  unknown:       {src_counts.get('unknown', 0)}")
    print()

    usable = [f for f in behavior_features if df[f].notna().any()]
    print(f"USABLE features: {len(usable)} / {len(behavior_features)}")
    print(f"  in DOMAIN_VALIDATED: {sorted(set(usable) & set(DOMAIN_VALIDATED_FEATURES))}")
    print(f"  in lv2-only group:   {sorted(set(usable) - set(DOMAIN_VALIDATED_FEATURES))}")
    print()

    df_lv2 = df[df["source"].isin({"lv2_human", "lv2_macro"})].reset_index(drop=True)
    smd_table = compute_smd_table(df_lv2, usable)

    df_a, df_b = cv_ranking(df, df_lv2, usable, smd_table)

    print("=== Step 1A: Single-feature CV ranking - Domain-validated (n=652) ===")
    print(df_a.to_string(index=False))
    print()
    print("=== Step 1B: Single-feature CV ranking - lv2-only (n=152) ===")
    print(df_b.to_string(index=False))
    print()

    cv_means = {**dict(zip(df_a["feature"], df_a["single_cv_mean"])), **dict(zip(df_b["feature"], df_b["single_cv_mean"]))}
    domain_flags = {f: (f in DOMAIN_VALIDATED_FEATURES) for f in usable}

    strong16, mod16 = correlation_pairs(df_lv2, usable, cv_means, domain_flags)
    print("=== Step 2: USABLE 16 pearson |corr| - STRONG (>=0.9) [lv2 n=152] ===")
    print(strong16.to_string(index=False) if len(strong16) else "  (no pair)")
    print()
    print("=== Step 2: USABLE 16 pearson |corr| - MODERATE (0.7~0.9) [lv2 n=152] ===")
    print(mod16.to_string(index=False) if len(mod16) else "  (no pair)")
    print()

    strong7, mod7 = correlation_pairs(df, DOMAIN_VALIDATED_FEATURES, cv_means, domain_flags)
    print("=== Step 2 (extra): Domain-validated 7 pearson |corr| (n=652) - STRONG (>=0.9) ===")
    print(strong7.to_string(index=False) if len(strong7) else "  (no pair)")
    print()
    print("=== Step 2 (extra): Domain-validated 7 pearson |corr| (n=652) - MODERATE (0.7~0.9) ===")
    print(mod7.to_string(index=False) if len(mod7) else "  (no pair)")
    print()

    trivial = trivial_recheck(df)
    print("=== Step 3: Trivial recheck - Balabit human vs lv2 human distribution ===")
    print(trivial.to_string(index=False))
    print()

    print("[note] diagnosis rules:")
    print(f"  safe                     : t-test p >= {P_VALUE_THRESHOLD} (lv2_human ~ balabit_human)")
    print(f"  artifact_signal_suspect  : p < {P_VALUE_THRESHOLD} AND |c-a|/std_a < {ARTIFACT_EFFECT_SIZE_THRESHOLD} AND |c-b|/std_b >= {ARTIFACT_EFFECT_SIZE_THRESHOLD}")
    print(f"  lv2_specific             : p < {P_VALUE_THRESHOLD}, otherwise")
    print(f"  domain_unverified        : feature not collected in Balabit (jerk_mean, hover_dwell_time_ms)")


if __name__ == "__main__":
    main()
