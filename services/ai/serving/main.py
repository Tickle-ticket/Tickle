import os
import time

from confluent_kafka import KafkaException

from serving.be_callback_client import create_be_callback_client
from serving.kafka_consumer import create_consumer, make_batch_item, commit_batch
from serving.macro_predictor import create_predictor
from serving.pipeline import (
    should_flush,
    process_batch,
    count_access_token_headers,
    count_request_id_headers,
)
from serving.repository import get_db_connection
from serving.schemas import BatchItem


KAFKA_TOPIC = os.getenv("KAFKA_TOPIC_BEHAVIOR_EVENTS", "behavior-events-v1")
KAFKA_CONSUMER_GROUP_ID = os.getenv("KAFKA_CONSUMER_GROUP_ID", "ai-worker-group-v1")

BATCH_SIZE = int(os.getenv("AI_WORKER_BATCH_SIZE", "16"))
FLUSH_INTERVAL_SEC = float(os.getenv("AI_WORKER_FLUSH_INTERVAL_SEC", "0.2"))


def main():
    predictor = create_predictor()
    be_callback_client = create_be_callback_client()
    consumer = create_consumer()
    conn = get_db_connection()

    consumer.subscribe([KAFKA_TOPIC])

    batch_items: list[BatchItem] = []
    last_flush_time = time.monotonic()

    print(
        f"[ai-worker] started, topic={KAFKA_TOPIC}, "
        f"group_id={KAFKA_CONSUMER_GROUP_ID}, "
        f"batch_size={BATCH_SIZE}, "
        f"flush_interval_sec={FLUSH_INTERVAL_SEC}, "
        f"be_callback_enabled={be_callback_client.enabled()}"
    )

    try:
        while True:
            msg = consumer.poll(0.05)

            if msg is not None:
                if msg.error():
                    raise KafkaException(msg.error())

                try:
                    batch_items.append(make_batch_item(msg))

                except Exception as e:
                    print(f"[ai-worker] failed to parse message: {e}")
                    consumer.commit(message=msg, asynchronous=False)

            if should_flush(
                batch_items=batch_items,
                last_flush_time=last_flush_time,
                batch_size=BATCH_SIZE,
                flush_interval_sec=FLUSH_INTERVAL_SEC,
            ):
                started_at = time.perf_counter()

                try:
                    processed_count, be_sent_count, be_skipped_count, be_failed_count = (
                        process_batch(
                            conn=conn,
                            predictor=predictor,
                            be_callback_client=be_callback_client,
                            batch_items=batch_items,
                        )
                    )

                    access_token_count = count_access_token_headers(batch_items)
                    request_id_count = count_request_id_headers(batch_items)

                    commit_batch(consumer, batch_items)

                    elapsed_ms = (time.perf_counter() - started_at) * 1000

                    print(
                        f"[ai-worker] processed batch, "
                        f"count={processed_count}, "
                        f"access_token_headers={access_token_count}, "
                        f"request_id_headers={request_id_count}, "
                        f"be_sent={be_sent_count}, "
                        f"be_skipped={be_skipped_count}, "
                        f"be_failed={be_failed_count}, "
                        f"elapsed_ms={elapsed_ms:.2f}"
                    )

                    batch_items.clear()
                    last_flush_time = time.monotonic()

                except Exception as e:
                    conn.rollback()
                    print(f"[ai-worker] failed to process batch: {e}")

    finally:
        consumer.close()
        conn.close()


if __name__ == "__main__":
    main()