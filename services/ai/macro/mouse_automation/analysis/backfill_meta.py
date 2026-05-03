"""ADR-016 메타 backfill — 기존 trial.json 풀 in-place 갱신.

용도: 변환 스크립트 (jsonl_to_trial / balabit_to_trial) 가 6+2 메타 필드를
부여하도록 수정 (commit 11/12) 됐으나, 기존에 변환된 652 trial 은 메타 부재.
본 스크립트는 외부 CSV / jsonl 의존 없이 기존 trial.json 만 읽어 메타를 in-place 부여.

부여 메타:
  - root: coord_domain, screen_width, screen_height, algorithm_type, user_id
  - eventRows[*]: nx, ny  (mouse_* 이벤트만)

풀 자동 식별 (trialId 범위 + label):
  - 900001~909999 + label=human → human_lv2_collector + user_id=args.user_id
  - 900001~909999 + label=macro → lv2_bezier + user_id=null
  - 910001~910500 + label=human → human_balabit + user_id=balabit_<user>
  - 그 외 → skip + warning

실행 (cwd = services/ai/):
    # 1. dry-run (백업 X, 갱신 X, sample 10 미리보기만)
    python -m macro.mouse_automation.analysis.backfill_meta

    # 2. 실제 갱신 (백업 자동 생성 + in-place + 사후 검증)
    python -m macro.mouse_automation.analysis.backfill_meta --apply

CLI:
  --apply        실제 갱신 진행 (default: dry-run)
  --user-id      lv2_human 의 user_id (기본 lv2_001, 보겸 단일 사용자)
  --no-backup    --apply 시 백업 skip (debug 용, 권장 X)
"""
from __future__ import annotations

import argparse
import json
import random
import re
import shutil
import sys
from pathlib import Path

from macro.mouse_automation.analysis.jsonl_to_trial import (
    _add_nx_ny,
    validate_meta,
)


# === 경로 / 상수 ===

AI_ROOT = Path(__file__).resolve().parents[3]
BEHAVIOR_DIR_DEFAULT = AI_ROOT / "data" / "behavior"
BACKUP_DIR_DEFAULT = AI_ROOT / "data" / "behavior_backup_pre_meta"

EXPECTED_COUNTS = {
    "lv2_human": 51,
    "lv2_macro": 101,
    "balabit": 500,
}

LV2_RANGE = (900001, 909999)
BALABIT_RANGE = (910001, 910500)
META_KEYS = ("coord_domain", "screen_width", "screen_height", "algorithm_type", "user_id")
DRY_RUN_SAMPLE_SIZE = 10
DRY_RUN_SEED = 42

_BALABIT_USER_RE = re.compile(r"^balabit_(user\d+)_")


# === 풀 식별 / 메타 결정 ===

def determine_meta(trial: dict, lv2_user_id: str = "lv2_001") -> dict | None:
    """trialId 범위 + label 로 backfill 메타 결정. 식별 불가 시 None.

    None 반환 시 caller 가 skip + warning 로그 처리.
    """
    tid = trial.get("trialId")
    label = trial.get("label")
    if not isinstance(tid, int) or label not in ("human", "macro"):
        return None

    if LV2_RANGE[0] <= tid <= LV2_RANGE[1]:
        if label == "human":
            return {
                "coord_domain": "os_screen",
                "screen_width": None,
                "screen_height": None,
                "algorithm_type": "human_lv2_collector",
                "user_id": lv2_user_id,
            }
        if label == "macro":
            return {
                "coord_domain": "os_screen",
                "screen_width": None,
                "screen_height": None,
                "algorithm_type": "lv2_bezier",
                "user_id": None,
            }
        return None

    if BALABIT_RANGE[0] <= tid <= BALABIT_RANGE[1]:
        if label != "human":
            return None
        session_id = (trial.get("summary") or {}).get("session_id", "") or ""
        m = _BALABIT_USER_RE.match(session_id)
        user_id = f"balabit_{m.group(1)}" if m else None
        return {
            "coord_domain": "os_screen",
            "screen_width": None,
            "screen_height": None,
            "algorithm_type": "human_balabit",
            "user_id": user_id,
        }

    return None  # 범위 외


def classify_pool(trial: dict) -> str | None:
    tid = trial.get("trialId")
    label = trial.get("label")
    if not isinstance(tid, int):
        return None
    if LV2_RANGE[0] <= tid <= LV2_RANGE[1]:
        if label == "human":
            return "lv2_human"
        if label == "macro":
            return "lv2_macro"
    if BALABIT_RANGE[0] <= tid <= BALABIT_RANGE[1]:
        if label == "human":
            return "balabit"
    return None


# === backfill 본체 ===

