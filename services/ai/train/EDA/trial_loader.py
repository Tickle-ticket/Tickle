"""
Phase A: trial_*.json 로더 + eventRows DataFrame 변환 + 그룹 샘플링.

시각화 의존성 없음 (matplotlib import 금지). pure I/O + pandas.

그룹 정의:
  - lv2_human  : trialId 900001~909999 AND label == "human"
  - lv2_macro  : trialId 900001~909999 AND label == "macro"
  - balabit    : trialId 910001~910500

Balabit user_id: summary.session_id 가
  f"balabit_{user_name}_{sess_label}_chunk_{ci:03d}" 형식
  (services/ai/macro/mouse_automation/analysis/balabit_to_trial.py:420)
"""

from __future__ import annotations

import json
import random
import re
from collections import defaultdict
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT.parent.parent / "data" / "behavior"

LV2_RANGE = (900001, 909999)
BALABIT_RANGE = (910001, 910500)
GROUPS = ("lv2_human", "lv2_macro", "balabit")

DEFAULT_SAMPLE_N = {"lv2_human": 16, "lv2_macro": 16, "balabit": 20}

_BALABIT_USER_RE = re.compile(r"^balabit_(user\d+)_")


def load_trial(trial_id: int, data_dir: Path = DATA_DIR) -> dict:
    path = Path(data_dir) / f"trial_{trial_id}.json"
    return json.loads(path.read_text(encoding="utf-8"))


def parse_balabit_user(session_id: str | None) -> str | None:
    if not session_id:
        return None
    m = _BALABIT_USER_RE.match(session_id)
    return m.group(1) if m else None


def _trial_id_from_path(path: Path) -> int | None:
    stem = path.stem
    if not stem.startswith("trial_"):
        return None
    try:
        return int(stem.split("_", 1)[1])
    except ValueError:
        return None


def _in_range(trial_id: int, rng: tuple[int, int]) -> bool:
    return rng[0] <= trial_id <= rng[1]


def list_trials_by_group(group: str, data_dir: Path = DATA_DIR) -> list[dict]:
    """그룹별 trial 메타 리스트. eventRows 는 읽지 않음 (가벼운 indexing)."""
    if group not in GROUPS:
        raise ValueError(f"unknown group {group!r}, expected one of {GROUPS}")

    data_dir = Path(data_dir)
    metas: list[dict] = []
    for path in sorted(data_dir.glob("trial_*.json")):
        trial_id = _trial_id_from_path(path)
        if trial_id is None:
            continue

        if group.startswith("lv2") and not _in_range(trial_id, LV2_RANGE):
            continue
        if group == "balabit" and not _in_range(trial_id, BALABIT_RANGE):
            continue

        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as e:
            print(f"[trial_loader] skip {path.name}: {e}")
            continue

        label = data.get("label")
        if group == "lv2_human" and label != "human":
            continue
        if group == "lv2_macro" and label != "macro":
            continue

        summary = data.get("summary") or {}
        event_count = int(summary.get("eventCount") or 0)
        if event_count == 0:
            print(f"[trial_loader] skip {path.name}: empty eventRows")
            continue

        meta = {
            "trial_id": trial_id,
            "label": label,
            "session_id": summary.get("session_id"),
            "source": summary.get("source"),
            "event_count": event_count,
            "duration_ms": summary.get("durationMs"),
            "click_count": summary.get("clickCount"),
            "path": path,
        }
        if group == "balabit":
            meta["user_id"] = parse_balabit_user(meta["session_id"])
        metas.append(meta)

    return metas


def event_rows_to_df(trial: dict) -> pd.DataFrame:
    """eventRows -> DataFrame.
    컬럼: ts_ms, event, x, y, dx, dy, dt_ms, speed, button (+ is_click, is_move).
    누락 키는 NaN. 첫 mouse_move 의 dt_ms/speed 는 NaN 가능."""
    rows = trial.get("eventRows") or []
    df = pd.DataFrame(rows)
    if df.empty:
        return df

    expected_cols = ["ts_ms", "event", "x", "y", "dx", "dy", "dt_ms", "speed", "button"]
    for col in expected_cols:
        if col not in df.columns:
            df[col] = pd.NA

    df["is_click"] = df["event"] == "mouse_click"
    df["is_move"] = df["event"] == "mouse_move"
    return df[expected_cols + ["is_click", "is_move"]]


def sample_trials(
    group: str,
    n: int | None = None,
    seed: int = 42,
    data_dir: Path = DATA_DIR,
) -> list[dict]:
    """그룹 sampling. lv2_*: random. balabit: user 별 stratified (각 user 2 trial 우선)."""
    metas = list_trials_by_group(group, data_dir=data_dir)
    if not metas:
        return []

    n = n if n is not None else DEFAULT_SAMPLE_N[group]
    rng = random.Random(seed)

    if group != "balabit":
        if len(metas) <= n:
            return metas
        return rng.sample(metas, n)

    # balabit: user 당 최대 2개 우선 + 부족분 random fill
    by_user: dict[str | None, list[dict]] = defaultdict(list)
    for m in metas:
        by_user[m.get("user_id")].append(m)

    picked: list[dict] = []
    used_paths: set[Path] = set()
    per_user = max(1, n // max(1, len(by_user)))

    for user, items in sorted(by_user.items(), key=lambda kv: (kv[0] is None, kv[0])):
        shuffled = items[:]
        rng.shuffle(shuffled)
        for m in shuffled[:per_user]:
            picked.append(m)
            used_paths.add(m["path"])

    if len(picked) < n:
        leftover = [m for m in metas if m["path"] not in used_paths]
        rng.shuffle(leftover)
        picked.extend(leftover[: n - len(picked)])

    return picked[:n]
