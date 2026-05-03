from dataclasses import dataclass
from typing import Any

from confluent_kafka import Message


@dataclass
class BatchItem:
    message: Message
    payload: dict[str, Any]
    access_token: str | None
    request_id: str | None


@dataclass
class DetectionResult:
    record_id: str
    item: BatchItem
    label: str
    p_macro: float