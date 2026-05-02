import json
import os
import time
import uuid
from typing import Any

import psycopg2
from psycopg2.extras import execute_values
from confluent_kafka import Consumer, KafkaException, Message

from serving.macro_predictor import create_predictor


KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC_BEHAVIOR_EVENTS", "behavior-events-v1")
KAFKA_CONSUMER_GROUP_ID = os.getenv("KAFKA_CONSUMER_GROUP_ID", "ai-worker-group-v1")

POSTGRES_HOST = os.getenv("POSTGRES_HOST", "postgres")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", "5432"))
POSTGRES_DB = os.getenv("POSTGRES_DB", "behavior_features")
POSTGRES_USER = os.getenv("POSTGRES_USER", "chan")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "change-me")

BATCH_SIZE = int(os.getenv("AI_WORKER_BATCH_SIZE", "16"))
FLUSH_INTERVAL_SEC = float(os.getenv("AI_WORKER_FLUSH_INTERVAL_SEC", "0.2"))


def create_consumer() -> Consumer:
    return Consumer(
        {
            "bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS,
            "group.id": KAFKA_CONSUMER_GROUP_ID,
            "auto.offset.reset": "earliest",
            "enable.auto.commit": False,
        }
    )


def get_db_connection():
    return psycopg2.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        dbname=POSTGRES_DB,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
    )


def make_record_id() -> str:
    return f"rec_{uuid.uuid4().hex[:16]}"


def build_insert_rows(
    payloads: list[dict[str, Any]],
    predictions: list[tuple[str, float]],
) -> list[tuple[Any, ...]]:
    rows = []

    for payload, (label, p_macro) in zip(payloads, predictions):
        rows.append(
            (
                make_record_id(),
                payload["type"],
                payload.get("schedule_id"),
                payload.get("name"),
                payload.get("event_date"),
                payload.get("createdAt"),
                label,
                p_macro,
                json.dumps(payload["features"], ensure_ascii=False),
            )
        )

    return rows


def insert_behavior_feature_records(conn, rows: list[tuple[Any, ...]]) -> None:
    if not rows:
        return

    query = """
        INSERT INTO behavior_feature_records (
            record_id,
            type,
            schedule_id,
            name,
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


def parse_message(msg: Message) -> dict[str, Any]:
    return json.loads(msg.value().decode("utf-8"))


def should_flush(
    batch_payloads: list[dict[str, Any]],
    last_flush_time: float,
) -> bool:
    if not batch_payloads:
        return False

    batch_full = len(batch_payloads) >= BATCH_SIZE
    timeout_reached = (time.monotonic() - last_flush_time) >= FLUSH_INTERVAL_SEC

    return batch_full or timeout_reached


def process_batch(
    conn,
    predictor,
    batch_payloads: list[dict[str, Any]],
) -> int:
    if not batch_payloads:
        return 0

    features_list = [payload["features"] for payload in batch_payloads]

    predictions = predictor.predict_batch(features_list)
    rows = build_insert_rows(batch_payloads, predictions)

    insert_behavior_feature_records(conn, rows)

    return len(rows)


def commit_batch(consumer: Consumer, batch_messages: list[Message]) -> None:
    if not batch_messages:
        return

    last_message = batch_messages[-1]
    consumer.commit(message=last_message, asynchronous=False)


def main():
    predictor = create_predictor()
    consumer = create_consumer()
    conn = get_db_connection()

    consumer.subscribe([KAFKA_TOPIC])

    batch_messages: list[Message] = []
    batch_payloads: list[dict[str, Any]] = []
    last_flush_time = time.monotonic()

    print(
        f"[ai-worker] started, topic={KAFKA_TOPIC}, "
        f"group_id={KAFKA_CONSUMER_GROUP_ID}, "
        f"batch_size={BATCH_SIZE}, "
        f"flush_interval_sec={FLUSH_INTERVAL_SEC}"
    )

    try:
        while True:
            msg = consumer.poll(0.05)

            if msg is not None:
                if msg.error():
                    raise KafkaException(msg.error())

                try:
                    payload = parse_message(msg)
                    batch_messages.append(msg)
                    batch_payloads.append(payload)

                except Exception as e:
                    print(f"[ai-worker] failed to parse message: {e}")
                    consumer.commit(message=msg, asynchronous=False)

            if should_flush(batch_payloads, last_flush_time):
                started_at = time.perf_counter()

                try:
                    processed_count = process_batch(
                        conn=conn,
                        predictor=predictor,
                        batch_payloads=batch_payloads,
                    )

                    commit_batch(consumer, batch_messages)

                    elapsed_ms = (time.perf_counter() - started_at) * 1000

                    print(
                        f"[ai-worker] processed batch, "
                        f"count={processed_count}, "
                        f"elapsed_ms={elapsed_ms:.2f}"
                    )

                    batch_messages.clear()
                    batch_payloads.clear()
                    last_flush_time = time.monotonic()

                except Exception as e:
                    conn.rollback()
                    print(f"[ai-worker] failed to process batch: {e}")

    finally:
        consumer.close()
        conn.close()


if __name__ == "__main__":
    main()