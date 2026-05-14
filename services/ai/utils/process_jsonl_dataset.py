from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:
    from .jsonl_to_json import JsonRecord, _record_to_trial, read_jsonl
    from .split_by_label import resolve_label
    from .split_by_type import resolve_type
except ImportError:
    # When executed as a script: python services/ai/utils/process_jsonl_dataset.py ...
    from jsonl_to_json import JsonRecord, _record_to_trial, read_jsonl
    from split_by_label import resolve_label
    from split_by_type import resolve_type


def _get_feature_value(record: JsonRecord, feature_key: str) -> Any:
    """Return feature value from common shapes: record['metrics'] or record['features']."""
    metrics = record.get("metrics")
    if isinstance(metrics, dict) and feature_key in metrics:
        return metrics.get(feature_key)
    features = record.get("features")
    if isinstance(features, dict) and feature_key in features:
        return features.get(feature_key)
    return None


def _safe_dir_name(value: str, *, fallback: str) -> str:
    text = (value or "").strip().lower()
    if not text:
        return fallback
    # Minimal sanitization for Windows paths
    for ch in '<>:"/\\|?*':
        text = text.replace(ch, "_")
    return text


def _normalize_stage(value: str) -> str:
    """Canonicalize stage/type folder name to DETAIL/CAPTCHA/BOOKING when possible."""
    upper = (value or "").strip().upper()
    if upper in {"DETAIL", "CAPTCHA", "BOOKING"}:
        return upper
    for token in ("DETAIL", "CAPTCHA", "BOOKING"):
        if token in upper:
            return token
    return (value or "").strip()


def _normalize_label_allow_block(value: str) -> str:
    """
    Canonicalize label folder name to ALLOW/BLOCK.
    Accepts inputs: allow/block/human/macro (case-insensitive).
    """
    text = (value or "").strip().lower()
    if text in {"allow", "human"}:
        return "ALLOW"
    if text in {"block", "macro"}:
        return "BLOCK"
    return (value or "").strip()


