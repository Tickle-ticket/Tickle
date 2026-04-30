"""
Feature 재선정 분석 (ai-feat-295, 1회성)

도메인 검증 풀 14개 (Balabit metrics 후처리 보강 후) 기준 3개 분석 출력:
1. USABLE 단독 CV ranking — 3-state 그룹 분리
   A. both          — lv2/Balabit 둘 다 채워진 feature (n=652, 진짜 분리력)
   B. balabit_only  — Balabit 만 채워진 feature (n=652, lv2 측 imputed → lv2 vs Balabit 분리력만)
   C. lv2_only      — lv2 만 채워진 feature (n=152, lv2 내부 분리력)
2. pearson |corr| — USABLE_LV2 16개 (n=152) + both 그룹 (n=652)
3. mouse 9개 트리비얼 재점검: lv2_human / balabit_human / lv2_macro 분포 비교

도메인 라벨 자동 판정:
  - balabit_filled = (Balabit 500 trial 의 not-null 비율 ≥ 0.5)
  - lv2_filled     = (lv2 152 trial 의 not-null 비율 ≥ 0.5)
  - both / balabit_only / lv2_only / none 으로 라벨

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

# Balabit metrics 가 채우는 14개 (balabit_to_trial 7 + balabit_metrics_augment 7)
# 자동 도메인 판정에 우선 후보로 사용 (실제 라벨은 not-null 비율 기반).
BALABIT_FILLED_FEATURES = (
    # balabit_to_trial.py — extract_seven_features (7)
    "inter_click_interval_ms",
    "mouse_total_travel_distance_px",
    "mouse_avg_speed_px_per_ms",
    "mouse_max_speed_px_per_ms",
    "mouse_speed_change_mean",
    "mouse_acceleration_mean",
    "mouse_path_curvature_mean",
    # balabit_metrics_augment.py — compute_augmented_metrics (7)
    "mouse_jerk_mean",
    "mouse_path_straightness_score",
    "mouse_direction_change_count",
    "pre_click_path_300ms_total_distance_px",
    "pre_click_path_300ms_straightness",
    "pre_click_path_500ms_total_distance_px",
    "pre_click_path_500ms_straightness",
)

# 트리비얼 재점검 풀 (Balabit/lv2 둘 다 수집, hover_dwell 제외)
TRIVIAL_RECHECK_FEATURES = [
    "mouse_path_curvature_mean",
    "mouse_total_travel_distance_px",
    "mouse_speed_change_mean",
    "mouse_avg_speed_px_per_ms",
    "mouse_max_speed_px_per_ms",
    "mouse_acceleration_mean",
    "mouse_jerk_mean",
    "mouse_path_straightness_score",
    "mouse_direction_change_count",
]
# 참고용: Balabit 미수집이라 t-test 불가
TRIVIAL_DOMAIN_UNVERIFIED = ("mouse_hover_dwell_time_ms",)

BALABIT_TRIAL_MIN, BALABIT_TRIAL_MAX = 910001, 910500
LV2_TRIAL_MIN, LV2_TRIAL_MAX = 900001, 909999

DOMAIN_FILL_THRESHOLD = 0.5
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
    """raw 문자열 컬럼 (lv2 측 일부) 을 숫자 4개로 분리. metrics 가 이미 숫자면 무영향."""
    for sec in [300, 500]:
        col = f"pre_click_mouse_path_pattern_{sec}ms"
        if col not in df.columns:
            continue
        parts = df[col].fillna("").astype(str).str.split("|", n=1, expand=True)
        distance_text = parts[0].str.replace("px", "", regex=False).str.strip()
        straightness_text = (
            parts[1].str.replace("straight", "", regex=False).str.strip()
            if 1 in parts.columns
            else pd.Series([""] * len(df))
        )
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


def determine_domain_state(df: pd.DataFrame, feature: str, threshold: float = DOMAIN_FILL_THRESHOLD) -> str:
    """3-state 도메인 라벨: both / balabit_only / lv2_only / none."""
    bal = df[df["source"] == "balabit_human"]
    lv2 = df[df["source"].isin({"lv2_human", "lv2_macro"})]
    bal_filled = bal[feature].notna().mean() if len(bal) else 0.0
    lv2_filled = lv2[feature].notna().mean() if len(lv2) else 0.0
    bal_ok = bal_filled >= threshold
    lv2_ok = lv2_filled >= threshold
    if bal_ok and lv2_ok:
        return "both"
    if bal_ok and not lv2_ok:
        return "balabit_only"
    if not bal_ok and lv2_ok:
        return "lv2_only"
    return "none"


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
            rows.append({"feature": f, "abs_SMD": np.nan})
            continue
        pooled_std = np.sqrt((h_s.std() ** 2 + m_s.std() ** 2) / 2)
        smd = (h_s.mean() - m_s.mean()) / pooled_std if pooled_std and not np.isnan(pooled_std) else np.nan
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


def cv_ranking(
    df_full: pd.DataFrame,
    df_lv2: pd.DataFrame,
    usable_full: list[str],
    domain_state: dict[str, str],
    smd: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """3-state 그룹별 단독 cv ranking. 반환: (both, balabit_only, lv2_only)"""
    rows_both, rows_bal, rows_lv2 = [], [], []
    smd_idx = smd.set_index("feature")
    for f in usable_full:
        ds = domain_state.get(f, "none")
        if ds == "both" or ds == "balabit_only":
            mean_, std_ = single_feature_cv(df_full, f)
            n = len(df_full)
        elif ds == "lv2_only":
            mean_, std_ = single_feature_cv(df_lv2, f)
            n = len(df_lv2)
        else:
            continue
        row = {
            "feature": f,
            "single_cv_mean": mean_,
            "single_cv_std": std_,
            "n_trials": n,
            "domain_state": ds,
            "abs_SMD": smd_idx.loc[f, "abs_SMD"] if f in smd_idx.index else np.nan,
            "SMD_level": smd_idx.loc[f, "SMD_level"] if f in smd_idx.index else "n/a",
        }
        if ds == "both":
            rows_both.append(row)
        elif ds == "balabit_only":
            rows_bal.append(row)
        else:
            rows_lv2.append(row)

    def to_df(rows):
        return pd.DataFrame(rows).sort_values("single_cv_mean", ascending=False).reset_index(drop=True)

    return to_df(rows_both), to_df(rows_bal), to_df(rows_lv2)


def correlation_pairs(
    df: pd.DataFrame,
    features: list[str],
    cv_means: dict[str, float],
    domain_state: dict[str, str],
    strong_thr: float = 0.9,
    mod_thr: float = 0.7,
) -> tuple[pd.DataFrame, pd.DataFrame]:
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
                        "feature_a_ds": domain_state.get(fa, "n/a"),
                        "feature_b_ds": domain_state.get(fb, "n/a"),
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
        b = b_df[f].dropna()
        c = c_df[f].dropna()
        a_mean, a_std = float(a.mean()), float(a.std())
        b_mean, b_std = float(b.mean()), float(b.std())
        c_mean, c_std = float(c.mean()), float(c.std())

        if len(b) == 0:
            b_mean_str = "N/A"
            p_str = "N/A"
            diagnosis = "domain_unverified"
        else:
            b_mean_str = f"{b_mean:.4g} +/- {b_std:.4g}"
            if len(a) > 1 and len(b) > 1:
                _, p_val = stats.ttest_ind(a, b, equal_var=False)
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
    pd.set_option("display.width", 220)
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
    print(f"  total trials:  {len(df)}")
    print(f"  balabit_human: {src_counts.get('balabit_human', 0)}")
    print(f"  lv2_human:     {src_counts.get('lv2_human', 0)}")
    print(f"  lv2_macro:     {src_counts.get('lv2_macro', 0)}")
    print(f"  unknown:       {src_counts.get('unknown', 0)}")
    print()

    df_lv2 = df[df["source"].isin({"lv2_human", "lv2_macro"})].reset_index(drop=True)

    usable_full = [f for f in behavior_features if df[f].notna().any()]
    usable_lv2 = [f for f in behavior_features if df_lv2[f].notna().any()]

    domain_state = {f: determine_domain_state(df, f) for f in usable_full}
    state_counts = {}
    for v in domain_state.values():
        state_counts[v] = state_counts.get(v, 0) + 1

    print(f"USABLE_FULL (lv2 ∪ Balabit not-null): {len(usable_full)} / {len(behavior_features)}")
    print(f"USABLE_LV2  (lv2-only not-null):      {len(usable_lv2)}")
    print(f"domain_state counts: {state_counts}")
    print(f"  both:         {sorted(f for f, s in domain_state.items() if s == 'both')}")
    print(f"  balabit_only: {sorted(f for f, s in domain_state.items() if s == 'balabit_only')}")
    print(f"  lv2_only:     {sorted(f for f, s in domain_state.items() if s == 'lv2_only')}")
    print()

    smd_table = compute_smd_table(df_lv2, usable_full)

    df_a, df_b, df_c = cv_ranking(df, df_lv2, usable_full, domain_state, smd_table)

    print(f"=== Step 1A: Single-feature CV ranking - both (n={len(df)}, real separation power) ===")
    print(df_a.to_string(index=False) if len(df_a) else "  (empty)")
    print()
    print(f"=== Step 1B: Single-feature CV ranking - balabit_only (n={len(df)}, lv2 vs Balabit separation only) ===")
    print(f"    (lv2 측은 100% null -> median imputation: cv 점수는 'lv2 imputed value vs Balabit actual' 분리력)")
    print(df_b.to_string(index=False) if len(df_b) else "  (empty)")
    print()
    print(f"=== Step 1C: Single-feature CV ranking - lv2_only (n={len(df_lv2)}, lv2 internal separation) ===")
    print(df_c.to_string(index=False) if len(df_c) else "  (empty)")
    print()

    cv_means: dict[str, float] = {}
    for sub_df in (df_a, df_b, df_c):
        cv_means.update(dict(zip(sub_df["feature"], sub_df["single_cv_mean"])))

    strong_lv2, mod_lv2 = correlation_pairs(df_lv2, usable_lv2, cv_means, domain_state)
    print(f"=== Step 2: pearson |corr| - USABLE_LV2 {len(usable_lv2)} (n={len(df_lv2)}) STRONG (>=0.9) ===")
    print(strong_lv2.to_string(index=False) if len(strong_lv2) else "  (no pair)")
    print()
    print(f"=== Step 2: pearson |corr| - USABLE_LV2 {len(usable_lv2)} (n={len(df_lv2)}) MODERATE (0.7~0.9) ===")
    print(mod_lv2.to_string(index=False) if len(mod_lv2) else "  (no pair)")
    print()

    both_features = sorted(f for f, s in domain_state.items() if s == "both")
    strong_both, mod_both = correlation_pairs(df, both_features, cv_means, domain_state)
    print(f"=== Step 2 (extra): pearson |corr| - both {len(both_features)} (n={len(df)}) STRONG (>=0.9) ===")
    print(strong_both.to_string(index=False) if len(strong_both) else "  (no pair)")
    print()
    print(f"=== Step 2 (extra): pearson |corr| - both {len(both_features)} (n={len(df)}) MODERATE (0.7~0.9) ===")
    print(mod_both.to_string(index=False) if len(mod_both) else "  (no pair)")
    print()

    trivial = trivial_recheck(df)
    print(f"=== Step 3: Trivial recheck - {len(TRIVIAL_RECHECK_FEATURES)} features, lv2_human vs balabit_human distribution ===")
    print(trivial.to_string(index=False))
    print()

    print("[note] hover_dwell_time_ms 는 Balabit 미수집 -> 트리비얼 재점검 풀에서 제외 (domain_unverified)")
    print(f"[note] diagnosis rules:")
    print(f"  safe                     : t-test p >= {P_VALUE_THRESHOLD} (lv2_human ~ balabit_human)")
    print(f"  artifact_signal_suspect  : p < {P_VALUE_THRESHOLD} AND |c-a|/std_a < {ARTIFACT_EFFECT_SIZE_THRESHOLD} AND |c-b|/std_b >= {ARTIFACT_EFFECT_SIZE_THRESHOLD}")
    print(f"  lv2_specific             : p < {P_VALUE_THRESHOLD}, otherwise")


if __name__ == "__main__":
    main()