def backfill_trial(trial: dict, meta: dict) -> dict:
    """trial dict 에 meta 6 필드 + eventRows[*] nx/ny 부여 (in-place로 사용 가능)."""
    out = dict(trial)
    for k, v in meta.items():
        out[k] = v

    screen_w = meta.get("screen_width")
    screen_h = meta.get("screen_height")
    out["eventRows"] = [
        _add_nx_ny(dict(e), screen_w, screen_h)
        for e in (trial.get("eventRows") or [])
    ]
    return out


def diff_keys(before: dict, after: dict) -> dict:
    """root 키 변화 요약: 추가 / 변경 / 동일."""
    added = sorted(set(after) - set(before))
    common = set(before) & set(after)
    changed = sorted(k for k in common if before[k] != after[k] and k != "eventRows")
    return {"added": added, "changed": changed}


# === 사후 검증 ===

def count_pools(behavior_dir: Path) -> dict[str, int]:
    counts = {k: 0 for k in EXPECTED_COUNTS}
    for path in sorted(behavior_dir.glob("trial_*.json")):
        try:
            trial = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        pool = classify_pool(trial)
        if pool in counts:
            counts[pool] += 1
    return counts


def spot_check_meta(behavior_dir: Path, sample_size: int = 10) -> list[str]:
    """sample N trial 에 6+2 필드 모두 박혔는지 체크. 누락 메시지 리스트 반환."""
    failures: list[str] = []
    rng = random.Random(DRY_RUN_SEED + 1)
    paths = list(behavior_dir.glob("trial_*.json"))
    if not paths:
        return ["no trial files"]
    for path in rng.sample(paths, min(sample_size, len(paths))):
        try:
            trial = json.loads(path.read_text(encoding="utf-8"))
        except Exception as e:
            failures.append(f"{path.name}: parse fail {e}")
            continue
        for k in META_KEYS:
            if k not in trial:
                failures.append(f"{path.name}: missing root key {k!r}")
        # eventRows[0] 이 mouse_* 면 nx/ny 키 존재 여부 spot check
        rows = trial.get("eventRows") or []
        if rows:
            first = rows[0]
            if str(first.get("event", "")).startswith("mouse"):
                if "nx" not in first or "ny" not in first:
                    failures.append(f"{path.name}: eventRows[0] missing nx/ny")
    return failures


# === main 흐름 ===

def run_dry_run(behavior_dir: Path, lv2_user_id: str) -> None:
    paths = sorted(behavior_dir.glob("trial_*.json"))
    if not paths:
        print(f"[dry-run] no trial files in {behavior_dir}")
        return

    pool_counts = {"lv2_human": 0, "lv2_macro": 0, "balabit": 0, "unknown": 0}
    warnings_total = 0
    target_paths: list[Path] = []
    for path in paths:
        try:
            trial = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            pool_counts["unknown"] += 1
            continue
        pool = classify_pool(trial)
        if pool is None:
            pool_counts["unknown"] += 1
            continue
        pool_counts[pool] += 1
        target_paths.append(path)

    print(f"[dry-run] behavior_dir = {behavior_dir}")
    print(f"[dry-run] 풀별 카운트 (식별 가능):")
    for pool, n in pool_counts.items():
        expected = EXPECTED_COUNTS.get(pool, "-")
        marker = " ✓" if pool != "unknown" and n == EXPECTED_COUNTS.get(pool) else ""
        print(f"  {pool:12s}: {n:4d}  (expected {expected}){marker}")

    rng = random.Random(DRY_RUN_SEED)
    sample_paths = rng.sample(target_paths, min(DRY_RUN_SAMPLE_SIZE, len(target_paths)))
    print(f"\n[dry-run] sample {len(sample_paths)} trial 미리보기:")
    for path in sample_paths:
        trial = json.loads(path.read_text(encoding="utf-8"))
        meta = determine_meta(trial, lv2_user_id=lv2_user_id)
        if meta is None:
            print(f"\n  --- {path.name}: 풀 식별 불가 (skip) ---")
            continue
        after = backfill_trial(trial, meta)
        diff = diff_keys(trial, after)
        first_row = (after.get("eventRows") or [None])[0]
        print(f"\n  --- {path.name} (trialId={trial.get('trialId')}, label={trial.get('label')}) ---")
        print(f"    + root keys: {diff['added']}")
        if diff["changed"]:
            print(f"    ~ root changed: {diff['changed']}")
        print(f"    meta values:")
        for k in META_KEYS:
            print(f"      {k:18s} = {after.get(k)!r}")
        if first_row and str(first_row.get("event", "")).startswith("mouse"):
            print(f"    eventRows[0] (mouse_*): nx={first_row.get('nx')!r}, ny={first_row.get('ny')!r}")
        for w in validate_meta(after):
            warnings_total += 1
            print(f"    [warn] {w}")

    print(f"\n[dry-run] sample 정합성 warning 합계: {warnings_total}")
    print("\n실제 갱신: --apply 추가 후 재실행")