def process_jsonl_folder(
    input_dir: str | Path,
    *,
    output_root: str | Path | None = None,
    pattern: str = "*.jsonl",
    # Version split config
    version_feature_key: str = "time_from_element_clickable_to_click_ms",
    v1_name: str = "v1",
    v2_name: str = "v2",
    # Type split config
    type_key: str = "stage",
    type_prefix: str = "",
    unknown_type_name: str = "unknown",
    # Label split config
    label_key: str = "label",
    label_prefix: str = "",
    unknown_label_name: str = "unknown",
    # Normalization
    normalize_trial: bool = True,
    indent: int | None = 2,
) -> dict[str, Any]:
    """
    Pipeline:
      jsonl folder -> (record -> json) -> version(v1/v2) -> type -> label

    Output structure:
      <output_root>/<input_dir_name>_<vX>/<type_prefix><type>/<label_prefix><label>/trial_XXXXX.json

    Notes:
    - version rule: version_feature_key is None/null -> v1, else -> v2
    - type: read by dotted key (default 'stage', fallback 'summary.stage')
    - label: uses resolve_label (label_key, fallback summary.label)
    """
    source_dir = Path(input_dir).expanduser().resolve()
    if not source_dir.is_dir():
        raise ValueError(f"Expected input_dir directory: {source_dir}")

    root = Path(output_root).expanduser().resolve() if output_root else source_dir.parent
    dataset_name = source_dir.name

    scanned_files = 0
    scanned_records = 0
    written = 0
    bucket_counts: dict[str, int] = {}

    # Track ids per output leaf to avoid collisions
    existing_names: dict[Path, set[str]] = {}

    for jsonl_path in sorted(source_dir.glob(pattern)):
        if not jsonl_path.is_file():
            continue
        scanned_files += 1

        for record_index, record in enumerate(read_jsonl(jsonl_path), start=1):
            scanned_records += 1

            out_record = _record_to_trial(record) if normalize_trial else record

            # Version
            feature_value = _get_feature_value(out_record, version_feature_key)
            version = v1_name if feature_value is None else v2_name
            version_dir = root / f"{dataset_name}_{version}"

            # Type
            raw_type = resolve_type(out_record, type_key)
            type_name = _normalize_stage(raw_type) or unknown_type_name
            type_name = _safe_dir_name(type_name, fallback=unknown_type_name)
            type_dir = version_dir / f"{type_prefix}{type_name}"

            # Label
            raw_label = resolve_label(out_record, label_key)
            label_name = _normalize_label_allow_block(raw_label) or unknown_label_name
            label_name = _safe_dir_name(label_name, fallback=unknown_label_name)
            label_dir = type_dir / f"{label_prefix}{label_name}"

            label_dir.mkdir(parents=True, exist_ok=True)

            # Filename
            trial_id = out_record.get("trialId", out_record.get("trialID", scanned_records))
            try:
                trial_no = int(trial_id)
                filename = f"trial_{trial_no:05d}.json"
            except (TypeError, ValueError):
                filename = f"trial_{scanned_records:05d}.json"

            used = existing_names.setdefault(label_dir, set())
            if filename in used:
                filename = f"trial_{scanned_records:05d}.json"
            used.add(filename)

            (label_dir / filename).write_text(
                json.dumps(out_record, ensure_ascii=False, indent=indent) + "\n",
                encoding="utf-8",
            )

            written += 1
            bucket_key = f"{version}/{type_name}/{label_name}"
            bucket_counts[bucket_key] = bucket_counts.get(bucket_key, 0) + 1

    return {
        "input_dir": str(source_dir),
        "output_root": str(root),
        "pattern": pattern,
        "scanned_files": scanned_files,
        "scanned_records": scanned_records,
        "written": written,
        "version_feature_key": version_feature_key,
        "type_key": type_key,
        "label_key": label_key,
        "buckets": bucket_counts,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="JSONL dataset pipeline: json 변환 -> 버전 분리 -> type 분리 -> label 분리"
    )
    parser.add_argument("input_dir", help="JSONL 파일들이 들어있는 폴더 경로")
    parser.add_argument("--output-root", default=None, help="출력 루트(기본: input_dir의 부모)")
    parser.add_argument("--pattern", default="*.jsonl", help="입력 JSONL glob pattern (기본: *.jsonl)")

    parser.add_argument(
        "--version-feature-key",
        default="time_from_element_clickable_to_click_ms",
        help="버전 판별 feature key (None이면 v1, 값 있으면 v2)",
    )
    parser.add_argument("--v1-name", default="v1", help="v1 폴더 suffix (기본: v1)")
    parser.add_argument("--v2-name", default="v2", help="v2 폴더 suffix (기본: v2)")

    parser.add_argument(
        "--type-key",
        default="stage",
        help="type/stage 도트키 (기본: stage). 키가 없으면 type/summary.stage/summary.type도 자동으로 시도하며 DETAIL/CAPTCHA/BOOKING으로 정규화합니다.",
    )
    parser.add_argument("--type-prefix", default="", help="type 폴더 prefix (기본: 없음). 예: type_ 를 넣으면 type_DETAIL 형태")
    parser.add_argument("--unknown-type", default="unknown", help="type이 없을 때 폴더명 (기본: unknown)")

    parser.add_argument("--label-key", default="label", help="label 도트키 (기본: label, fallback: summary.label)")
    parser.add_argument("--label-prefix", default="", help="label 폴더 prefix (기본: 없음). 예: label_ 를 넣으면 label_ALLOW 형태")
    parser.add_argument("--unknown-label", default="unknown", help="label이 없을 때 폴더명 (기본: unknown)")

    parser.add_argument(
        "--keep-db-shape",
        action="store_true",
        help="DB export shape(trialID/features)를 trial shape(trialId/metrics)로 정규화하지 않음",
    )
    parser.add_argument("--compact", action="store_true", help="JSON을 compact로 저장(indent 없음)")

    args = parser.parse_args()

    result = process_jsonl_folder(
        args.input_dir,
        output_root=args.output_root,
        pattern=args.pattern,
        version_feature_key=args.version_feature_key,
        v1_name=args.v1_name,
        v2_name=args.v2_name,
        type_key=args.type_key,
        type_prefix=args.type_prefix,
        unknown_type_name=args.unknown_type,
        label_key=args.label_key,
        label_prefix=args.label_prefix,
        unknown_label_name=args.unknown_label,
        normalize_trial=not args.keep_db_shape,
        indent=None if args.compact else 2,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
