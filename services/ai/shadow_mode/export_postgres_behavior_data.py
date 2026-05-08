import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor


def utc_now_compact() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def load_env_file(env_path: Path) -> None:
    """
    Minimal .env loader:
    - Supports KEY=VALUE (VALUE may be quoted)
    - Ignores blank lines and lines starting with '#'
    - Does not override existing environment variables
    """
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()

        if not key or key in os.environ:
            continue

        if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
            value = value[1:-1]

        os.environ[key] = value


def connect_db():
    host = (os.getenv("POSTGRES_HOST") or "").strip() or "localhost"
    port = os.getenv("POSTGRES_PORT")
    dbname = os.getenv("POSTGRES_DB")
    user = os.getenv("POSTGRES_USER")
    password = os.getenv("POSTGRES_PASSWORD")

    missing = [k for k, v in {
        "POSTGRES_PORT": port,
        "POSTGRES_DB": dbname,
        "POSTGRES_USER": user,
        "POSTGRES_PASSWORD": password,
    }.items() if not v]
    if missing:
        raise RuntimeError(
            "PostgreSQL 접속 정보가 비어있습니다: "
            + ", ".join(missing)
            + ". `.env`를 로드하거나 환경변수를 설정하세요."
        )

    return psycopg2.connect(
        host=host,
        port=int(port),
        dbname=dbname,
        user=user,
        password=password,
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "PostgreSQL의 behavior_feature_records에서 학습용 데이터를 추출합니다.\n"
            "- 출력 필드: trialID, label, features(=기존 metrics)\n"
            "- trialID는 마지막 trialID를 입력받아 다음 값부터 순차 부여합니다."
        )
    )
    # Default to a relative path so running from `services/ai/shadow_mode` works naturally.
    default_env = Path("..") / "docker" / ".env"
    parser.add_argument(
        "--env-file",
        default=str(default_env),
        help="docker-compose에서 사용하는 .env 경로(기본값: services/ai/docker/.env).",
    )
    parser.add_argument(
        "--out",
        default=None,
        help=(
            "출력 JSONL 경로. 미지정 시 services/ai/data/behavior_exports/ 아래에 "
            "타임스탬프 파일로 생성합니다."
        ),
    )
    parser.add_argument(
        "--from-db-id",
        type=int,
        default=0,
        help="이전에 내보낸 마지막 DB id(behavior_feature_records.id). 기본값 0(처음부터).",
    )
    parser.add_argument("--limit", type=int, default=None, help="이번 실행에서 최대 N건만 추출.")
    parser.add_argument("--batch-size", type=int, default=2000, help="DB에서 한 번에 읽을 row 수.")

    args = parser.parse_args()

    load_env_file(Path(args.env_file))

    if args.out:
        out_path = Path(args.out)
    else:
        out_path = (
            Path(__file__).resolve().parents[1]
            / "data"
            / "behavior_exports"
            / f"behavior_trials_{utc_now_compact()}.jsonl"
        )
    out_path.parent.mkdir(parents=True, exist_ok=True)

    last_db_id = int(args.from_db_id)
    remaining = args.limit
    next_trial_id = 1

    exported = 0
    max_db_id_seen = last_db_id

    conn = connect_db()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur, out_path.open(
            "a", encoding="utf-8"
        ) as out:
            while True:
                if remaining is not None and remaining <= 0:
                    break

                page_size = args.batch_size
                if remaining is not None:
                    page_size = min(page_size, remaining)

                cur.execute(
                    """
                    SELECT id, label, features
                    FROM public.behavior_feature_records
                    WHERE id > %s
                    ORDER BY id
                    LIMIT %s
                    """,
                    (last_db_id, page_size),
                )

                rows = cur.fetchall()
                if not rows:
                    break

                for row in rows:
                    payload = {
                        "trialID": next_trial_id,
                        "label": row["label"],
                        "features": row["features"],
                    }
                    out.write(json.dumps(payload, ensure_ascii=False) + "\n")
                    next_trial_id += 1

                exported += len(rows)
                max_db_id_seen = int(rows[-1]["id"])
                last_db_id = max_db_id_seen

                if remaining is not None:
                    remaining -= len(rows)

    finally:
        conn.close()

    print(
        json.dumps(
            {
                "exported": exported,
                "out": str(out_path),
                "last_db_id": max_db_id_seen,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