def run_apply(
    behavior_dir: Path,
    backup_dir: Path,
    lv2_user_id: str,
    do_backup: bool,
) -> int:
    # Step 1: 백업
    if do_backup:
        if backup_dir.exists():
            raise SystemExit(
                f"backup dir already exists: {backup_dir}\n"
                f"수동 정리 후 재실행 (rm -rf 또는 mv)."
            )
        shutil.copytree(behavior_dir, backup_dir)
        src_n = len(list(behavior_dir.glob("trial_*.json")))
        dst_n = len(list(backup_dir.glob("trial_*.json")))
        if src_n != dst_n:
            raise SystemExit(f"backup count mismatch: src={src_n}, dst={dst_n}. abort.")
        print(f"[backup] {behavior_dir} -> {backup_dir}  ({dst_n} files)")
    else:
        print("[backup] skipped (--no-backup)")

    # Step 2: 실제 갱신
    paths = sorted(behavior_dir.glob("trial_*.json"))
    print(f"[apply] {len(paths)} trial 갱신 시작")

    updated = 0
    skipped_unknown = 0
    skipped_parse = 0
    warnings_total = 0

    for i, path in enumerate(paths, 1):
        try:
            trial = json.loads(path.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"  [skip] {path.name}: parse fail {e}")
            skipped_parse += 1
            continue

        meta = determine_meta(trial, lv2_user_id=lv2_user_id)
        if meta is None:
            print(f"  [skip] {path.name}: 풀 식별 불가 (trialId={trial.get('trialId')!r}, label={trial.get('label')!r})")
            skipped_unknown += 1
            continue

        after = backfill_trial(trial, meta)
        for w in validate_meta(after):
            warnings_total += 1
            print(f"  [warn] trial_{trial.get('trialId')}: {w}")

        path.write_text(json.dumps(after, ensure_ascii=False, indent=2), encoding="utf-8")
        updated += 1

        if i % 100 == 0:
            print(f"  ... {i}/{len(paths)} processed")

    print(f"[apply] 갱신 완료: updated={updated}, skipped_unknown={skipped_unknown}, "
          f"skipped_parse={skipped_parse}, warnings={warnings_total}")

    # Step 3: 사후 검증
    print(f"\n[verify] 카운트 검증 (expected {EXPECTED_COUNTS})")
    actual = count_pools(behavior_dir)
    print(f"[verify] actual: {actual}")
    if actual != EXPECTED_COUNTS:
        diff = {k: (EXPECTED_COUNTS[k], actual.get(k, 0)) for k in EXPECTED_COUNTS}
        print(f"[FAIL] 카운트 미일치 (expected, actual): {diff}")
        if do_backup:
            print(f"[FAIL] 복원 명령:")
            print(f"       rm -rf {behavior_dir}")
            print(f"       mv {backup_dir} {behavior_dir}")
        return 1

    print(f"[verify] 카운트 보존 OK (51/101/500)")

    failures = spot_check_meta(behavior_dir, sample_size=10)
    if failures:
        print(f"[FAIL] sample 메타 spot check 실패:")
        for f in failures:
            print(f"  - {f}")
        return 1

    print(f"[verify] sample 10 trial 6+2 필드 spot check OK")
    print(f"[OK] backfill_meta apply 완료")
    return 0


def main():
    parser = argparse.ArgumentParser(
        description="ADR-016 메타 backfill — 기존 trial.json in-place 갱신",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="실제 갱신 진행. 명시 안 하면 dry-run (sample 10 미리보기만).",
    )
    parser.add_argument(
        "--user-id",
        default="lv2_001",
        help="lv2_human (label=human) 의 user_id (기본 lv2_001, 보겸 단일 사용자)",
    )
    parser.add_argument(
        "--no-backup",
        action="store_true",
        help="--apply 시 백업 skip (debug 용, 권장 X)",
    )
    parser.add_argument(
        "--behavior-dir",
        type=Path,
        default=BEHAVIOR_DIR_DEFAULT,
        help=f"기본 {BEHAVIOR_DIR_DEFAULT}",
    )
    parser.add_argument(
        "--backup-dir",
        type=Path,
        default=BACKUP_DIR_DEFAULT,
        help=f"기본 {BACKUP_DIR_DEFAULT}",
    )
    args = parser.parse_args()

    if not args.behavior_dir.exists():
        raise SystemExit(f"behavior_dir not found: {args.behavior_dir}")

    if args.apply:
        rc = run_apply(
            behavior_dir=args.behavior_dir,
            backup_dir=args.backup_dir,
            lv2_user_id=args.user_id,
            do_backup=not args.no_backup,
        )
        sys.exit(rc)
    else:
        run_dry_run(behavior_dir=args.behavior_dir, lv2_user_id=args.user_id)


if __name__ == "__main__":
    main()
