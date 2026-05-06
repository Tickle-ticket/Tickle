import json
import os
from typing import Any

import psycopg2
from psycopg2.extras import execute_values

from serving.schemas import DetectionResult


POSTGRES_HOST = os.getenv("POSTGRES_HOST", "postgres")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", "5432"))
POSTGRES_DB = os.getenv("POSTGRES_DB", "behavior_features")
POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")


def get_db_connection():
    return psycopg2.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        dbname=POSTGRES_DB,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
    )


def build_insert_rows(
    detection_results: list[DetectionResult],
) -> list[tuple[Any, ...]]:
    rows = []

    for result in detection_results:
        payload = result.item.payload

        rows.append(
            (
                result.record_id,
                payload["type"],
                payload.get("scheduleId") or payload.get("schedule_id"),
                payload.get("eventId") or payload.get("event_id"),
                payload.get("eventDate") or payload.get("event_date"),
                payload.get("createdAt"),
                result.label,
                result.p_macro,
                json.dumps(payload["features"], ensure_ascii=False),
            )
        )

    return rows


def insert_behavior_feature_records(
    conn,
    detection_results: list[DetectionResult],
) -> None:
    rows = build_insert_rows(detection_results)

    if not rows:
        return

    query = """
        INSERT INTO behavior_feature_records (
            record_id,
            type,
            schedule_id,
            event_id,
            event_date,
            created_at_client,
            label,
            p_macro,
            features
        )
        VALUES %s
        ON CONFLICT (record_id) DO NOTHING
    """

    with conn.cursor() as cursor:
        execute_values(
            cursor,
            query,
            rows,
            template="(%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)",
        )

    conn.commit()
