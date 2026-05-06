import json
import os
from typing import Any

from confluent_kafka import Consumer, Message

from serving.schemas import BatchItem


KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
KAFKA_CONSUMER_GROUP_ID = os.getenv("KAFKA_CONSUMER_GROUP_ID", "ai-worker-group-v1")


def create_consumer() -> Consumer:
    return Consumer(
        {
            "bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS,
            "group.id": KAFKA_CONSUMER_GROUP_ID,
            "auto.offset.reset": "earliest",
            "enable.auto.commit": False,
        }
    )


def get_header_value(msg: Message, header_name: str) -> str | None:
    headers = msg.headers() or []

    for key, value in headers:
        if key == header_name and value is not None:
            return value.decode("utf-8")

    return None


def parse_message(msg: Message) -> dict[str, Any]:
    return json.loads(msg.value().decode("utf-8"))


def make_batch_item(msg: Message) -> BatchItem:
    payload = parse_message(msg)

    return BatchItem(
        message=msg,
        payload=payload,
        access_token=get_header_value(msg, "access-token"),
        request_id=get_header_value(msg, "X-Request-Id"),
    )


def commit_batch(consumer: Consumer, batch_items: list[BatchItem]) -> None:
    if not batch_items:
        return

    last_message = batch_items[-1].message
    consumer.commit(message=last_message, asynchronous=False)
